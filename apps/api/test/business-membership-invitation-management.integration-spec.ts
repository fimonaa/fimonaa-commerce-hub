import { randomBytes, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { BusinessMembershipInvitationManagementService } from '../src/modules/auth/business-membership-invitation-management.service';
import { createTestDataSource } from './helpers/create-test-data-source';

describe('Business membership invitation management integration', () => {
    let dataSource: DataSource;
    let managementService: BusinessMembershipInvitationManagementService;

    let businessAId: string;
    let businessBId: string;
    let inviterUserId: string;

    const createInvitation = async (
        businessId: string,
        overrides: {
            invitedEmail?: string;
            role?: 'admin' | 'inventory_manager' | 'operator' | 'viewer';
            createdAt?: Date;
            expiresAt?: Date;
            acceptedAt?: Date | null;
            revokedAt?: Date | null;
        } = {},
    ): Promise<string> => {
        const invitationId = randomUUID();

        const now = Date.now();

        const expiresAt =
            overrides.expiresAt ??
            new Date(now + 24 * 60 * 60 * 1000);

        const createdAt =
            overrides.createdAt ??
            (expiresAt.getTime() <= now
                ? new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000)
                : new Date(now - 60_000));

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
        expires_at,
        accepted_at,
        revoked_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10
      )
    `,
            [
                invitationId,
                businessId,
                overrides.invitedEmail ??
                `management-${invitationId}@example.invalid`,
                overrides.role ?? 'viewer',
                randomBytes(32).toString('hex'),
                inviterUserId,
                createdAt,
                expiresAt,
                overrides.acceptedAt ?? null,
                overrides.revokedAt ?? null,
            ],
        );

        return invitationId;
    };

    beforeAll(async () => {
        if (
            !process.env.DATABASE_URL ||
            !process.env.TEST_DATABASE_URL ||
            process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
        ) {
            throw new Error(
                'Integration tests must use the isolated test database.',
            );
        }

        dataSource = createTestDataSource();

        await dataSource.initialize();

        const rows: Array<{ database_name: string }> =
            await dataSource.query(
                'SELECT current_database() AS database_name',
            );

        if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
            await dataSource.destroy();
            throw new Error('Unsafe database connection.');
        }

        managementService =
            new BusinessMembershipInvitationManagementService(dataSource);

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
                    `management-${inviterUserId}@example.invalid`,
                ],
            );

            await manager.query(
                `
          INSERT INTO businesses (id, name, slug, status)
          VALUES
            ($1, 'Management Business A', $2, 'active'),
            ($3, 'Management Business B', $4, 'active')
        `,
                [
                    businessAId,
                    `management-a-${businessAId}`,
                    businessBId,
                    `management-b-${businessBId}`,
                ],
            );
        });
    });

    afterEach(async () => {
        if (!dataSource?.isInitialized || !businessAId) {
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

    it('returns invitations belonging to the requested business only', async () => {
        const invitationA = await createInvitation(businessAId);
        await createInvitation(businessBId);

        const result = await managementService.list(businessAId, {
            status: 'all',
            page: 1,
            limit: 25,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].invitationId).toBe(invitationA);
        expect(result.items[0].businessId).toBe(businessAId);
        expect(result.pagination.total).toBe(1);
    });

    it('returns an empty result for a business without invitations', async () => {
        const result = await managementService.list(businessAId, {
            status: 'all',
            page: 1,
            limit: 25,
        });

        expect(result.items).toEqual([]);
        expect(result.pagination).toEqual({
            page: 1,
            limit: 25,
            total: 0,
            totalPages: 0,
        });
    });

    it('supports pagination', async () => {
        for (let index = 0; index < 5; index++) {
            await createInvitation(businessAId);
        }

        const firstPage = await managementService.list(businessAId, {
            status: 'all',
            page: 1,
            limit: 2,
        });

        const secondPage = await managementService.list(businessAId, {
            status: 'all',
            page: 2,
            limit: 2,
        });

        const thirdPage = await managementService.list(businessAId, {
            status: 'all',
            page: 3,
            limit: 2,
        });

        expect(firstPage.items).toHaveLength(2);
        expect(secondPage.items).toHaveLength(2);
        expect(thirdPage.items).toHaveLength(1);

        expect(firstPage.pagination.total).toBe(5);
        expect(firstPage.pagination.totalPages).toBe(3);

        const allIds = [
            ...firstPage.items,
            ...secondPage.items,
            ...thirdPage.items,
        ].map((item) => item.invitationId);

        expect(new Set(allIds).size).toBe(5);
    });

    it('returns pending invitations', async () => {
        const pendingId = await createInvitation(businessAId);

        await createInvitation(businessAId, {
            expiresAt: new Date(Date.now() - 60_000),
        });

        const result = await managementService.list(businessAId, {
            status: 'pending',
            page: 1,
            limit: 25,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].invitationId).toBe(pendingId);
        expect(result.items[0].status).toBe('pending');
    });

    it('returns expired invitations', async () => {
        const expiredId = await createInvitation(businessAId, {
            expiresAt: new Date(Date.now() - 60_000),
        });

        await createInvitation(businessAId);

        const result = await managementService.list(businessAId, {
            status: 'expired',
            page: 1,
            limit: 25,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].invitationId).toBe(expiredId);
        expect(result.items[0].status).toBe('expired');
    });

    it('returns accepted invitations', async () => {
        const acceptedId = await createInvitation(businessAId, {
            acceptedAt: new Date(),
        });

        await createInvitation(businessAId);

        const result = await managementService.list(businessAId, {
            status: 'accepted',
            page: 1,
            limit: 25,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].invitationId).toBe(acceptedId);
        expect(result.items[0].status).toBe('accepted');
    });

    it('returns revoked invitations', async () => {
        const revokedId = await createInvitation(businessAId, {
            revokedAt: new Date(),
        });

        await createInvitation(businessAId);

        const result = await managementService.list(businessAId, {
            status: 'revoked',
            page: 1,
            limit: 25,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0].invitationId).toBe(revokedId);
        expect(result.items[0].status).toBe('revoked');
    });

    it('never exposes invitation tokens or token hashes', async () => {
        await createInvitation(businessAId);

        const result = await managementService.list(businessAId, {
            status: 'all',
            page: 1,
            limit: 25,
        });

        expect(result.items).toHaveLength(1);

        const serialized = JSON.stringify(result);

        expect(serialized).not.toContain('tokenHash');
        expect(serialized).not.toContain('token_hash');
        expect(serialized).not.toContain('"token"');
    });

    it('returns consistent invitation metadata', async () => {
        const invitationId = await createInvitation(businessAId, {
            role: 'inventory_manager',
        });

        const result = await managementService.list(businessAId, {
            status: 'all',
            page: 1,
            limit: 25,
        });

        expect(result.items[0]).toMatchObject({
            invitationId,
            businessId: businessAId,
            role: 'inventory_manager',
            status: 'pending',
            invitedByUserId: inviterUserId,
            acceptedAt: null,
            revokedAt: null,
        });

        expect(result.items[0].createdAt).toBeInstanceOf(Date);
        expect(result.items[0].expiresAt).toBeInstanceOf(Date);
    });

    it('returns correct metadata when the requested page is empty', async () => {
        for (let index = 0; index < 5; index++) {
            await createInvitation(businessAId);
        }

        const result = await managementService.list(businessAId, {
            status: 'all',
            page: 10,
            limit: 2,
        });

        expect(result.items).toEqual([]);

        expect(result.pagination).toEqual({
            page: 10,
            limit: 2,
            total: 5,
            totalPages: 3,
        });
    });

    it('returns invitations in deterministic descending order', async () => {
        const invitationIds: string[] = [];

        for (let index = 0; index < 3; index++) {
            invitationIds.push(await createInvitation(businessAId));
        }

        const sharedCreatedAt = new Date(Date.now() - 60_000);

        await dataSource.query(
            `
      UPDATE business_membership_invitations
      SET created_at = $1
      WHERE id = ANY($2::uuid[])
    `,
            [sharedCreatedAt, invitationIds],
        );

        const result = await managementService.list(businessAId, {
            status: 'all',
            page: 1,
            limit: 25,
        });

        const expectedRows: Array<{ id: string }> = await dataSource.query(
            `
    SELECT id
    FROM business_membership_invitations
    WHERE id = ANY($1::uuid[])
    ORDER BY created_at DESC, id DESC
  `,
            [invitationIds],
        );

        expect(result.items.map((item) => item.invitationId)).toEqual(
            expectedRows.map((row) => row.id),
        );
    });

    it('retrieves an invitation belonging to the requested business', async () => {
        const invitationId = await createInvitation(businessAId, {
            role: 'inventory_manager',
        });

        const result = await managementService.getById(
            businessAId,
            invitationId,
        );

        expect(result).toMatchObject({
            invitationId,
            businessId: businessAId,
            role: 'inventory_manager',
            status: 'pending',
            invitedByUserId: inviterUserId,
            acceptedAt: null,
            revokedAt: null,
        });

        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('returns 404 for a nonexistent invitation', async () => {
        await expect(
            managementService.getById(businessAId, randomUUID()),
        ).rejects.toMatchObject({
            status: 404,
            message: 'Invitation not found',
        });
    });

    it('returns 404 when an invitation belongs to another business', async () => {
        const invitationId = await createInvitation(businessBId);

        await expect(
            managementService.getById(businessAId, invitationId),
        ).rejects.toMatchObject({
            status: 404,
            message: 'Invitation not found',
        });

        const result = await managementService.getById(
            businessBId,
            invitationId,
        );

        expect(result.invitationId).toBe(invitationId);
        expect(result.businessId).toBe(businessBId);
    });

    it('does not expose invitation tokens or token hashes in details', async () => {
        const invitationId = await createInvitation(businessAId);

        const result = await managementService.getById(
            businessAId,
            invitationId,
        );

        const serialized = JSON.stringify(result);

        expect(serialized).not.toContain('tokenHash');
        expect(serialized).not.toContain('token_hash');
        expect(serialized).not.toContain('"token"');
    });

    it.each([
        'pending',
        'expired',
        'accepted',
        'revoked',
    ] as const)(
        'returns %s status for invitation details',
        async (expectedStatus) => {
            const now = Date.now();

            const createdAt = new Date(now - 2 * 60 * 60 * 1000);
            const expiresAt = new Date(now + 22 * 60 * 60 * 1000);

            const overrides = {
                createdAt,
                expiresAt,
                ...(expectedStatus === 'expired'
                    ? {
                        expiresAt: new Date(now - 60 * 60 * 1000),
                    }
                    : {}),
                ...(expectedStatus === 'accepted'
                    ? {
                        acceptedAt: new Date(now - 30 * 60 * 1000),
                    }
                    : {}),
                ...(expectedStatus === 'revoked'
                    ? {
                        revokedAt: new Date(now - 30 * 60 * 1000),
                    }
                    : {}),
            };

            const invitationId = await createInvitation(
                businessAId,
                overrides,
            );

            const result = await managementService.getById(
                businessAId,
                invitationId,
            );

            expect(result.status).toBe(expectedStatus);
        },
    );

    describe('Invitation revocation', () => {
        it('revokes a pending invitation', async () => {
            const invitationId = await createInvitation(businessAId);

            await expect(
                managementService.revoke(businessAId, invitationId),
            ).resolves.toBeUndefined();

            const invitation = await managementService.getById(
                businessAId,
                invitationId,
            );

            expect(invitation.status).toBe('revoked');
            expect(invitation.revokedAt).toBeInstanceOf(Date);
            expect(invitation.acceptedAt).toBeNull();
        });

        it('rejects revocation of an already accepted invitation', async () => {
            const invitationId = await createInvitation(businessAId, {
                acceptedAt: new Date(),
            });

            await expect(
                managementService.revoke(businessAId, invitationId),
            ).rejects.toMatchObject({
                status: 409,
            });
        });

        it('rejects revocation of an already revoked invitation', async () => {
            const invitationId = await createInvitation(businessAId, {
                revokedAt: new Date(),
            });

            await expect(
                managementService.revoke(businessAId, invitationId),
            ).rejects.toMatchObject({
                status: 409,
            });
        });

        it('rejects revocation of an expired invitation', async () => {
            const invitationId = await createInvitation(businessAId, {
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            });

            await expect(
                managementService.revoke(businessAId, invitationId),
            ).rejects.toMatchObject({
                status: 409,
            });
        });

        it('returns 404 for a nonexistent invitation', async () => {
            await expect(
                managementService.revoke(businessAId, randomUUID()),
            ).rejects.toMatchObject({
                status: 404,
            });
        });

        it('returns 404 for an invitation belonging to another business', async () => {
            const invitationId = await createInvitation(businessBId);

            await expect(
                managementService.revoke(businessAId, invitationId),
            ).rejects.toMatchObject({
                status: 404,
            });

            const invitation = await managementService.getById(
                businessBId,
                invitationId,
            );

            expect(invitation.status).toBe('pending');
            expect(invitation.revokedAt).toBeNull();
        });

        it('does not change an invitation after a failed revocation', async () => {
            const invitationId = await createInvitation(businessAId, {
                acceptedAt: new Date(),
            });

            await expect(
                managementService.revoke(businessAId, invitationId),
            ).rejects.toMatchObject({
                status: 409,
            });

            const invitation = await managementService.getById(
                businessAId,
                invitationId,
            );

            expect(invitation.status).toBe('accepted');
            expect(invitation.revokedAt).toBeNull();
        });

        it('allows only one successful revocation under concurrent requests', async () => {
            const invitationId = await createInvitation(businessAId);

            const results = await Promise.allSettled([
                managementService.revoke(businessAId, invitationId),
                managementService.revoke(businessAId, invitationId),
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

            if (rejection.status === 'rejected') {
                expect(rejection.reason).toMatchObject({
                    status: 409,
                });
            }

            const invitation = await managementService.getById(
                businessAId,
                invitationId,
            );

            expect(invitation.status).toBe('revoked');
            expect(invitation.acceptedAt).toBeNull();
        });
    });
});
