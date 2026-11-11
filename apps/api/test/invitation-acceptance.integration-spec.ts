import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { InvitationAcceptanceService } from '../src/modules/auth/invitation-acceptance.service';
import { InvitationTokenService } from '../src/modules/auth/invitation-token.service';
import { PasswordHashingService } from '../src/modules/auth/password-hashing.service';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { cleanupAuthTestUser } from './helpers/cleanup-auth-test-user';

describe('Invitation acceptance PostgreSQL integration', () => {
  let dataSource: DataSource;
  let tokenService: InvitationTokenService;
  let passwordHashing: PasswordHashingService;
  let acceptanceService: InvitationAcceptanceService;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== databaseUrl) {
      throw new Error('Invitation tests require the isolated test database.');
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      synchronize: false,
      migrationsRun: false,
    });

    await dataSource.initialize();

    const rows: Array<{ database_name: string }> =
      await dataSource.query('SELECT current_database() AS database_name');

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error('Unsafe database connection.');
    }

    tokenService = new InvitationTokenService();
    passwordHashing = new PasswordHashingService();

    acceptanceService = new InvitationAcceptanceService(
      dataSource,
      tokenService,
      passwordHashing,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('activates an invited user and consumes the invitation', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Secure-Invitation-Password-2026!';
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

      await acceptanceService.accept(token, password);

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

  it('rolls back user activation when invitation consumption fails', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Rollback-Test-Password-2026!';
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

      const originalCreateQueryRunner =
        dataSource.createQueryRunner.bind(dataSource);

      const queryRunnerSpy = jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockImplementation((mode) => {
          const runner = originalCreateQueryRunner(mode);
          const originalQuery = runner.query.bind(runner);

          runner.query = (async (
            query: string,
            parameters?: unknown[],
            useStructuredResult?: boolean,
          ) => {
            if (
              /UPDATE\s+user_invitations\s+SET\s+consumed_at/i.test(query)
            ) {
              throw new Error('Simulated invitation consumption failure');
            }

            if (useStructuredResult === true) {
              return originalQuery(query, parameters, true);
            }

            return originalQuery(query, parameters);
          }) as typeof runner.query;

          return runner;
        });

      try {
        await expect(
          acceptanceService.accept(token, password),
        ).rejects.toThrow('Simulated invitation consumption failure');
      } finally {
        queryRunnerSpy.mockRestore();
      }

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


  it('allows only one concurrent acceptance of the same invitation', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Concurrent-Test-Password-2026!';
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

      const results = await Promise.allSettled([
        acceptanceService.accept(token, password),
        acceptanceService.accept(token, password),
      ]);

      const successful = results.filter(
        (result) => result.status === 'fulfilled',
      );

      const rejected = results.filter(
        (result) => result.status === 'rejected',
      );

      expect(successful).toHaveLength(1);
      expect(rejected).toHaveLength(1);

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


  it('rejects an expired invitation without activating the user', async () => {
    const userId = randomUUID();
    const email = `auth-test-${userId}@example.invalid`;
    const password = 'Expired-Invitation-Password-2026!';
    const { token, tokenHash } = tokenService.generate();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, email],
      );

      await dataSource.query(
        `INSERT INTO user_invitations
           (user_id, token_hash, expires_at, created_at)
         VALUES (
           $1,
           $2,
           NOW() - INTERVAL '1 hour',
           NOW() - INTERVAL '25 hours'
         )`,
        [userId, tokenHash],
      );

      await expect(
        acceptanceService.accept(token, password),
      ).rejects.toThrow('Invalid or expired invitation');

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

      await acceptanceService.accept(token, originalPassword);

      await expect(
        acceptanceService.accept(token, replacementPassword),
      ).rejects.toThrow('Invalid or expired invitation');

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
      expect(users[0].password_hash).not.toBeNull();

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

});
