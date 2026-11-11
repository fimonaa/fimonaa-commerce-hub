import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { createTestJwt } from './helpers/create-test-jwt';
import { cleanupAuthTestUser } from './helpers/cleanup-auth-test-user';

describe('HTTP invitation issuance integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error(
        'Invitation issuance HTTP tests require the isolated test database.',
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    const rows: Array<{ database_name: string }> =
      await dataSource.query(
        'SELECT current_database() AS database_name',
      );

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error(
        'Invitation issuance HTTP tests connected to an unsafe database.',
      );
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it.each(['inventory_manager', 'operator', 'viewer'] as const)(
    'rejects invitation issuance for %s role',
    async (role) => {
      const userId = randomUUID();
      const businessId = randomUUID();

      try {
        await dataSource.query(
          `INSERT INTO users (id, email, status)
           VALUES ($1, $2, 'active')`,
          [userId, `auth-test-${userId}@example.invalid`],
        );

        await dataSource.query(
          `INSERT INTO businesses (id, name, slug, status)
           VALUES ($1, $2, $3, 'active')`,
          [
            businessId,
            'Invitation Authorization Test',
            `auth-test-${businessId}`,
          ],
        );

        await dataSource.query(
          `INSERT INTO business_memberships (business_id, user_id, role)
           VALUES ($1, $2, $3)`,
          [businessId, userId, role],
        );

        const token = await createTestJwt(userId);

        const response = await request(app.getHttpServer())
          .post('/api/auth/invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({ userId: randomUUID() })
          .expect(403);

        expect(response.body.message).toBe(
          'Insufficient permissions for this operation',
        );
      } finally {
        await dataSource.query(
          `DELETE FROM business_memberships
           WHERE user_id = $1 AND business_id = $2`,
          [userId, businessId],
        );

        await dataSource.query(
          `DELETE FROM users
           WHERE id = $1 AND email = $2`,
          [userId, `auth-test-${userId}@example.invalid`],
        );

        await dataSource.query(
          `DELETE FROM businesses
           WHERE id = $1 AND slug = $2`,
          [businessId, `auth-test-${businessId}`],
        );
      }
    },
  );

  it.each(['owner', 'admin'] as const)(
    'allows %s to issue an invitation',
    async (role) => {
      const ownerId = randomUUID();
      const invitedUserId = randomUUID();
      const businessId = randomUUID();

      try {
        await dataSource.query(
          `INSERT INTO users (id, email, status)
           VALUES
             ($1, $3, 'active'),
             ($2, $4, 'invited')`,
          [
            ownerId,
            invitedUserId,
            `auth-test-${ownerId}@example.invalid`,
            `auth-test-${invitedUserId}@example.invalid`,
          ],
        );

        await dataSource.query(
          `INSERT INTO businesses (id, name, slug, status)
           VALUES ($1, $2, $3, 'active')`,
          [
            businessId,
            'Invitation Issuance HTTP Test',
            `auth-test-${businessId}`,
          ],
        );

        await dataSource.query(
          `INSERT INTO business_memberships (business_id, user_id, role)
           VALUES
             ($1, $2, $4),
             ($1, $3, 'operator')`,
          [businessId, ownerId, invitedUserId, role],
        );

        const token = await createTestJwt(ownerId);

        const response = await request(app.getHttpServer())
          .post('/api/auth/invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({ userId: invitedUserId })
          .expect(201);

        expect(response.headers['cache-control']).toBe('no-store');

        expect(response.body).toEqual({
          invitationId: expect.any(String),
          token: expect.any(String),
          expiresAt: expect.any(String),
        });

        expect(response.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

        const invitations: Array<{
          id: string;
          token_hash: string;
          expires_at: Date;
          consumed_at: Date | null;
        }> = await dataSource.query(
          `SELECT id, token_hash, expires_at, consumed_at
           FROM user_invitations
           WHERE user_id = $1`,
          [invitedUserId],
        );

        expect(invitations).toHaveLength(1);
        expect(invitations[0].id).toBe(response.body.invitationId);
        expect(invitations[0].token_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(invitations[0].token_hash).not.toBe(response.body.token);
        expect(invitations[0].consumed_at).toBeNull();
        expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(
          Date.now(),
        );
      } finally {
        await dataSource.query(
          `DELETE FROM business_memberships
           WHERE business_id = $1
             AND user_id IN ($2, $3)`,
          [businessId, ownerId, invitedUserId],
        );

        await cleanupAuthTestUser(dataSource, invitedUserId);
        await cleanupAuthTestUser(dataSource, ownerId);

        await dataSource.query(
          `DELETE FROM businesses
           WHERE id = $1 AND slug = $2`,
          [businessId, `auth-test-${businessId}`],
        );
      }
    },
  );

  it.each([
    ['missing user ID', {}],
    ['invalid UUID', { userId: 'not-a-uuid' }],
    ['empty user ID', { userId: '' }],
    ['numeric user ID', { userId: 12345 }],
    ['unexpected business ID', {
      userId: randomUUID(),
      businessId: randomUUID(),
    }],
    ['unexpected role', {
      userId: randomUUID(),
      role: 'owner',
    }],
  ])('rejects %s in invitation request body', async (_scenario, body) => {
    const ownerId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [ownerId, `auth-test-${ownerId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [
          businessId,
          'Invitation Validation Test',
          `auth-test-${businessId}`,
        ],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [businessId, ownerId],
      );

      const token = await createTestJwt(ownerId);

      const response = await request(app.getHttpServer())
        .post('/api/auth/invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send(body)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toEqual(expect.any(Array));
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationId');
    } finally {
      await dataSource.query(
        `DELETE FROM business_memberships
         WHERE business_id = $1 AND user_id = $2`,
        [businessId, ownerId],
      );

      await cleanupAuthTestUser(dataSource, ownerId);

      await dataSource.query(
        `DELETE FROM businesses
         WHERE id = $1 AND slug = $2`,
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it('prevents cross-business invitation issuance', async () => {
    const ownerId = randomUUID();
    const invitedUserId = randomUUID();
    const businessAId = randomUUID();
    const businessBId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES
           ($1, $3, 'active'),
           ($2, $4, 'invited')`,
        [
          ownerId,
          invitedUserId,
          `auth-test-${ownerId}@example.invalid`,
          `auth-test-${invitedUserId}@example.invalid`,
        ],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES
           ($1, 'Invitation Business A', $3, 'active'),
           ($2, 'Invitation Business B', $4, 'active')`,
        [
          businessAId,
          businessBId,
          `auth-test-${businessAId}`,
          `auth-test-${businessBId}`,
        ],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES
           ($1, $3, 'owner'),
           ($2, $4, 'operator')`,
        [businessAId, businessBId, ownerId, invitedUserId],
      );

      const token = await createTestJwt(ownerId);

      const response = await request(app.getHttpServer())
        .post('/api/auth/invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessAId)
        .send({ userId: invitedUserId })
        .expect(404);

      expect(response.body.message).toBe('Invited user not found');

      const invitations: Array<{ count: number }> =
        await dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM user_invitations
           WHERE user_id = $1`,
          [invitedUserId],
        );

      expect(invitations[0].count).toBe(0);
    } finally {
      await dataSource.query(
        `DELETE FROM business_memberships
         WHERE (business_id = $1 AND user_id = $3)
            OR (business_id = $2 AND user_id = $4)`,
        [businessAId, businessBId, ownerId, invitedUserId],
      );

      await cleanupAuthTestUser(dataSource, invitedUserId);
      await cleanupAuthTestUser(dataSource, ownerId);

      await dataSource.query(
        `DELETE FROM businesses
         WHERE (id = $1 AND slug = $3)
            OR (id = $2 AND slug = $4)`,
        [
          businessAId,
          businessBId,
          `auth-test-${businessAId}`,
          `auth-test-${businessBId}`,
        ],
      );
    }
  });

  it('rejects an owner using another business context', async () => {
    const ownerId = randomUUID();
    const invitedUserId = randomUUID();
    const businessAId = randomUUID();
    const businessBId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES
           ($1, $3, 'active'),
           ($2, $4, 'invited')`,
        [
          ownerId,
          invitedUserId,
          `auth-test-${ownerId}@example.invalid`,
          `auth-test-${invitedUserId}@example.invalid`,
        ],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES
           ($1, 'Context Business A', $3, 'active'),
           ($2, 'Context Business B', $4, 'active')`,
        [
          businessAId,
          businessBId,
          `auth-test-${businessAId}`,
          `auth-test-${businessBId}`,
        ],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES
           ($1, $3, 'owner'),
           ($2, $4, 'operator')`,
        [businessAId, businessBId, ownerId, invitedUserId],
      );

      const token = await createTestJwt(ownerId);

      const response = await request(app.getHttpServer())
        .post('/api/auth/invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessBId)
        .send({ userId: invitedUserId })
        .expect(401);

      expect(response.body.statusCode).toBe(401);

      const invitations: Array<{ count: number }> =
        await dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM user_invitations
           WHERE user_id = $1`,
          [invitedUserId],
        );

      expect(invitations[0].count).toBe(0);
    } finally {
      await dataSource.query(
        `DELETE FROM business_memberships
         WHERE (business_id = $1 AND user_id = $3)
            OR (business_id = $2 AND user_id = $4)`,
        [businessAId, businessBId, ownerId, invitedUserId],
      );

      await cleanupAuthTestUser(dataSource, invitedUserId);
      await cleanupAuthTestUser(dataSource, ownerId);

      await dataSource.query(
        `DELETE FROM businesses
         WHERE (id = $1 AND slug = $3)
            OR (id = $2 AND slug = $4)`,
        [
          businessAId,
          businessBId,
          `auth-test-${businessAId}`,
          `auth-test-${businessBId}`,
        ],
      );
    }
  });

  it('rejects duplicate active invitations with HTTP 409', async () => {
    const ownerId = randomUUID();
    const invitedUserId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES
           ($1, $3, 'active'),
           ($2, $4, 'invited')`,
        [
          ownerId,
          invitedUserId,
          `auth-test-${ownerId}@example.invalid`,
          `auth-test-${invitedUserId}@example.invalid`,
        ],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, 'Duplicate Invitation Test', $2, 'active')`,
        [businessId, `auth-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES
           ($1, $2, 'owner'),
           ($1, $3, 'operator')`,
        [businessId, ownerId, invitedUserId],
      );

      const token = await createTestJwt(ownerId);

      const issueInvitation = () =>
        request(app.getHttpServer())
          .post('/api/auth/invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({ userId: invitedUserId });

      const firstResponse = await issueInvitation().expect(201);

      expect(firstResponse.body.invitationId).toEqual(
        expect.any(String),
      );

      const secondResponse = await issueInvitation().expect(409);

      expect(secondResponse.body.statusCode).toBe(409);
      expect(secondResponse.body).not.toHaveProperty('token');

      const invitations: Array<{ count: number }> =
        await dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM user_invitations
           WHERE user_id = $1`,
          [invitedUserId],
        );

      expect(invitations[0].count).toBe(1);
    } finally {
      await dataSource.query(
        `DELETE FROM business_memberships
         WHERE business_id = $1
           AND user_id IN ($2, $3)`,
        [businessId, ownerId, invitedUserId],
      );

      await cleanupAuthTestUser(dataSource, invitedUserId);
      await cleanupAuthTestUser(dataSource, ownerId);

      await dataSource.query(
        `DELETE FROM businesses
         WHERE id = $1 AND slug = $2`,
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it('rejects invitation issuance without authentication', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/invitations')
      .send({ userId: randomUUID() })
      .expect(401);
  });
});
