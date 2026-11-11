import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { InvitationPersistenceService } from '../src/modules/auth/invitation-persistence.service';
import { InvitationTokenService } from '../src/modules/auth/invitation-token.service';
import { User } from '../src/modules/auth/entities/user.entity';
import { BusinessMembership } from '../src/modules/auth/entities/business-membership.entity';
import { UserInvitation } from '../src/modules/auth/entities/user-invitation.entity';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { cleanupAuthTestUser } from './helpers/cleanup-auth-test-user';

describe('Invitation issuance PostgreSQL integration', () => {
  let dataSource: DataSource;
  let issuanceService: InvitationPersistenceService;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== databaseUrl) {
      throw new Error(
        'Invitation issuance tests require the isolated test database.',
      );
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      synchronize: false,
      migrationsRun: false,
      entities: [User, BusinessMembership, UserInvitation],
    });

    await dataSource.initialize();

    const rows: Array<{ database_name: string }> =
      await dataSource.query(
        'SELECT current_database() AS database_name',
      );

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error('Unsafe database connection.');
    }
    issuanceService = new InvitationPersistenceService(
      dataSource.getRepository(UserInvitation),
      dataSource.getRepository(User),
      new InvitationTokenService(),
      dataSource.getRepository(BusinessMembership),
      dataSource,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('creates an invitation for an invited business member', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, `auth-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Invitation Issuance Test', `auth-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'operator')`,
        [businessId, userId],
      );

      const beforeCreation = Date.now();
      const result = await issuanceService.create(userId, businessId);

      expect(result.invitationId).toEqual(expect.any(String));
      expect(result.token).toEqual(expect.any(String));

      const rows: Array<{
        id: string;
        token_hash: string;
        expires_at: Date;
      }> = await dataSource.query(
        `SELECT id, token_hash, expires_at
         FROM user_invitations
         WHERE user_id = $1`,
        [userId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(result.invitationId);
      expect(rows[0].token_hash).not.toBe(result.token);
      expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/);

      const expiryMilliseconds =
        new Date(rows[0].expires_at).getTime() - beforeCreation;

      expect(expiryMilliseconds).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(expiryMilliseconds).toBeLessThan(25 * 60 * 60 * 1000);
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );

      await cleanupAuthTestUser(dataSource, userId);

      await dataSource.query(
        'DELETE FROM businesses WHERE id = $1 AND slug = $2',
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it('rejects a duplicate active invitation', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, `auth-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Duplicate Invitation Test', `auth-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'operator')`,
        [businessId, userId],
      );

      const firstInvitation = await issuanceService.create(
        userId,
        businessId,
      );

      await expect(
        issuanceService.create(userId, businessId),
      ).rejects.toThrow(
        'An active invitation already exists for this user',
      );

      const rows: Array<{ id: string }> = await dataSource.query(
        `SELECT id
         FROM user_invitations
         WHERE user_id = $1
           AND consumed_at IS NULL
           AND expires_at > NOW()`,
        [userId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(firstInvitation.invitationId);
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );

      await cleanupAuthTestUser(dataSource, userId);

      await dataSource.query(
        'DELETE FROM businesses WHERE id = $1 AND slug = $2',
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it('allows a new invitation after the previous one expires', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    const expiredInvitationId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, `auth-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Expired Invitation Test', `auth-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'operator')`,
        [businessId, userId],
      );

      await dataSource.query(
        `INSERT INTO user_invitations (
          id, user_id, token_hash, created_at, expires_at
        )
        VALUES (
          $1, $2, $3, NOW() - INTERVAL '25 hours',
          NOW() - INTERVAL '1 hour'
        )`,
        [expiredInvitationId, userId, randomUUID().replace(/-/g, '').padEnd(64, '0')],
      );

      const newInvitation = await issuanceService.create(
        userId,
        businessId,
      );

      expect(newInvitation.invitationId).not.toBe(expiredInvitationId);

      const rows: Array<{
        id: string;
        is_active: boolean;
      }> = await dataSource.query(
        `SELECT
           id,
           (consumed_at IS NULL AND expires_at > NOW()) AS is_active
         FROM user_invitations
         WHERE user_id = $1`,
        [userId],
      );

      expect(rows).toHaveLength(2);
      expect(rows.filter((row) => row.is_active)).toHaveLength(1);
      expect(
        rows.find((row) => row.is_active)?.id,
      ).toBe(newInvitation.invitationId);
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );

      await cleanupAuthTestUser(dataSource, userId);

      await dataSource.query(
        'DELETE FROM businesses WHERE id = $1 AND slug = $2',
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it('allows only one invitation when requests arrive concurrently', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, `auth-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Concurrent Invitation Test', `auth-test-${businessId}`],
      );

      await dataSource.query(
        `INSERT INTO business_memberships (business_id, user_id, role)
         VALUES ($1, $2, 'operator')`,
        [businessId, userId],
      );

      const results = await Promise.allSettled([
        issuanceService.create(userId, businessId),
        issuanceService.create(userId, businessId),
      ]);

      const successful = results.filter(
        (result) => result.status === 'fulfilled',
      );

      const rejected = results.filter(
        (result) => result.status === 'rejected',
      );

      expect(successful).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const rejectedResult = rejected[0] as PromiseRejectedResult;

      expect(rejectedResult.reason.message).toBe(
        'An active invitation already exists for this user',
      );

      const rows: Array<{ id: string }> = await dataSource.query(
        `SELECT id
         FROM user_invitations
         WHERE user_id = $1
           AND consumed_at IS NULL
           AND expires_at > NOW()`,
        [userId],
      );

      expect(rows).toHaveLength(1);
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );

      await cleanupAuthTestUser(dataSource, userId);

      await dataSource.query(
        'DELETE FROM businesses WHERE id = $1 AND slug = $2',
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it('rejects invitation issuance without business membership', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'invited')`,
        [userId, `auth-test-${userId}@example.invalid`],
      );

      await dataSource.query(
        `INSERT INTO businesses (id, name, slug, status)
         VALUES ($1, $2, $3, 'active')`,
        [businessId, 'Membership Validation Test', `auth-test-${businessId}`],
      );

      // Deliberately do not create a business membership.
      await expect(
        issuanceService.create(userId, businessId),
      ).rejects.toThrow('Invited user not found');

      const rows: Array<{ count: number }> = await dataSource.query(
        `SELECT COUNT(*)::int AS count
         FROM user_invitations
         WHERE user_id = $1`,
        [userId],
      );

      expect(rows[0].count).toBe(0);
    } finally {
      await dataSource.query(
        'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
        [userId, businessId],
      );

      await cleanupAuthTestUser(dataSource, userId);

      await dataSource.query(
        'DELETE FROM businesses WHERE id = $1 AND slug = $2',
        [businessId, `auth-test-${businessId}`],
      );
    }
  });

  it.each(['active', 'disabled'] as const)(
    'rejects invitation issuance for %s users',
    async (status) => {
      const userId = randomUUID();
      const businessId = randomUUID();

      try {
        await dataSource.query(
          `INSERT INTO users (id, email, status)
           VALUES ($1, $2, $3)`,
          [userId, `auth-test-${userId}@example.invalid`, status],
        );

        await dataSource.query(
          `INSERT INTO businesses (id, name, slug, status)
           VALUES ($1, $2, $3, 'active')`,
          [businessId, 'User Eligibility Test', `auth-test-${businessId}`],
        );

        await dataSource.query(
          `INSERT INTO business_memberships (business_id, user_id, role)
           VALUES ($1, $2, 'operator')`,
          [businessId, userId],
        );

        await expect(
          issuanceService.create(userId, businessId),
        ).rejects.toThrow('Invited user not found');

        const rows: Array<{ count: number }> = await dataSource.query(
          `SELECT COUNT(*)::int AS count
           FROM user_invitations
           WHERE user_id = $1`,
          [userId],
        );

        expect(rows[0].count).toBe(0);
      } finally {
        await dataSource.query(
          'DELETE FROM business_memberships WHERE user_id = $1 AND business_id = $2',
          [userId, businessId],
        );

        await cleanupAuthTestUser(dataSource, userId);

        await dataSource.query(
          'DELETE FROM businesses WHERE id = $1 AND slug = $2',
          [businessId, `auth-test-${businessId}`],
        );
      }
    },
  );

  it('connects only to the isolated PostgreSQL test database', async () => {
    const rows: Array<{ database_name: string }> =
      await dataSource.query(
        'SELECT current_database() AS database_name',
      );

    expect(rows[0]?.database_name).toBe(
      'fimonaa_commerce_import_test',
    );
  });
});
