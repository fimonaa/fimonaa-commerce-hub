import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { createTestJwt } from './helpers/create-test-jwt';

describe('Business membership invitation HTTP integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const ownerId = randomUUID();
  const recipientId = randomUUID();
  const businessId = randomUUID();

  const recipientEmail =
    `membership-http-${recipientId}@example.invalid`;

  const assertTestDatabase = async (): Promise<void> => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error(
        'HTTP integration tests require the isolated test database.',
      );
    }

    const rows: Array<{ database_name: string }> =
      await dataSource.query(
        'SELECT current_database() AS database_name',
      );

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error(
        'HTTP integration tests connected to an unsafe database.',
      );
    }
  };

  beforeAll(async () => {
    assertSafeTestDatabase(process.env.TEST_DATABASE_URL);

    if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
      throw new Error('Unsafe integration-test database configuration.');
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

    await assertTestDatabase();

    await dataSource.transaction(async (manager) => {
      await manager.query(
        `
          INSERT INTO users (id, email, status)
          VALUES
            ($1, $3, 'active'),
            ($2, $4, 'active')
        `,
        [
          ownerId,
          recipientId,
          `membership-owner-${ownerId}@example.invalid`,
          recipientEmail,
        ],
      );

      await manager.query(
        `
          INSERT INTO businesses (id, name, slug, status)
          VALUES ($1, $2, $3, 'active')
        `,
        [
          businessId,
          'Membership Invitation HTTP Test',
          `membership-http-${businessId}`,
        ],
      );

      await manager.query(
        `
          INSERT INTO business_memberships (
            business_id,
            user_id,
            role,
            status
          )
          VALUES ($1, $2, 'owner', 'active')
        `,
        [businessId, ownerId],
      );
    });
  });

  afterEach(async () => {
    if (!dataSource?.isInitialized) {
      return;
    }

    await assertTestDatabase();

    await dataSource.query(
      `
        DELETE FROM business_membership_invitations
        WHERE business_id = $1
      `,
      [businessId],
    );
  });

  afterAll(async () => {
    try {
      if (dataSource?.isInitialized) {
        await assertTestDatabase();

        await dataSource.transaction(async (manager) => {
          await manager.query(
            `
              DELETE FROM business_membership_invitations
              WHERE business_id = $1
            `,
            [businessId],
          );

          await manager.query(
            `
              DELETE FROM business_memberships
              WHERE business_id = $1
            `,
            [businessId],
          );

          await manager.query(
            `
              DELETE FROM businesses
              WHERE id = $1
            `,
            [businessId],
          );

          await manager.query(
            `
              DELETE FROM users
              WHERE id IN ($1, $2)
            `,
            [ownerId, recipientId],
          );
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  const expectNoInvitations = async (): Promise<void> => {
    const rows: Array<{ count: number }> = await dataSource.query(
      `
      SELECT COUNT(*)::int AS count
      FROM business_membership_invitations
      WHERE business_id = $1
    `,
      [businessId],
    );

    expect(rows[0].count).toBe(0);
  };

  it('allows an active owner to issue a membership invitation', async () => {
    const token = await createTestJwt(ownerId);

    const response = await request(app.getHttpServer())
      .post('/api/auth/business-membership-invitations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Business-Id', businessId)
      .send({
        email: recipientEmail,
        role: 'operator',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      businessId,
      invitedEmail: recipientEmail,
      role: 'operator',
    });

    expect(response.body.invitationId).toEqual(
      expect.any(String),
    );

    expect(response.body.token).toMatch(
      /^[A-Za-z0-9_-]{43}$/,
    );

    expect(new Date(response.body.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );

    expect(response.headers['cache-control']).toBe('no-store');

    const invitations: Array<{
      id: string;
      business_id: string;
      invited_email: string;
      role: string;
      token_hash: string;
      invited_by_user_id: string;
      accepted_at: Date | null;
      revoked_at: Date | null;
    }> = await dataSource.query(
      `
        SELECT
          id,
          business_id,
          invited_email,
          role,
          token_hash,
          invited_by_user_id,
          accepted_at,
          revoked_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
      [response.body.invitationId],
    );

    expect(invitations).toHaveLength(1);

    expect(invitations[0]).toMatchObject({
      id: response.body.invitationId,
      business_id: businessId,
      invited_email: recipientEmail,
      role: 'operator',
      invited_by_user_id: ownerId,
      accepted_at: null,
      revoked_at: null,
    });

    expect(invitations[0].token_hash).toMatch(/^[a-f0-9]{64}$/);

    expect(invitations[0].token_hash).not.toBe(
      response.body.token,
    );
  });

  it('rejects membership invitation issuance without authentication', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/business-membership-invitations')
      .set('X-Business-Id', businessId)
      .send({
        email: recipientEmail,
        role: 'operator',
      })
      .expect(401);

    expect(response.body.statusCode).toBe(401);
    expect(response.body).not.toHaveProperty('token');
    expect(response.body).not.toHaveProperty('invitationId');

    await expectNoInvitations();
  });

  it('rejects membership invitation issuance with an invalid JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/business-membership-invitations')
      .set('Authorization', 'Bearer invalid-token')
      .set('X-Business-Id', businessId)
      .send({
        email: recipientEmail,
        role: 'operator',
      })
      .expect(401);

    expect(response.body.statusCode).toBe(401);
    expect(response.body).not.toHaveProperty('token');
    expect(response.body).not.toHaveProperty('invitationId');

    await expectNoInvitations();
  });

  it('rejects membership invitation issuance without business context', async () => {
    const token = await createTestJwt(ownerId);

    const response = await request(app.getHttpServer())
      .post('/api/auth/business-membership-invitations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: recipientEmail,
        role: 'operator',
      })
      .expect(401);

    expect(response.body.statusCode).toBe(401);
    expect(response.body).not.toHaveProperty('token');
    expect(response.body).not.toHaveProperty('invitationId');

    await expectNoInvitations();
  });

  it('allows an active administrator to issue a membership invitation', async () => {
    const token = await createTestJwt(ownerId);

    try {
      await assertTestDatabase();

      await dataSource.query(
        `
        UPDATE business_memberships
        SET role = 'admin',
            updated_at = NOW()
        WHERE business_id = $1
          AND user_id = $2
      `,
        [businessId, ownerId],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send({
          email: recipientEmail,
          role: 'viewer',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        businessId,
        invitedEmail: recipientEmail,
        role: 'viewer',
      });

      expect(response.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(response.headers['cache-control']).toBe('no-store');

      const rows: Array<{ count: number }> = await dataSource.query(
        `
        SELECT COUNT(*)::int AS count
        FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_by_user_id = $2
      `,
        [businessId, ownerId],
      );

      expect(rows[0].count).toBe(1);
    } finally {
      await assertTestDatabase();

      await dataSource.query(
        `
        UPDATE business_memberships
        SET role = 'owner',
            updated_at = NOW()
        WHERE business_id = $1
          AND user_id = $2
      `,
        [businessId, ownerId],
      );
    }
  });

  it.each([
    'inventory_manager',
    'operator',
    'viewer',
  ] as const)(
    'rejects membership invitation issuance for the %s role',
    async (role) => {
      const token = await createTestJwt(ownerId);

      try {
        await assertTestDatabase();

        await dataSource.query(
          `
          UPDATE business_memberships
          SET role = $1,
              updated_at = NOW()
          WHERE business_id = $2
            AND user_id = $3
        `,
          [role, businessId, ownerId],
        );

        const response = await request(app.getHttpServer())
          .post('/api/auth/business-membership-invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({
            email: recipientEmail,
            role: 'viewer',
          })
          .expect(403);

        expect(response.body.statusCode).toBe(403);
        expect(response.body).not.toHaveProperty('token');
        expect(response.body).not.toHaveProperty('invitationId');

        await expectNoInvitations();
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `
          UPDATE business_memberships
          SET role = 'owner',
              updated_at = NOW()
          WHERE business_id = $1
            AND user_id = $2
        `,
          [businessId, ownerId],
        );
      }
    },
  );

  it.each([
    'pending',
    'suspended',
    'removed',
  ] as const)(
    'rejects membership invitation issuance when membership is %s',
    async (membershipStatus) => {
      const token = await createTestJwt(ownerId);

      try {
        await assertTestDatabase();

        await dataSource.query(
          `
          UPDATE business_memberships
          SET status = $1,
              updated_at = NOW()
          WHERE business_id = $2
            AND user_id = $3
        `,
          [membershipStatus, businessId, ownerId],
        );

        const response = await request(app.getHttpServer())
          .post('/api/auth/business-membership-invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({
            email: recipientEmail,
            role: 'viewer',
          })
          .expect(401);

        expect(response.body.statusCode).toBe(401);
        expect(response.body).not.toHaveProperty('token');
        expect(response.body).not.toHaveProperty('invitationId');

        await expectNoInvitations();
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `
          UPDATE business_memberships
          SET status = 'active',
              removed_at = NULL,
              updated_at = NOW()
          WHERE business_id = $1
            AND user_id = $2
        `,
          [businessId, ownerId],
        );
      }
    },
  );

  it.each([
    ['missing email', { role: 'viewer' }],
    ['invalid email', { email: 'invalid-email', role: 'viewer' }],
    ['empty email', { email: '', role: 'viewer' }],
    ['numeric email', { email: 12345, role: 'viewer' }],
    ['missing role', { email: recipientEmail }],
    ['invalid role', { email: recipientEmail, role: 'superadmin' }],
    ['owner role', { email: recipientEmail, role: 'owner' }],
    ['empty role', { email: recipientEmail, role: '' }],
    [
      'unexpected business ID',
      {
        email: recipientEmail,
        role: 'viewer',
        businessId: randomUUID(),
      },
    ],
    [
      'unexpected inviter ID',
      {
        email: recipientEmail,
        role: 'viewer',
        invitedByUserId: randomUUID(),
      },
    ],
  ])(
    'rejects %s in membership invitation request',
    async (_scenario, body) => {
      const token = await createTestJwt(ownerId);

      const response = await request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send(body)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toEqual(expect.any(Array));

      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationId');

      await expectNoInvitations();
    },
  );

  it('normalizes recipient email before issuing an invitation', async () => {
    const token = await createTestJwt(ownerId);

    const response = await request(app.getHttpServer())
      .post('/api/auth/business-membership-invitations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Business-Id', businessId)
      .send({
        email: `  ${recipientEmail.toUpperCase()}  `,
        role: 'operator',
      })
      .expect(201);

    expect(response.body.invitedEmail).toBe(recipientEmail);

    const rows: Array<{ invited_email: string }> =
      await dataSource.query(
        `
        SELECT invited_email
        FROM business_membership_invitations
        WHERE id = $1
      `,
        [response.body.invitationId],
      );

    expect(rows).toHaveLength(1);
    expect(rows[0].invited_email).toBe(recipientEmail);
  });

  it('rejects invitation issuance when the user has no membership in the business', async () => {
    const unrelatedUserId = randomUUID();

    await assertTestDatabase();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
       VALUES ($1, $2, 'active')`,
        [
          unrelatedUserId,
          `membership-unrelated-${unrelatedUserId}@example.invalid`,
        ],
      );

      const token = await createTestJwt(unrelatedUserId);

      const response = await request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send({
          email: recipientEmail,
          role: 'viewer',
        })
        .expect(401);

      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationId');

      await expectNoInvitations();
    } finally {
      await assertTestDatabase();

      await dataSource.query(
        'DELETE FROM users WHERE id = $1',
        [unrelatedUserId],
      );
    }
  });

  it('rejects invitation issuance when the inviter account is disabled', async () => {
    const token = await createTestJwt(ownerId);

    try {
      await assertTestDatabase();

      await dataSource.query(
        `UPDATE users
       SET status = 'disabled',
           updated_at = NOW()
       WHERE id = $1`,
        [ownerId],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send({
          email: recipientEmail,
          role: 'viewer',
        })
        .expect(401);

      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationId');

      await expectNoInvitations();
    } finally {
      await assertTestDatabase();

      await dataSource.query(
        `UPDATE users
       SET status = 'active',
           updated_at = NOW()
       WHERE id = $1`,
        [ownerId],
      );
    }
  });

  it.each(['suspended', 'archived'] as const)(
    'rejects invitation issuance when the business is %s',
    async (businessStatus) => {
      const token = await createTestJwt(ownerId);

      try {
        await assertTestDatabase();

        await dataSource.query(
          `UPDATE businesses
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2`,
          [businessStatus, businessId],
        );

        const response = await request(app.getHttpServer())
          .post('/api/auth/business-membership-invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({
            email: recipientEmail,
            role: 'viewer',
          })
          .expect(401);

        expect(response.body).not.toHaveProperty('token');
        expect(response.body).not.toHaveProperty('invitationId');

        await expectNoInvitations();
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `UPDATE businesses
         SET status = 'active',
             updated_at = NOW()
         WHERE id = $1`,
          [businessId],
        );
      }
    },
  );

  it('rejects invitation issuance using an unauthorized business context', async () => {
    const otherBusinessId = randomUUID();
    const token = await createTestJwt(ownerId);

    await assertTestDatabase();

    try {
      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
       VALUES ($1, $2, $3, 'active')`,
        [
          otherBusinessId,
          'Unauthorized Business Context Test',
          `membership-http-${otherBusinessId}`,
        ],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', otherBusinessId)
        .send({
          email: recipientEmail,
          role: 'viewer',
        })
        .expect(401);

      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationId');

      const rows: Array<{ count: number }> = await dataSource.query(
        `SELECT COUNT(*)::int AS count
       FROM business_membership_invitations
       WHERE business_id IN ($1, $2)`,
        [businessId, otherBusinessId],
      );

      expect(rows[0].count).toBe(0);
    } finally {
      await assertTestDatabase();

      await dataSource.query(
        `DELETE FROM businesses
       WHERE id = $1 AND slug = $2`,
        [otherBusinessId, `membership-http-${otherBusinessId}`],
      );
    }
  });

  it('rejects duplicate active membership invitations with HTTP 409', async () => {
    const token = await createTestJwt(ownerId);

    const issueInvitation = () =>
      request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send({
          email: recipientEmail,
          role: 'operator',
        });

    const firstResponse = await issueInvitation().expect(201);

    expect(firstResponse.body.invitationId).toEqual(
      expect.any(String),
    );

    const secondResponse = await issueInvitation().expect(409);

    expect(secondResponse.body.statusCode).toBe(409);
    expect(secondResponse.body).not.toHaveProperty('token');
    expect(secondResponse.body).not.toHaveProperty('invitationId');

    const rows: Array<{ count: number }> = await dataSource.query(
      `
      SELECT COUNT(*)::int AS count
      FROM business_membership_invitations
      WHERE business_id = $1
        AND invited_email = $2
    `,
      [businessId, recipientEmail],
    );

    expect(rows[0].count).toBe(1);
  });

  it.each([
    'pending',
    'active',
    'suspended',
    'removed',
  ] as const)(
    'rejects invitation issuance when the recipient has a %s membership',
    async (membershipStatus) => {
      const token = await createTestJwt(ownerId);

      await assertTestDatabase();

      try {
        await dataSource.query(
          `
          INSERT INTO business_memberships (
            business_id,
            user_id,
            role,
            status
          )
          VALUES ($1, $2, 'viewer', $3)
        `,
          [businessId, recipientId, membershipStatus],
        );

        const response = await request(app.getHttpServer())
          .post('/api/auth/business-membership-invitations')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Business-Id', businessId)
          .send({
            email: recipientEmail,
            role: 'operator',
          })
          .expect(409);

        expect(response.body.statusCode).toBe(409);
        expect(response.body).not.toHaveProperty('token');
        expect(response.body).not.toHaveProperty('invitationId');

        await expectNoInvitations();
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `
          DELETE FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
          [businessId, recipientId],
        );
      }
    },
  );

  it('rejects invitation issuance for a nonexistent recipient', async () => {
    const token = await createTestJwt(ownerId);

    const response = await request(app.getHttpServer())
      .post('/api/auth/business-membership-invitations')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Business-Id', businessId)
      .send({
        email: `nonexistent-${randomUUID()}@example.invalid`,
        role: 'viewer',
      })
      .expect(404);

    expect(response.body.statusCode).toBe(404);
    expect(response.body).not.toHaveProperty('token');
    expect(response.body).not.toHaveProperty('invitationId');

    await expectNoInvitations();
  });

  it('rejects invitation issuance for a disabled recipient', async () => {
    const token = await createTestJwt(ownerId);

    try {
      await assertTestDatabase();

      await dataSource.query(
        `
        UPDATE users
        SET status = 'disabled',
            updated_at = NOW()
        WHERE id = $1
      `,
        [recipientId],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/business-membership-invitations')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Business-Id', businessId)
        .send({
          email: recipientEmail,
          role: 'viewer',
        })
        .expect(404);

      expect(response.body.statusCode).toBe(404);
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('invitationId');

      await expectNoInvitations();
    } finally {
      await assertTestDatabase();

      await dataSource.query(
        `
        UPDATE users
        SET status = 'active',
            updated_at = NOW()
        WHERE id = $1
      `,
        [recipientId],
      );
    }
  });
});