import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { BusinessMembershipInvitationAcceptanceService } from '../src/modules/auth/business-membership-invitation-acceptance.service';
import { BusinessMembershipInvitation } from '../src/modules/auth/entities/business-membership-invitation.entity';
import { BusinessMembership } from '../src/modules/auth/entities/business-membership.entity';
import { Business } from '../src/modules/auth/entities/business.entity';
import { User } from '../src/modules/auth/entities/user.entity';
import { InvitationTokenService } from '../src/modules/auth/invitation-token.service';
import { createTestDataSource } from './helpers/create-test-data-source';
import { BusinessMembershipInvitationManagementService } from '../src/modules/auth/business-membership-invitation-management.service';

describe('Business membership invitation acceptance integration', () => {
    let dataSource: DataSource;
    let acceptanceService: BusinessMembershipInvitationAcceptanceService;
    let managementService: BusinessMembershipInvitationManagementService;
    let businessId: string;
    let inviterUserId: string;
    let recipientUserId: string;
    let otherUserId: string;

    const tokenService = new InvitationTokenService();

    const createInvitation = async (
        role: 'admin' | 'inventory_manager' | 'operator' | 'viewer' = 'viewer',
    ) => {
        const invitationId = randomUUID();
        const { token, tokenHash } = tokenService.generate();

        await dataSource.query(
            `
        INSERT INTO business_membership_invitations (
          id,
          business_id,
          invited_email,
          role,
          token_hash,
          invited_by_user_id,
          expires_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          NOW() + INTERVAL '24 hours'
        )
      `,
            [
                invitationId,
                businessId,
                `recipient-${recipientUserId}@example.invalid`,
                role,
                tokenHash,
                inviterUserId,
            ],
        );

        return { invitationId, token };
    };

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

        acceptanceService = new BusinessMembershipInvitationAcceptanceService(
            dataSource,
            tokenService,
        );

        managementService =
            new BusinessMembershipInvitationManagementService(dataSource);

        businessId = randomUUID();
        inviterUserId = randomUUID();
        recipientUserId = randomUUID();
        otherUserId = randomUUID();

        await dataSource.transaction(async (manager) => {
            await manager.query(
                `
          INSERT INTO users (id, email, status)
          VALUES
            ($1, $2, 'active'),
            ($3, $4, 'active'),
            ($5, $6, 'active')
        `,
                [
                    inviterUserId,
                    `inviter-${inviterUserId}@example.invalid`,
                    recipientUserId,
                    `recipient-${recipientUserId}@example.invalid`,
                    otherUserId,
                    `other-${otherUserId}@example.invalid`,
                ],
            );

            await manager.query(
                `
          INSERT INTO businesses (id, name, slug, status)
          VALUES ($1, $2, $3, 'active')
        `,
                [
                    businessId,
                    'Acceptance Integration Test Business',
                    `acceptance-test-${businessId}`,
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
            AND user_id = $2
        `,
                [businessId, recipientUserId],
            );

            await manager.query(
                `
          UPDATE users
          SET status = 'active'
          WHERE id = $1
        `,
                [recipientUserId],
            );

            await manager.query(
                `
          UPDATE businesses
          SET status = 'active'
          WHERE id = $1
        `,
                [businessId],
            );
        });
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
                    'DELETE FROM businesses WHERE id = $1',
                    [businessId],
                );

                await manager.query(
                    'DELETE FROM users WHERE id IN ($1, $2, $3)',
                    [inviterUserId, recipientUserId, otherUserId],
                );
            });
        } finally {
            await dataSource.destroy();
        }
    });

    it('accepts a valid invitation and creates an active membership', async () => {
        const invitation = await createInvitation('viewer');

        const result = await acceptanceService.accept(
            invitation.token,
            recipientUserId,
        );

        expect(result).toMatchObject({
            businessId,
            role: 'viewer',
            status: 'active',
        });

        expect(result.membershipId).toEqual(expect.any(String));

        const memberships: Array<{
            id: string;
            role: string;
            status: string;
        }> = await dataSource.query(
            `
        SELECT id, role, status
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
            [businessId, recipientUserId],
        );

        expect(memberships).toHaveLength(1);
        expect(memberships[0]).toMatchObject({
            id: result.membershipId,
            role: 'viewer',
            status: 'active',
        });

        const invitations: Array<{
            accepted_at: Date | null;
            revoked_at: Date | null;
        }> = await dataSource.query(
            `
        SELECT accepted_at, revoked_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
            [invitation.invitationId],
        );

        expect(invitations).toHaveLength(1);
        expect(invitations[0].accepted_at).toBeInstanceOf(Date);
        expect(invitations[0].revoked_at).toBeNull();
    });

    it('assigns the role stored in the invitation', async () => {
        const invitation = await createInvitation('admin');

        const result = await acceptanceService.accept(
            invitation.token,
            recipientUserId,
        );

        expect(result.role).toBe('admin');

        const memberships: Array<{ role: string }> =
            await dataSource.query(
                `
          SELECT role
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                [businessId, recipientUserId],
            );

        expect(memberships).toHaveLength(1);
        expect(memberships[0].role).toBe('admin');
    });

    it('rejects an invalid invitation token', async () => {
        await expect(
            acceptanceService.accept('invalid-token', recipientUserId),
        ).rejects.toMatchObject({
            status: 400,
        });
    });

    it('rejects a valid-format token that does not exist', async () => {
        const { token } = tokenService.generate();

        await expect(
            acceptanceService.accept(token, recipientUserId),
        ).rejects.toMatchObject({
            status: 400,
        });
    });

    it('rejects acceptance by another authenticated user', async () => {
        const invitation = await createInvitation();

        await expect(
            acceptanceService.accept(
                invitation.token,
                otherUserId,
            ),
        ).rejects.toMatchObject({
            status: 400,
        });

        const memberships: Array<{ id: string }> =
            await dataSource.query(
                `
          SELECT id
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                [businessId, otherUserId],
            );

        expect(memberships).toHaveLength(0);
    });

    it('rejects an invitation for a disabled recipient', async () => {
        const invitation = await createInvitation();

        await dataSource.query(
            `
        UPDATE users
        SET status = 'disabled'
        WHERE id = $1
      `,
            [recipientUserId],
        );

        await expect(
            acceptanceService.accept(
                invitation.token,
                recipientUserId,
            ),
        ).rejects.toMatchObject({
            status: 400,
        });
    });

    it('rejects an expired invitation', async () => {
        const invitation = await createInvitation();

        await dataSource.query(
            `
      UPDATE business_membership_invitations
      SET
        created_at = NOW() - INTERVAL '48 hours',
        expires_at = NOW() - INTERVAL '24 hours'
      WHERE id = $1
    `,
            [invitation.invitationId],
        );

        await expect(
            acceptanceService.accept(
                invitation.token,
                recipientUserId,
            ),
        ).rejects.toMatchObject({
            status: 400,
        });

        const memberships: Array<{ id: string }> =
            await dataSource.query(
                `
        SELECT id
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientUserId],
            );

        expect(memberships).toHaveLength(0);
    });

    it('rejects a revoked invitation', async () => {
        const invitation = await createInvitation();

        await dataSource.query(
            `
        UPDATE business_membership_invitations
        SET revoked_at = NOW()
        WHERE id = $1
      `,
            [invitation.invitationId],
        );

        await expect(
            acceptanceService.accept(
                invitation.token,
                recipientUserId,
            ),
        ).rejects.toMatchObject({
            status: 400,
        });
    });

    it('rejects replay of an accepted invitation', async () => {
        const invitation = await createInvitation();

        await acceptanceService.accept(
            invitation.token,
            recipientUserId,
        );

        await expect(
            acceptanceService.accept(
                invitation.token,
                recipientUserId,
            ),
        ).rejects.toMatchObject({
            status: 400,
        });
    });

    it.each([
        'active',
        'pending',
        'suspended',
        'removed',
    ])(
        'rejects acceptance when an existing %s membership exists',
        async (status) => {
            const invitation = await createInvitation();

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

            await expect(
                acceptanceService.accept(
                    invitation.token,
                    recipientUserId,
                ),
            ).rejects.toMatchObject({
                status: 409,
            });
        },
    );

    it.each([
        'suspended',
        'archived',
    ])(
        'rejects invitations for a %s business',
        async (status) => {
            const invitation = await createInvitation();

            await dataSource.query(
                `
          UPDATE businesses
          SET status = $1
          WHERE id = $2
        `,
                [status, businessId],
            );

            await expect(
                acceptanceService.accept(
                    invitation.token,
                    recipientUserId,
                ),
            ).rejects.toMatchObject({
                status: 400,
            });
        },
    );

    it('allows a user who already belongs to another business', async () => {
        const secondBusinessId = randomUUID();

        await dataSource.query(
            `
        INSERT INTO businesses (id, name, slug, status)
        VALUES ($1, $2, $3, 'active')
      `,
            [
                secondBusinessId,
                'Second Business',
                `second-business-${secondBusinessId}`,
            ],
        );

        try {
            await dataSource.query(
                `
          INSERT INTO business_memberships (
            business_id,
            user_id,
            role,
            status
          )
          VALUES ($1, $2, 'operator', 'active')
        `,
                [secondBusinessId, recipientUserId],
            );

            const invitation = await createInvitation('viewer');

            const result = await acceptanceService.accept(
                invitation.token,
                recipientUserId,
            );

            expect(result.businessId).toBe(businessId);
            expect(result.role).toBe('viewer');

            const memberships: Array<{
                business_id: string;
                role: string;
            }> = await dataSource.query(
                `
          SELECT business_id, role
          FROM business_memberships
          WHERE user_id = $1
          ORDER BY business_id
        `,
                [recipientUserId],
            );

            expect(memberships).toHaveLength(2);

            expect(memberships).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        business_id: secondBusinessId,
                        role: 'operator',
                    }),
                    expect.objectContaining({
                        business_id: businessId,
                        role: 'viewer',
                    }),
                ]),
            );
        } finally {
            await dataSource.query(
                `
          DELETE FROM business_memberships
          WHERE business_id = $1
        `,
                [secondBusinessId],
            );

            await dataSource.query(
                'DELETE FROM businesses WHERE id = $1',
                [secondBusinessId],
            );
        }
    });

    it('allows exactly one successful acceptance when requests are concurrent', async () => {
        const invitation = await createInvitation('operator');

        const results = await Promise.allSettled([
            acceptanceService.accept(invitation.token, recipientUserId),
            acceptanceService.accept(invitation.token, recipientUserId),
        ]);

        const successful = results.filter(
            (result) => result.status === 'fulfilled',
        );

        const rejected = results.filter(
            (result) => result.status === 'rejected',
        );

        expect(successful).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const rejectedResult = rejected[0];

        if (rejectedResult.status === 'rejected') {
            expect(rejectedResult.reason).toMatchObject({
                status: 400,
            });
        }

        const memberships: Array<{
            id: string;
            role: string;
            status: string;
        }> = await dataSource.query(
            `
      SELECT id, role, status
      FROM business_memberships
      WHERE business_id = $1
        AND user_id = $2
    `,
            [businessId, recipientUserId],
        );

        expect(memberships).toHaveLength(1);
        expect(memberships[0]).toMatchObject({
            role: 'operator',
            status: 'active',
        });

        const invitations: Array<{
            accepted_at: Date | null;
            revoked_at: Date | null;
        }> = await dataSource.query(
            `
      SELECT accepted_at, revoked_at
      FROM business_membership_invitations
      WHERE id = $1
    `,
            [invitation.invitationId],
        );

        expect(invitations).toHaveLength(1);
        expect(invitations[0].accepted_at).toBeInstanceOf(Date);
        expect(invitations[0].revoked_at).toBeNull();
    });

    it('rolls back membership creation when invitation consumption fails', async () => {
        const invitation = await createInvitation('operator');

        const originalTransaction = dataSource.transaction.bind(dataSource);

        const transactionSpy = jest
            .spyOn(dataSource, 'transaction')
            .mockImplementation(
                async (
                    isolationLevelOrCallback,
                    optionalCallback,
                ) => {
                    const callback =
                        typeof isolationLevelOrCallback === 'function'
                            ? isolationLevelOrCallback
                            : optionalCallback;

                    if (!callback) {
                        throw new Error('Transaction callback is required');
                    }

                    return originalTransaction(async (manager) => {
                        const originalQuery = manager.query.bind(manager);

                        jest.spyOn(manager, 'query').mockImplementation(
                            async (query: string, parameters?: unknown[]) => {
                                if (
                                    query.includes(
                                        'UPDATE business_membership_invitations',
                                    ) &&
                                    query.includes('SET accepted_at = NOW()')
                                ) {
                                    throw new Error(
                                        'Simulated invitation consumption failure',
                                    );
                                }

                                return originalQuery(query, parameters);
                            },
                        );

                        return callback(manager);
                    });
                },
            );

        try {
            await expect(
                acceptanceService.accept(
                    invitation.token,
                    recipientUserId,
                ),
            ).rejects.toThrow(
                'Simulated invitation consumption failure',
            );

            const memberships: Array<{ id: string }> =
                await dataSource.query(
                    `
          SELECT id
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                    [businessId, recipientUserId],
                );

            expect(memberships).toHaveLength(0);

            const invitations: Array<{
                accepted_at: Date | null;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
        SELECT accepted_at, revoked_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [invitation.invitationId],
            );

            expect(invitations).toHaveLength(1);
            expect(invitations[0].accepted_at).toBeNull();
            expect(invitations[0].revoked_at).toBeNull();
        } finally {
            transactionSpy.mockRestore();
        }
    });

    it('has the expected database uniqueness constraint for memberships', async () => {
        const constraints: Array<{ conname: string }> =
            await dataSource.query(
                `
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'business_memberships'::regclass
          AND contype = 'u'
      `,
            );

        expect(
            constraints.map((constraint) => constraint.conname),
        ).toContain(
            'business_memberships_business_id_user_id_key',
        );
    });

    it('returns 409 and preserves the invitation when membership insertion violates uniqueness', async () => {
        const invitation = await createInvitation('operator');

        const originalTransaction = dataSource.transaction.bind(dataSource);

        const transactionSpy = jest
            .spyOn(dataSource, 'transaction')
            .mockImplementation(async (isolationLevelOrCallback, optionalCallback) => {
                const callback =
                    typeof isolationLevelOrCallback === 'function'
                        ? isolationLevelOrCallback
                        : optionalCallback;

                if (!callback) {
                    throw new Error('Transaction callback is required');
                }

                return originalTransaction(async (manager) => {
                    const originalQuery = manager.query.bind(manager);

                    jest.spyOn(manager, 'query').mockImplementation(
                        async (query: string, parameters?: unknown[]) => {
                            if (
                                query.includes('INSERT INTO business_memberships') &&
                                query.includes('RETURNING id')
                            ) {
                                throw {
                                    driverError: {
                                        code: '23505',
                                        constraint:
                                            'business_memberships_business_id_user_id_key',
                                    },
                                };
                            }

                            return originalQuery(query, parameters);
                        },
                    );

                    return callback(manager);
                });
            });

        try {
            await expect(
                acceptanceService.accept(
                    invitation.token,
                    recipientUserId,
                ),
            ).rejects.toMatchObject({
                status: 409,
            });

            const memberships: Array<{ id: string }> =
                await dataSource.query(
                    `
          SELECT id
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                    [businessId, recipientUserId],
                );

            expect(memberships).toHaveLength(0);

            const invitations: Array<{
                accepted_at: Date | null;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
        SELECT accepted_at, revoked_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [invitation.invitationId],
            );

            expect(invitations).toHaveLength(1);
            expect(invitations[0].accepted_at).toBeNull();
            expect(invitations[0].revoked_at).toBeNull();
        } finally {
            transactionSpy.mockRestore();
        }
    });

    describe('Acceptance versus revocation concurrency', () => {
        it('allows exactly one terminal operation when acceptance and revocation race', async () => {
            const invitation = await createInvitation('operator');

            const results = await Promise.allSettled([
                acceptanceService.accept(
                    invitation.token,
                    recipientUserId,
                ),
                managementService.revoke(
                    businessId,
                    invitation.invitationId,
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

            const invitations: Array<{
                accepted_at: Date | null;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
                SELECT accepted_at, revoked_at
                FROM business_membership_invitations
                WHERE id = $1
                  AND business_id = $2
            `,
                [invitation.invitationId, businessId],
            );

            expect(invitations).toHaveLength(1);

            const accepted = invitations[0].accepted_at !== null;
            const revoked = invitations[0].revoked_at !== null;

            expect(Number(accepted) + Number(revoked)).toBe(1);

            const memberships: Array<{
                id: string;
                role: string;
                status: string;
            }> = await dataSource.query(
                `
                SELECT id, role, status
                FROM business_memberships
                WHERE business_id = $1
                  AND user_id = $2
            `,
                [businessId, recipientUserId],
            );

            if (accepted) {
                expect(results[0].status).toBe('fulfilled');
                expect(results[1].status).toBe('rejected');

                if (results[1].status === 'rejected') {
                    expect(results[1].reason).toMatchObject({
                        status: 409,
                    });
                }

                expect(memberships).toHaveLength(1);
                expect(memberships[0]).toMatchObject({
                    role: 'operator',
                    status: 'active',
                });
            } else {
                expect(results[0].status).toBe('rejected');
                expect(results[1].status).toBe('fulfilled');

                if (results[0].status === 'rejected') {
                    expect(results[0].reason).toMatchObject({
                        status: 400,
                    });
                }

                expect(memberships).toHaveLength(0);
            }
        });

        it('prevents revocation after successful acceptance', async () => {
            const invitation = await createInvitation('viewer');

            await acceptanceService.accept(
                invitation.token,
                recipientUserId,
            );

            await expect(
                managementService.revoke(
                    businessId,
                    invitation.invitationId,
                ),
            ).rejects.toMatchObject({
                status: 409,
            });

            const invitations: Array<{
                accepted_at: Date | null;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
            SELECT accepted_at, revoked_at
            FROM business_membership_invitations
            WHERE id = $1
        `,
                [invitation.invitationId],
            );

            expect(invitations).toHaveLength(1);
            expect(invitations[0].accepted_at).toBeInstanceOf(Date);
            expect(invitations[0].revoked_at).toBeNull();

            const memberships: Array<{ id: string }> =
                await dataSource.query(
                    `
                SELECT id
                FROM business_memberships
                WHERE business_id = $1
                  AND user_id = $2
        `,
                    [businessId, recipientUserId],
                );

            expect(memberships).toHaveLength(1);
        });

        it('prevents acceptance after successful revocation', async () => {
            const invitation = await createInvitation('viewer');

            await managementService.revoke(
                businessId,
                invitation.invitationId,
            );

            await expect(
                acceptanceService.accept(
                    invitation.token,
                    recipientUserId,
                ),
            ).rejects.toMatchObject({
                status: 400,
            });

            const invitations: Array<{
                accepted_at: Date | null;
                revoked_at: Date | null;
            }> = await dataSource.query(
                `
            SELECT accepted_at, revoked_at
            FROM business_membership_invitations
            WHERE id = $1
        `,
                [invitation.invitationId],
            );

            expect(invitations).toHaveLength(1);
            expect(invitations[0].accepted_at).toBeNull();
            expect(invitations[0].revoked_at).toBeInstanceOf(Date);

            const memberships: Array<{ id: string }> =
                await dataSource.query(
                    `
                SELECT id
                FROM business_memberships
                WHERE business_id = $1
                  AND user_id = $2
            `,
                    [businessId, recipientUserId],
                );

            expect(memberships).toHaveLength(0);
        });
    });
});
