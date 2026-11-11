import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { PasswordHashingService } from '../src/modules/auth/password-hashing.service';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { cleanupAuthTestUser } from './helpers/cleanup-auth-test-user';

describe('HTTP login integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let passwordHashing: PasswordHashingService;

  beforeAll(async () => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error('Login tests require the isolated test database.');
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
    passwordHashing = app.get(PasswordHashingService);

    const rows: Array<{ database_name: string }> =
      await dataSource.query('SELECT current_database() AS database_name');

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error('Login tests connected to an unsafe database.');
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns an access token for valid credentials', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Test-Password-2026!';
    const passwordHash = await passwordHashing.hash(password);

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, status)
         VALUES ($1, $2, $3, 'active')`,
        [userId, email, passwordHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
      });

      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password_hash');

      const jwtService = app.get(JwtService);
      const token = response.body.accessToken as string;

      const payload = await jwtService.verifyAsync<{
        sub: string;
        iat: number;
        exp: number;
      }>(token, {
        algorithms: ['HS256'],
      });

      expect(payload.sub).toBe(userId);
      expect(payload.exp - payload.iat).toBe(900);

      const decoded = jwtService.decode(token, {
        complete: true,
      });

      expect(decoded).not.toBeNull();
      expect(decoded?.header.alg).toBe('HS256');
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });

  it('rejects an incorrect password without issuing a token', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const passwordHash = await passwordHashing.hash('Correct-Password-2026!');

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, status)
         VALUES ($1, $2, $3, 'active')`,
        [userId, email, passwordHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'Incorrect-Password-2026!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password_hash');
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });


  it('rejects a disabled user even with the correct password', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Correct-Password-2026!';
    const passwordHash = await passwordHashing.hash(password);

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, status)
         VALUES ($1, $2, $3, 'disabled')`,
        [userId, email, passwordHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password_hash');
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });


  it('rejects an unknown email without revealing account existence', async () => {
    const email = `auth-test-${randomUUID()}@example.invalid`;

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email,
        password: 'Unknown-Password-2026!',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password');
    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password_hash');
  });


  it('rejects a login request with missing credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(expect.any(Array));
    expect(response.body).not.toHaveProperty('accessToken');
  });


  it('rejects a malformed email address', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: 'Test-Password-2026!',
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(expect.any(Array));
    expect(response.body).not.toHaveProperty('accessToken');
  });


  it('rejects unexpected fields in the login request', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@example.invalid',
        password: 'Test-Password-2026!',
        role: 'owner',
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('role'),
      ]),
    );
    expect(response.body).not.toHaveProperty('accessToken');
  });


  it('treats passwords as case-sensitive', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'SecurePassword2026!';
    const passwordHash = await passwordHashing.hash(password);

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, status)
         VALUES ($1, $2, $3, 'active')`,
        [userId, email, passwordHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'securepassword2026!',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
      expect(response.body).not.toHaveProperty('accessToken');
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });


  it('accepts email addresses with different capitalization and surrounding whitespace', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Test-Password-2026!';
    const passwordHash = await passwordHashing.hash(password);

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, password_hash, status)
         VALUES ($1, $2, $3, 'active')`,
        [userId, email, passwordHash],
      );

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: `  ${email.toUpperCase()}  `,
          password,
        })
        .expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.expiresIn).toBe(900);
    } finally {
      await cleanupAuthTestUser(dataSource, userId);
    }
  });

});
