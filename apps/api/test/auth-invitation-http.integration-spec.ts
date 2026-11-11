import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { InvitationTokenService } from '../src/modules/auth/invitation-token.service';
import { PasswordHashingService } from '../src/modules/auth/password-hashing.service';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { cleanupAuthTestUser } from './helpers/cleanup-auth-test-user';

describe('HTTP invitation acceptance integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let tokenService: InvitationTokenService;
  let passwordHashing: PasswordHashingService;

  beforeAll(async () => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error(
        'Invitation HTTP tests require the isolated test database.',
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
    tokenService = app.get(InvitationTokenService);
    passwordHashing = app.get(PasswordHashingService);

    const rows: Array<{ database_name: string }> =
      await dataSource.query(
        'SELECT current_database() AS database_name',
      );

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error(
        'Invitation HTTP tests connected to an unsafe database.',
      );
    }
  });

  it('activates an invited user through HTTP and returns 204', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Secure-HTTP-Invitation-Password-2026!';
    const { token, tokenHash } = tokenService.generate();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, email],
      );

      await dataSource.query(
        `INSERT INTO user_invitations
           (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, tokenHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/accept-invitation')
        .send({ token, password })
        .expect(204);

      expect(response.text).toBe('');

      const users: Array<{
        status: string;
        password_hash: string | null;
      }> = await dataSource.query(
        `SELECT status, password_hash
         FROM users
         WHERE id = $1`,
        [userId],
      );

      expect(users).toHaveLength(1);
      expect(users[0].status).toBe('active');
      expect(users[0].password_hash).toEqual(expect.any(String));

      expect(
        await passwordHashing.verify(
          users[0].password_hash!,
          password,
        ),
      ).toBe(true);

      const invitations: Array<{ consumed_at: Date | null }> =
        await dataSource.query(
          `SELECT consumed_at
           FROM user_invitations
           WHERE token_hash = $1`,
          [tokenHash],
        );

      expect(invitations).toHaveLength(1);
      expect(invitations[0].consumed_at).not.toBeNull();
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });

  it.each([
    ['missing token and password', {}],
    ['malformed token', {
      token: 'invalid-token',
      password: 'Secure-Password-2026!',
    }],
    ['password shorter than 12 characters', {
      token: 'A'.repeat(43),
      password: 'Short123!',
    }],
    ['password longer than 1024 characters', {
      token: 'A'.repeat(43),
      password: 'A'.repeat(1025),
    }],
    ['unexpected request field', {
      token: 'A'.repeat(43),
      password: 'Secure-Password-2026!',
      role: 'admin',
    }],
  ])('rejects %s with HTTP 400', async (_scenario, body) => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/accept-invitation')
      .send(body)
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(expect.any(Array));
    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
  });

  it('rejects an expired invitation without activating the user', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Secure-Expired-Invitation-2026!';
    const { token, tokenHash } = tokenService.generate();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, email],
      );

      await dataSource.query(
        `INSERT INTO user_invitations
           (user_id, token_hash, created_at, expires_at)
         VALUES (
           $1,
           $2,
           NOW() - INTERVAL '48 hours',
           NOW() - INTERVAL '24 hours'
         )`,
        [userId, tokenHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/accept-invitation')
        .send({ token, password })
        .expect(400);

      expect(response.body).not.toHaveProperty('accessToken');

      const users: Array<{
        status: string;
        password_hash: string | null;
      }> = await dataSource.query(
        `SELECT status, password_hash
         FROM users
         WHERE id = $1`,
        [userId],
      );

      expect(users).toHaveLength(1);
      expect(users[0].status).toBe('invited');
      expect(users[0].password_hash).toBeNull();

      const invitations: Array<{ consumed_at: Date | null }> =
        await dataSource.query(
          `SELECT consumed_at
           FROM user_invitations
           WHERE token_hash = $1`,
          [tokenHash],
        );

      expect(invitations).toHaveLength(1);
      expect(invitations[0].consumed_at).toBeNull();
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });

  it('rejects reuse of an already consumed invitation', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const originalPassword = 'Original-Invitation-Password-2026!';
    const replacementPassword = 'Replacement-Password-2026!';
    const { token, tokenHash } = tokenService.generate();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, email],
      );

      await dataSource.query(
        `INSERT INTO user_invitations
           (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, tokenHash],
      );

      await request(app.getHttpServer())
        .post('/api/auth/accept-invitation')
        .send({ token, password: originalPassword })
        .expect(204);

      const response = await request(app.getHttpServer())
        .post('/api/auth/accept-invitation')
        .send({ token, password: replacementPassword })
        .expect(400);

      expect(response.body).not.toHaveProperty('accessToken');

      const users: Array<{
        status: string;
        password_hash: string | null;
      }> = await dataSource.query(
        `SELECT status, password_hash
         FROM users
         WHERE id = $1`,
        [userId],
      );

      expect(users).toHaveLength(1);
      expect(users[0].status).toBe('active');
      expect(users[0].password_hash).toEqual(expect.any(String));

      expect(
        await passwordHashing.verify(
          users[0].password_hash!,
          originalPassword,
        ),
      ).toBe(true);

      expect(
        await passwordHashing.verify(
          users[0].password_hash!,
          replacementPassword,
        ),
      ).toBe(false);

      const invitations: Array<{ consumed_at: Date | null }> =
        await dataSource.query(
          `SELECT consumed_at
           FROM user_invitations
           WHERE token_hash = $1`,
          [tokenHash],
        );

      expect(invitations).toHaveLength(1);
      expect(invitations[0].consumed_at).not.toBeNull();
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
