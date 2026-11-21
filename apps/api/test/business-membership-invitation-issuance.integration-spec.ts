import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { BusinessMembershipInvitationIssuanceService } from '../src/modules/auth/business-membership-invitation-issuance.service';
import { BusinessMembershipInvitation } from '../src/modules/auth/entities/business-membership-invitation.entity';
import { BusinessMembership } from '../src/modules/auth/entities/business-membership.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { InvitationTokenService } from '../src/modules/auth/invitation-token.service';
import { createTestDataSource } from './helpers/create-test-data-source';
import { Business } from '../src/modules/auth/entities/business.entity';

describe('Business membership invitation issuance integration', () => {
    let dataSource: DataSource;
    let issuanceService: BusinessMembershipInvitationIssuanceService;

    let businessId: string;
    let inviterUserId: string;
    let recipientUserId: string;

    const invitationTokenService = new InvitationTokenService();

    beforeAll(async () => {
        if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
            throw new Error(
                'Integration tests must use the isolated test database.',
            );
        }

        dataSource = createTestDataSource();

        dataSource.setOptions({
            entities: [
                User,
                Business,
                BusinessMembership,
                BusinessMembershipInvitation,
            ],
        });

        await dataSource.initialize();

        const rows: Array<{ database_name: string }> =
            await dataSource.query(
                'SELECT current_database() AS database_name',
            );

        if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
            throw new Error('Unsafe database connection.');
        }

        issuanceService = new BusinessMembershipInvitationIssuanceService(
            dataSource,
            invitationTokenService,
        );

        businessId = randomUUID();
        inviterUserId = randomUUID();
        recipientUserId = randomUUID();

        await dataSource.transaction(async (manager) => {
            await manager.query(
                `
          INSERT INTO users (id, email, status)
          VALUES
            ($1, $2, 'active'),
            ($3, $4, 'active')
        `,
                [
                    inviterUserId,
                    `membership-inviter-${inviterUserId}@example.invalid`,
                    recipientUserId,
                    `Membership-Recipient-${recipientUserId}@Example.Invalid`,
                ],
            );

            await manager.query(
                `
          INSERT INTO businesses (id, name, slug, status)
          VALUES ($1, $2, $3, 'active')
        `,
                [
                    businessId,
                    'Membership Invitation Integration Test',
                    `membership-invitation-${businessId}`,
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
                [businessId, inviterUserId],
            );
        });
    });

    afterEach(async () => {
        if (!dataSource?.isInitialized || !businessId) {
            return;
        }

        await dataSource.query(
            `
        DELETE FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_by_user_id = $2
      `,
            [businessId, inviterUserId],
        );
    });

    afterAll(async () => {
        if (!dataSource?.isInitialized) {
            return;
        }

        try {
            if (businessId && inviterUserId && recipientUserId) {
                await dataSource.transaction(async (manager) => {
                    await manager.query(
                        `
              DELETE FROM business_membership_invitations
              WHERE business_id = $1
                AND invited_by_user_id = $2
            `,
                        [businessId, inviterUserId],
                    );

                    await manager.query(
                        `
              DELETE FROM business_memberships
              WHERE business_id = $1
                AND user_id = $2
            `,
                        [businessId, inviterUserId],
                    );

                    await manager.query(
                        'DELETE FROM businesses WHERE id = $1',
                        [businessId],
                    );

                    await manager.query(
                        'DELETE FROM users WHERE id IN ($1, $2)',
                        [inviterUserId, recipientUserId],
                    );
                });
            }
        } finally {
            await dataSource.destroy();
        }
    });

    it('issues a secure invitation for an existing active user', async () => {
        const beforeCreation = Date.now();

        const result = await issuanceService.create(
            businessId,
            inviterUserId,
            `  MEMBERSHIP-RECIPIENT-${recipientUserId}@EXAMPLE.INVALID  `,
            'inventory_manager',
        );

        expect(result.invitationId).toEqual(expect.any(String));
        expect(result.businessId).toBe(businessId);
        expect(result.invitedEmail).toBe(
            `membership-recipient-${recipientUserId}@example.invalid`,
        );
        expect(result.role).toBe('inventory_manager');
        expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

        const rows: Array<{
            id: string;
            business_id: string;
            invited_email: string;
            role: string;
            token_hash: string;
            invited_by_user_id: string;
            created_at: Date;
            expires_at: Date;
        }> = await dataSource.query(
            `
        SELECT
          id,
          business_id,
          invited_email,
          role,
          token_hash,
          invited_by_user_id,
          created_at,
          expires_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
            [result.invitationId],
        );

        expect(rows).toHaveLength(1);

        const storedInvitation = rows[0];

        expect(storedInvitation.business_id).toBe(businessId);
        expect(storedInvitation.invited_email).toBe(result.invitedEmail);
        expect(storedInvitation.role).toBe('inventory_manager');
        expect(storedInvitation.invited_by_user_id).toBe(inviterUserId);

        expect(storedInvitation.token_hash).toBe(
            invitationTokenService.hash(result.token),
        );

        expect(storedInvitation.token_hash).not.toBe(result.token);
        expect(storedInvitation.token_hash).toMatch(/^[a-f0-9]{64}$/);

        const createdAt = new Date(storedInvitation.created_at).getTime();
        const expiresAt = new Date(storedInvitation.expires_at).getTime();

        expect(expiresAt - createdAt).toBe(24 * 60 * 60 * 1000);

        expect(expiresAt - beforeCreation).toBeGreaterThan(
            23 * 60 * 60 * 1000,
        );

        expect(expiresAt - beforeCreation).toBeLessThan(
            25 * 60 * 60 * 1000,
        );
    });

    it('rejects a duplicate active invitation', async () => {
        const email = `membership-recipient-${recipientUserId}@example.invalid`;

        const firstInvitation = await issuanceService.create(
            businessId,
            inviterUserId,
            email,
            'viewer',
        );

        await expect(
            issuanceService.create(
                businessId,
                inviterUserId,
                email.toUpperCase(),
                'operator',
            ),
        ).rejects.toMatchObject({
            status: 409,
        });

        const rows: Array<{
            id: string;
            role: string;
            revoked_at: Date | null;
            accepted_at: Date | null;
        }> = await dataSource.query(
            `
      SELECT id, role, revoked_at, accepted_at
      FROM business_membership_invitations
      WHERE business_id = $1
        AND invited_email = $2
    `,
            [businessId, email],
        );

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            id: firstInvitation.invitationId,
            role: 'viewer',
            revoked_at: null,
            accepted_at: null,
        });
    });

    it('rejects an invitation when the recipient already has a membership', async () => {
        const email = `membership-recipient-${recipientUserId}@example.invalid`;

        await dataSource.query(
            `
      INSERT INTO business_memberships (
        business_id,
        user_id,
        role,
        status
      )
      VALUES ($1, $2, 'viewer', 'active')
    `,
            [businessId, recipientUserId],
        );

        try {
            await expect(
                issuanceService.create(
                    businessId,
                    inviterUserId,
                    email,
                    'operator',
                ),
            ).rejects.toMatchObject({
                status: 409,
            });

            const rows: Array<{ id: string }> = await dataSource.query(
                `
        SELECT id
        FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_email = $2
      `,
                [businessId, email],
            );

            expect(rows).toHaveLength(0);
        } finally {
            await dataSource.query(
                `
        DELETE FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientUserId],
            );
        }
    });

    it('revokes an expired invitation and issues a replacement', async () => {
        const email = `membership-recipient-${recipientUserId}@example.invalid`;

        const expiredInvitationId = randomUUID();

        await dataSource.query(
            `
      INSERT INTO business_membership_invitations (
        id,
        business_id,
        invited_email,
        role,
        token_hash,
        invited_by_user_id,
        created_at,
        expires_at
      )
      VALUES (
        $1, $2, $3, 'viewer', $4, $5,
        NOW() - INTERVAL '48 hours',
        NOW() - INTERVAL '24 hours'
      )
    `,
            [
                expiredInvitationId,
                businessId,
                email,
                invitationTokenService.hash(
                    invitationTokenService.generate().token,
                ),
                inviterUserId,
            ],
        );

        const replacement = await issuanceService.create(
            businessId,
            inviterUserId,
            email,
            'operator',
        );

        expect(replacement.invitationId).not.toBe(expiredInvitationId);
        expect(replacement.role).toBe('operator');

        const rows: Array<{
            id: string;
            role: string;
            revoked_at: Date | null;
            accepted_at: Date | null;
        }> = await dataSource.query(
            `
      SELECT id, role, revoked_at, accepted_at
      FROM business_membership_invitations
      WHERE business_id = $1
        AND invited_email = $2
      ORDER BY created_at ASC
    `,
            [businessId, email],
        );

        expect(rows).toHaveLength(2);

        const expired = rows.find(
            (row) => row.id === expiredInvitationId,
        );

        const active = rows.find(
            (row) => row.id === replacement.invitationId,
        );

        expect(expired).toBeDefined();
        expect(expired?.revoked_at).toBeInstanceOf(Date);
        expect(expired?.accepted_at).toBeNull();

        expect(active).toBeDefined();
        expect(active?.revoked_at).toBeNull();
        expect(active?.accepted_at).toBeNull();
        expect(active?.role).toBe('operator');
    });

    it('rejects an invitation for a nonexistent user', async () => {
        const unknownEmail = `unknown-${randomUUID()}@example.invalid`;

        await expect(
            issuanceService.create(
                businessId,
                inviterUserId,
                unknownEmail,
                'viewer',
            ),
        ).rejects.toMatchObject({
            status: 404,
        });

        const rows: Array<{ id: string }> = await dataSource.query(
            `
      SELECT id
      FROM business_membership_invitations
      WHERE business_id = $1
        AND invited_email = $2
    `,
            [businessId, unknownEmail],
        );

        expect(rows).toHaveLength(0);
    });

    it('rejects an invitation for a disabled user', async () => {
        const email = `membership-recipient-${recipientUserId}@example.invalid`;

        await dataSource.query(
            `
      UPDATE users
      SET status = 'disabled'
      WHERE id = $1
    `,
            [recipientUserId],
        );

        try {
            await expect(
                issuanceService.create(
                    businessId,
                    inviterUserId,
                    email,
                    'viewer',
                ),
            ).rejects.toMatchObject({
                status: 404,
            });

            const rows: Array<{ id: string }> = await dataSource.query(
                `
        SELECT id
        FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_email = $2
      `,
                [businessId, email],
            );

            expect(rows).toHaveLength(0);
        } finally {
            await dataSource.query(
                `
        UPDATE users
        SET status = 'active'
        WHERE id = $1
      `,
                [recipientUserId],
            );
        }
    });

    it.each([
        'pending',
        'active',
        'suspended',
        'removed',
    ])(
        'rejects an invitation when the recipient membership is %s',
        async (status) => {
            const email =
                `membership-recipient-${recipientUserId}@example.invalid`;

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
                [businessId, recipientUserId, status],
            );

            try {
                await expect(
                    issuanceService.create(
                        businessId,
                        inviterUserId,
                        email,
                        'operator',
                    ),
                ).rejects.toMatchObject({
                    status: 409,
                });

                const rows: Array<{ id: string }> =
                    await dataSource.query(
                        `
            SELECT id
            FROM business_membership_invitations
            WHERE business_id = $1
              AND invited_email = $2
          `,
                        [businessId, email],
                    );

                expect(rows).toHaveLength(0);
            } finally {
                await dataSource.query(
                    `
          DELETE FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                    [businessId, recipientUserId],
                );
            }
        },
    );

    it('allows independent invitations for the same user across businesses', async () => {
        const secondBusinessId = randomUUID();
        const email = `membership-recipient-${recipientUserId}@example.invalid`;

        await dataSource.query(
            `
      INSERT INTO businesses (id, name, slug, status)
      VALUES ($1, $2, $3, 'active')
    `,
            [
                secondBusinessId,
                'Second Membership Invitation Test Business',
                `membership-invitation-${secondBusinessId}`,
            ],
        );

        await dataSource.query(
            `
      INSERT INTO business_memberships (
        business_id,
        user_id,
        role,
        status
      )
      VALUES ($1, $2, 'owner', 'active')
    `,
            [secondBusinessId, inviterUserId],
        );

        try {
            const firstInvitation = await issuanceService.create(
                businessId,
                inviterUserId,
                email,
                'operator',
            );

            const secondInvitation = await issuanceService.create(
                secondBusinessId,
                inviterUserId,
                email,
                'inventory_manager',
            );

            expect(firstInvitation.invitationId).not.toBe(
                secondInvitation.invitationId,
            );

            expect(firstInvitation.businessId).toBe(businessId);
            expect(secondInvitation.businessId).toBe(secondBusinessId);

            const rows: Array<{
                id: string;
                business_id: string;
                role: string;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
        SELECT id, business_id, role, revoked_at
        FROM business_membership_invitations
        WHERE id IN ($1, $2)
      `,
                [
                    firstInvitation.invitationId,
                    secondInvitation.invitationId,
                ],
            );

            expect(rows).toHaveLength(2);

            expect(rows).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: firstInvitation.invitationId,
                        business_id: businessId,
                        role: 'operator',
                        revoked_at: null,
                    }),
                    expect.objectContaining({
                        id: secondInvitation.invitationId,
                        business_id: secondBusinessId,
                        role: 'inventory_manager',
                        revoked_at: null,
                    }),
                ]),
            );
        } finally {
            await dataSource.query(
                `
      DELETE FROM business_memberships
      WHERE business_id = $1
        AND user_id = $2
    `,
                [secondBusinessId, inviterUserId],
            );
            await dataSource.query(
                `
        DELETE FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_by_user_id = $2
      `,
                [secondBusinessId, inviterUserId],
            );

            await dataSource.query(
                'DELETE FROM businesses WHERE id = $1',
                [secondBusinessId],
            );
        }
    });

    it('prevents duplicate invitations during concurrent requests', async () => {
        const email = `membership-recipient-${recipientUserId}@example.invalid`;

        const results = await Promise.allSettled([
            issuanceService.create(
                businessId,
                inviterUserId,
                email,
                'viewer',
            ),
            issuanceService.create(
                businessId,
                inviterUserId,
                email,
                'operator',
            ),
        ]);

        const successful = results.filter(
            (result) => result.status === 'fulfilled',
        );

        const rejected = results.filter(
            (result) => result.status === 'rejected',
        );

        expect(successful).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const rejection = rejected[0];

        if (rejection.status !== 'rejected') {
            throw new Error('Expected one rejected invitation request');
        }

        expect(rejection.reason).toMatchObject({
            status: 409,
        });

        const rows: Array<{
            id: string;
            role: string;
            revoked_at: Date | null;
            accepted_at: Date | null;
        }> = await dataSource.query(
            `
      SELECT id, role, revoked_at, accepted_at
      FROM business_membership_invitations
      WHERE business_id = $1
        AND invited_email = $2
    `,
            [businessId, email],
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].revoked_at).toBeNull();
        expect(rows[0].accepted_at).toBeNull();

        const successfulResult = successful[0];

        if (successfulResult.status !== 'fulfilled') {
            throw new Error('Expected one successful invitation request');
        }

        expect(rows[0].id).toBe(successfulResult.value.invitationId);
        expect(rows[0].role).toBe(successfulResult.value.role);
    });

    it('rolls back expired invitation revocation when replacement fails', async () => {
        const email = `membership-recipient-${recipientUserId}@example.invalid`;
        const expiredInvitationId = randomUUID();

        const originalToken = invitationTokenService.generate();

        await dataSource.query(
            `
      INSERT INTO business_membership_invitations (
        id,
        business_id,
        invited_email,
        role,
        token_hash,
        invited_by_user_id,
        created_at,
        expires_at
      )
      VALUES (
        $1, $2, $3, 'viewer', $4, $5,
        NOW() - INTERVAL '48 hours',
        NOW() - INTERVAL '24 hours'
      )
    `,
            [
                expiredInvitationId,
                businessId,
                email,
                originalToken.tokenHash,
                inviterUserId,
            ],
        );

        const collidingTokenService = {
            generate: jest.fn().mockReturnValue({
                token: originalToken.token,
                tokenHash: originalToken.tokenHash,
            }),
        } as unknown as InvitationTokenService;

        const failingService = new BusinessMembershipInvitationIssuanceService(
            dataSource,
            collidingTokenService,
        );

        await expect(
            failingService.create(
                businessId,
                inviterUserId,
                email,
                'operator',
            ),
        ).rejects.toMatchObject({
            driverError: expect.objectContaining({
                code: '23505',
            }),
        });

        const rows: Array<{
            id: string;
            revoked_at: Date | null;
            accepted_at: Date | null;
        }> = await dataSource.query(
            `
      SELECT id, revoked_at, accepted_at
      FROM business_membership_invitations
      WHERE business_id = $1
        AND invited_email = $2
    `,
            [businessId, email],
        );

        expect(rows).toHaveLength(1);

        expect(rows[0]).toMatchObject({
            id: expiredInvitationId,
            revoked_at: null,
            accepted_at: null,
        });
    });

    it('rejects an inviter without membership in the target business', async () => {
        const unauthorizedUserId = randomUUID();

        await dataSource.query(
            `
      INSERT INTO users (
        id,
        email,
        status
      )
      VALUES ($1, $2, 'active')
    `,
            [
                unauthorizedUserId,
                `unauthorized-inviter-${unauthorizedUserId}@example.invalid`,
            ],
        );

        try {
            const email =
                `membership-recipient-${recipientUserId}@example.invalid`;

            await expect(
                issuanceService.create(
                    businessId,
                    unauthorizedUserId,
                    email,
                    'viewer',
                ),
            ).rejects.toMatchObject({
                status: 403,
            });

            const invitations: Array<{ id: string }> =
                await dataSource.query(
                    `
          SELECT id
          FROM business_membership_invitations
          WHERE business_id = $1
            AND invited_email = $2
        `,
                    [businessId, email],
                );

            expect(invitations).toHaveLength(0);
        } finally {
            await dataSource.query(
                'DELETE FROM users WHERE id = $1',
                [unauthorizedUserId],
            );
        }
    });

    it.each(['pending', 'suspended', 'removed'] as const)(
        'rejects an inviter whose membership is %s',
        async (membershipStatus) => {
            const email =
                `membership-recipient-${recipientUserId}@example.invalid`;

            await dataSource.query(
                `
        UPDATE business_memberships
        SET status = $1,
            updated_at = NOW()
        WHERE business_id = $2
          AND user_id = $3
      `,
                [membershipStatus, businessId, inviterUserId],
            );

            try {
                await expect(
                    issuanceService.create(
                        businessId,
                        inviterUserId,
                        email,
                        'viewer',
                    ),
                ).rejects.toMatchObject({
                    status: 403,
                });

                const invitations: Array<{ id: string }> =
                    await dataSource.query(
                        `
            SELECT id
            FROM business_membership_invitations
            WHERE business_id = $1
              AND invited_email = $2
          `,
                        [businessId, email],
                    );

                expect(invitations).toHaveLength(0);
            } finally {
                await dataSource.query(
                    `
          UPDATE business_memberships
          SET status = 'active',
              updated_at = NOW()
          WHERE business_id = $1
            AND user_id = $2
        `,
                    [businessId, inviterUserId],
                );
            }
        },
    );

    it.each(['inventory_manager', 'operator', 'viewer'] as const)(
        'rejects an inviter with the %s role',
        async (role) => {
            const email =
                `membership-recipient-${recipientUserId}@example.invalid`;

            await dataSource.query(
                `
        UPDATE business_memberships
        SET role = $1,
            updated_at = NOW()
        WHERE business_id = $2
          AND user_id = $3
      `,
                [role, businessId, inviterUserId],
            );

            try {
                await expect(
                    issuanceService.create(
                        businessId,
                        inviterUserId,
                        email,
                        'viewer',
                    ),
                ).rejects.toMatchObject({
                    status: 403,
                });

                const invitations: Array<{ id: string }> =
                    await dataSource.query(
                        `
            SELECT id
            FROM business_membership_invitations
            WHERE business_id = $1
              AND invited_email = $2
        `,
                        [businessId, email],
                    );

                expect(invitations).toHaveLength(0);
            } finally {
                await dataSource.query(
                    `
          UPDATE business_memberships
          SET role = 'owner',
              updated_at = NOW()
          WHERE business_id = $1
            AND user_id = $2
        `,
                    [businessId, inviterUserId],
                );
            }
        },
    );

    it('rejects an invitation when the inviter account is disabled', async () => {
        const email =
            `membership-recipient-${recipientUserId}@example.invalid`;

        await dataSource.query(
            `
      UPDATE users
      SET status = 'disabled',
          updated_at = NOW()
      WHERE id = $1
    `,
            [inviterUserId],
        );

        try {
            await expect(
                issuanceService.create(
                    businessId,
                    inviterUserId,
                    email,
                    'viewer',
                ),
            ).rejects.toMatchObject({
                status: 403,
            });

            const invitations: Array<{ id: string }> =
                await dataSource.query(
                    `
          SELECT id
          FROM business_membership_invitations
          WHERE business_id = $1
            AND invited_email = $2
        `,
                    [businessId, email],
                );

            expect(invitations).toHaveLength(0);
        } finally {
            await dataSource.query(
                `
        UPDATE users
        SET status = 'active',
            updated_at = NOW()
        WHERE id = $1
      `,
                [inviterUserId],
            );
        }
    });

    it.each(['suspended', 'archived'] as const)(
        'rejects invitations when the business is %s',
        async (businessStatus) => {
            const email =
                `membership-recipient-${recipientUserId}@example.invalid`;

            await dataSource.query(
                `
        UPDATE businesses
        SET status = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
                [businessStatus, businessId],
            );

            try {
                await expect(
                    issuanceService.create(
                        businessId,
                        inviterUserId,
                        email,
                        'viewer',
                    ),
                ).rejects.toMatchObject({
                    status: 403,
                });

                const invitations: Array<{ id: string }> =
                    await dataSource.query(
                        `
            SELECT id
            FROM business_membership_invitations
            WHERE business_id = $1
              AND invited_email = $2
        `,
                        [businessId, email],
                    );

                expect(invitations).toHaveLength(0);
            } finally {
                await dataSource.query(
                    `
          UPDATE businesses
          SET status = 'active',
              updated_at = NOW()
          WHERE id = $1
        `,
                    [businessId],
                );
            }
        },
    );

    it('allows an active administrator to issue a membership invitation', async () => {
        const email =
            `membership-recipient-${recipientUserId}@example.invalid`;

        await dataSource.query(
            `
      UPDATE business_memberships
      SET role = 'admin',
          updated_at = NOW()
      WHERE business_id = $1
        AND user_id = $2
    `,
            [businessId, inviterUserId],
        );

        try {
            const result = await issuanceService.create(
                businessId,
                inviterUserId,
                email,
                'operator',
            );

            expect(result).toMatchObject({
                businessId,
                invitedEmail: email,
                role: 'operator',
            });

            expect(result.invitationId).toEqual(expect.any(String));
            expect(result.token).toEqual(expect.any(String));

            const invitations: Array<{
                id: string;
                business_id: string;
                invited_by_user_id: string;
                role: string;
                accepted_at: Date | null;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
        SELECT
          id,
          business_id,
          invited_by_user_id,
          role,
          accepted_at,
          revoked_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [result.invitationId],
            );

            expect(invitations).toHaveLength(1);

            expect(invitations[0]).toMatchObject({
                id: result.invitationId,
                business_id: businessId,
                invited_by_user_id: inviterUserId,
                role: 'operator',
                accepted_at: null,
                revoked_at: null,
            });
        } finally {
            await dataSource.query(
                `
        UPDATE business_memberships
        SET role = 'owner',
            updated_at = NOW()
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, inviterUserId],
            );
        }
    });

    it('does not modify an expired invitation when the inviter is unauthorized', async () => {
        const email =
            `membership-recipient-${recipientUserId}@example.invalid`;

        const expiredInvitationId = randomUUID();
        const { tokenHash } = invitationTokenService.generate();

        await dataSource.query(
            `
      INSERT INTO business_membership_invitations (
        id,
        business_id,
        invited_email,
        role,
        token_hash,
        invited_by_user_id,
        created_at,
        expires_at
      )
      VALUES (
        $1, $2, $3, 'viewer', $4, $5,
        NOW() - INTERVAL '48 hours',
        NOW() - INTERVAL '24 hours'
      )
    `,
            [
                expiredInvitationId,
                businessId,
                email,
                tokenHash,
                inviterUserId,
            ],
        );

        await dataSource.query(
            `
      UPDATE business_memberships
      SET status = 'suspended',
          updated_at = NOW()
      WHERE business_id = $1
        AND user_id = $2
    `,
            [businessId, inviterUserId],
        );

        try {
            await expect(
                issuanceService.create(
                    businessId,
                    inviterUserId,
                    email,
                    'operator',
                ),
            ).rejects.toMatchObject({
                status: 403,
            });

            const invitations: Array<{
                id: string;
                role: string;
                revoked_at: Date | null;
                accepted_at: Date | null;
            }> = await dataSource.query(
                `
        SELECT id, role, revoked_at, accepted_at
        FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_email = $2
      `,
                [businessId, email],
            );

            expect(invitations).toHaveLength(1);

            expect(invitations[0]).toMatchObject({
                id: expiredInvitationId,
                role: 'viewer',
                revoked_at: null,
                accepted_at: null,
            });
        } finally {
            await dataSource.query(
                `
        UPDATE business_memberships
        SET status = 'active',
            updated_at = NOW()
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, inviterUserId],
            );
        }
    });
});
