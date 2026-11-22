import { randomBytes, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { createTestDataSource } from './helpers/create-test-data-source';

describe('Business membership invitation schema integration', () => {
  let dataSource: DataSource;

  let businessAId: string;
  let businessBId: string;
  let inviterUserId: string;

  const createInvitation = async (
    overrides: Record<string, unknown> = {},
  ): Promise<string> => {
    const invitationId = randomUUID();

    const invitation = {
      id: invitationId,
      businessId: businessAId,
      invitedEmail: `invite-${randomUUID()}@example.invalid`,
      role: 'viewer',
      tokenHash: randomBytes(32).toString('hex'),
      invitedByUserId: inviterUserId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      acceptedAt: null,
      revokedAt: null,
      ...overrides,
    };

    await dataSource.query(
      `
        INSERT INTO business_membership_invitations (
          id,
          business_id,
          invited_email,
          role,
          token_hash,
          invited_by_user_id,
          expires_at,
          accepted_at,
          revoked_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        invitation.id,
        invitation.businessId,
        invitation.invitedEmail,
        invitation.role,
        invitation.tokenHash,
        invitation.invitedByUserId,
        invitation.expiresAt,
        invitation.acceptedAt,
        invitation.revokedAt,
      ],
    );

    return invitationId;
  };

  beforeAll(async () => {
    dataSource = createTestDataSource();

    if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
      throw new Error(
        'Integration tests must use the isolated test database.',
      );
    }

    await dataSource.initialize();

    const rows: Array<{ database_name: string }> =
      await dataSource.query(
        'SELECT current_database() AS database_name',
      );

    if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
      throw new Error('Unsafe database connection.');
    }

    businessAId = randomUUID();
    businessBId = randomUUID();
    inviterUserId = randomUUID();

    await dataSource.transaction(async (manager) => {
      await manager.query(
        `
          INSERT INTO users (id, email, status)
          VALUES ($1, $2, 'active')
        `,
        [
          inviterUserId,
          `invitation-schema-${inviterUserId}@example.invalid`,
        ],
      );

      await manager.query(
        `
          INSERT INTO businesses (id, name, slug, status)
          VALUES
            ($1, 'Invitation Schema Business A', $2, 'active'),
            ($3, 'Invitation Schema Business B', $4, 'active')
        `,
        [
          businessAId,
          `invitation-schema-${businessAId}`,
          businessBId,
          `invitation-schema-${businessBId}`,
        ],
      );
    });
  });

  afterEach(async () => {
    if (!dataSource?.isInitialized) {
      return;
    }

    await dataSource.query(
      `
        DELETE FROM business_membership_invitations
        WHERE business_id IN ($1, $2)
          AND invited_by_user_id = $3
      `,
      [businessAId, businessBId, inviterUserId],
    );
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) {
      return;
    }

    try {
      await dataSource.transaction(async (manager) => {
        await manager.query(
          `
            DELETE FROM business_membership_invitations
            WHERE business_id IN ($1, $2)
              AND invited_by_user_id = $3
          `,
          [businessAId, businessBId, inviterUserId],
        );

        await manager.query(
          'DELETE FROM businesses WHERE id IN ($1, $2)',
          [businessAId, businessBId],
        );

        await manager.query(
          'DELETE FROM users WHERE id = $1',
          [inviterUserId],
        );
      });
    } finally {
      await dataSource.destroy();
    }
  });

  it('creates a valid business membership invitation', async () => {
    const invitationId = await createInvitation();

    const rows: Array<{
      id: string;
      role: string;
      accepted_at: Date | null;
      revoked_at: Date | null;
    }> = await dataSource.query(
      `
        SELECT id, role, accepted_at, revoked_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
      [invitationId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: invitationId,
      role: 'viewer',
      accepted_at: null,
      revoked_at: null,
    });
  });

  it('rejects the owner role', async () => {
    await expect(
      createInvitation({ role: 'owner' }),
    ).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('rejects unsupported roles', async () => {
    await expect(
      createInvitation({ role: 'super_admin' }),
    ).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('rejects duplicate pending invitations for the same business and email', async () => {
    const email = `duplicate-${randomUUID()}@example.invalid`;

    await createInvitation({ invitedEmail: email });

    await expect(
      createInvitation({ invitedEmail: email }),
    ).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('allows the same email to be invited by different businesses', async () => {
    const email = `shared-${randomUUID()}@example.invalid`;

    await createInvitation({
      businessId: businessAId,
      invitedEmail: email,
    });

    await expect(
      createInvitation({
        businessId: businessBId,
        invitedEmail: email,
      }),
    ).resolves.toEqual(expect.any(String));
  });

  it('rejects duplicate token hashes', async () => {
    const tokenHash = randomBytes(32).toString('hex');

    await createInvitation({ tokenHash });

    await expect(
      createInvitation({ tokenHash }),
    ).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('rejects expiration timestamps before creation', async () => {
    await expect(
      createInvitation({
        expiresAt: new Date(Date.now() - 60_000),
      }),
    ).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('rejects invitations marked as both accepted and revoked', async () => {
    const timestamp = new Date();

    await expect(
      createInvitation({
        acceptedAt: timestamp,
        revokedAt: timestamp,
      }),
    ).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('allows a replacement invitation after revocation', async () => {
    const email = `revoked-${randomUUID()}@example.invalid`;

    const originalId = await createInvitation({
      invitedEmail: email,
    });

    await dataSource.query(
      `
        UPDATE business_membership_invitations
        SET revoked_at = NOW()
        WHERE id = $1
      `,
      [originalId],
    );

    const replacementId = await createInvitation({
      invitedEmail: email,
    });

    expect(replacementId).not.toBe(originalId);
  });

  it('allows a replacement invitation after acceptance', async () => {
    const email = `accepted-${randomUUID()}@example.invalid`;

    const originalId = await createInvitation({
      invitedEmail: email,
    });

    await dataSource.query(
      `
        UPDATE business_membership_invitations
        SET accepted_at = NOW()
        WHERE id = $1
      `,
      [originalId],
    );

    const replacementId = await createInvitation({
      invitedEmail: email,
    });

    expect(replacementId).not.toBe(originalId);
  });

  it('rejects non-normalized email addresses', async () => {
    await expect(
      createInvitation({
        invitedEmail: 'Employee@Example.invalid',
      }),
    ).rejects.toMatchObject({
      code: '23514',
    });
  });

  it('rejects invitations referencing a nonexistent business', async () => {
    await expect(
      createInvitation({
        businessId: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('rejects invitations referencing a nonexistent inviting user', async () => {
    await expect(
      createInvitation({
        invitedByUserId: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('keeps expired unresolved invitations in the pending unique index', async () => {
    const email = `expired-${randomUUID()}@example.invalid`;

    await createInvitation({
      invitedEmail: email,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await dataSource.query(
      `
        UPDATE business_membership_invitations
        SET created_at = NOW() - INTERVAL '2 days',
            expires_at = NOW() - INTERVAL '1 day'
        WHERE business_id = $1
          AND invited_email = $2
      `,
      [businessAId, email],
    );

    await expect(
      createInvitation({ invitedEmail: email }),
    ).rejects.toMatchObject({
      code: '23505',
    });
  });
});