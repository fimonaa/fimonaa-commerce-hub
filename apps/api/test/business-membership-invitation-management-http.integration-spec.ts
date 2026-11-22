import { randomBytes, randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { createTestJwt } from './helpers/create-test-jwt';

describe('Business membership invitation management HTTP integration', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    const businessAId = randomUUID();
    const businessBId = randomUUID();

    const ownerId = randomUUID();
    const adminId = randomUUID();
    const viewerId = randomUUID();
    const operatorId = randomUUID();
    const inventoryManagerId = randomUUID();

    const users = [
        { id: ownerId, role: 'owner' },
        { id: adminId, role: 'admin' },
        { id: viewerId, role: 'viewer' },
        { id: operatorId, role: 'operator' },
        { id: inventoryManagerId, role: 'inventory_manager' },
    ] as const;

    const endpoint = '/api/auth/business-membership-invitations';

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
            throw new Error(
                'Unsafe integration-test database configuration.',
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

        await assertTestDatabase();

        await dataSource.transaction(async (manager) => {
            for (const user of users) {
                await manager.query(
                    `
            INSERT INTO users (id, email, status)
            VALUES ($1, $2, 'active')
          `,
                    [
                        user.id,
                        `management-http-${user.id}@example.invalid`,
                    ],
                );
            }

            await manager.query(
                `
          INSERT INTO businesses (id, name, slug, status)
          VALUES
            ($1, 'Management HTTP A', $3, 'active'),
            ($2, 'Management HTTP B', $4, 'active')
        `,
                [
                    businessAId,
                    businessBId,
                    `management-http-a-${businessAId}`,
                    `management-http-b-${businessBId}`,
                ],
            );

            for (const user of users) {
                await manager.query(
                    `
            INSERT INTO business_memberships (
              business_id,
              user_id,
              role,
              status
            )
            VALUES ($1, $2, $3, 'active')
          `,
                    [businessAId, user.id, user.role],
                );
            }

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
                [businessBId, ownerId],
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
        WHERE business_id IN ($1, $2)
      `,
            [businessAId, businessBId],
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
              WHERE business_id IN ($1, $2)
            `,
                        [businessAId, businessBId],
                    );

                    await manager.query(
                        `
              DELETE FROM business_memberships
              WHERE business_id IN ($1, $2)
            `,
                        [businessAId, businessBId],
                    );

                    await manager.query(
                        `
              DELETE FROM businesses
              WHERE id IN ($1, $2)
            `,
                        [businessAId, businessBId],
                    );

                    await manager.query(
                        `
              DELETE FROM users
              WHERE id = ANY($1::uuid[])
            `,
                        [users.map((user) => user.id)],
                    );
                });
            }
        } finally {
            if (app) {
                await app.close();
            }
        }
    });

    const createInvitation = async (
        businessId: string = businessAId,
    ): Promise<string> => {
        const invitationId = randomUUID();

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
          $1, $2, $3, 'viewer', $4, $5,
          NOW() + INTERVAL '7 days'
        )
      `,
            [
                invitationId,
                businessId,
                `management-${invitationId}@example.invalid`,
                randomBytes(32).toString('hex'),
                ownerId,
            ],
        );

        return invitationId;
    };

    const authenticatedGet = async (
        userId: string,
        businessId: string,
        path: string = endpoint,
    ) => {
        const token = await createTestJwt(userId);

        return request(app.getHttpServer())
            .get(path)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessId);
    };

    const authenticatedRevoke = async (
        userId: string,
        businessId: string,
        invitationId: string,
    ) => {
        const token = await createTestJwt(userId);

        return request(app.getHttpServer())
            .post(`${endpoint}/${invitationId}/revoke`)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessId);
    };

    it('allows an owner to list invitations', async () => {
        const invitationId = await createInvitation();

        const response = await authenticatedGet(
            ownerId,
            businessAId,
        );

        expect(response.status).toBe(200);

        expect(response.body.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    invitationId,
                    businessId: businessAId,
                    status: 'pending',
                }),
            ]),
        );

        expect(response.body.pagination.total).toBe(1);
    });

    it('allows an admin to list invitations', async () => {
        await createInvitation();

        const response = await authenticatedGet(
            adminId,
            businessAId,
        );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
    });

    it('allows an owner to retrieve invitation details', async () => {
        const invitationId = await createInvitation();

        const response = await authenticatedGet(
            ownerId,
            businessAId,
            `${endpoint}/${invitationId}`,
        );

        expect(response.status).toBe(200);

        expect(response.body).toMatchObject({
            invitationId,
            businessId: businessAId,
            status: 'pending',
        });
    });

    it('rejects requests without authentication', async () => {
        await request(app.getHttpServer())
            .get(endpoint)
            .set('X-Business-Id', businessAId)
            .expect(401);
    });

    it('rejects invalid access tokens', async () => {
        await request(app.getHttpServer())
            .get(endpoint)
            .set('Authorization', 'Bearer invalid-token')
            .set('X-Business-Id', businessAId)
            .expect(401);
    });

    it('rejects requests without business context', async () => {
        const token = await createTestJwt(ownerId);

        await request(app.getHttpServer())
            .get(endpoint)
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
    });

    it.each([
        ['viewer', viewerId],
        ['operator', operatorId],
        ['inventory_manager', inventoryManagerId],
    ])(
        'rejects %s access to invitation listing',
        async (_role, userId) => {
            const response = await authenticatedGet(
                userId,
                businessAId,
            );

            expect(response.status).toBe(403);
        },
    );

    it.each([
        ['viewer', viewerId],
        ['operator', operatorId],
        ['inventory_manager', inventoryManagerId],
    ])(
        'rejects %s access to invitation details',
        async (_role, userId) => {
            const invitationId = await createInvitation();

            const response = await authenticatedGet(
                userId,
                businessAId,
                `${endpoint}/${invitationId}`,
            );

            expect(response.status).toBe(403);
        },
    );

    it('prevents cross-business invitation access', async () => {
        const invitationId = await createInvitation(businessBId);

        const response = await authenticatedGet(
            adminId,
            businessAId,
            `${endpoint}/${invitationId}`,
        );

        expect(response.status).toBe(404);
    });

    it('returns 404 for nonexistent invitations', async () => {
        const response = await authenticatedGet(
            ownerId,
            businessAId,
            `${endpoint}/${randomUUID()}`,
        );

        expect(response.status).toBe(404);
    });

    it('rejects malformed invitation UUIDs', async () => {
        const response = await authenticatedGet(
            ownerId,
            businessAId,
            `${endpoint}/invalid-id`,
        );

        expect(response.status).toBe(400);
    });

    it.each([
        '?page=0',
        '?page=-1',
        '?page=abc',
        '?limit=0',
        '?limit=101',
        '?limit=abc',
        '?status=invalid',
        '?businessId=123',
        '?role=owner',
    ])(
        'rejects invalid listing query %s',
        async (query) => {
            const response = await authenticatedGet(
                ownerId,
                businessAId,
                `${endpoint}${query}`,
            );

            expect(response.status).toBe(400);
        },
    );

    it('does not expose invitation tokens or token hashes', async () => {
        const invitationId = await createInvitation();

        const listing = await authenticatedGet(
            ownerId,
            businessAId,
        );

        const details = await authenticatedGet(
            ownerId,
            businessAId,
            `${endpoint}/${invitationId}`,
        );

        expect(listing.status).toBe(200);
        expect(details.status).toBe(200);

        for (const response of [listing, details]) {
            const serialized = JSON.stringify(response.body);

            expect(serialized).not.toContain('tokenHash');
            expect(serialized).not.toContain('token_hash');
            expect(serialized).not.toContain('"token"');
        }
    });

    it('sets no-store cache control headers', async () => {
        const invitationId = await createInvitation();

        const listing = await authenticatedGet(
            ownerId,
            businessAId,
        );

        const details = await authenticatedGet(
            ownerId,
            businessAId,
            `${endpoint}/${invitationId}`,
        );

        expect(listing.headers['cache-control']).toBe('no-store');
        expect(details.headers['cache-control']).toBe('no-store');
    });

    it('returns only invitations from the authenticated business', async () => {
        const invitationAId = await createInvitation(businessAId);
        const invitationBId = await createInvitation(businessBId);

        const response = await authenticatedGet(
            ownerId,
            businessAId,
        );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].invitationId).toBe(invitationAId);
        expect(response.body.items[0].invitationId).not.toBe(invitationBId);
    });

    describe('Invitation revocation HTTP', () => {
        it('allows an owner to revoke a pending invitation', async () => {
            const invitationId = await createInvitation();

            const response = await authenticatedRevoke(
                ownerId,
                businessAId,
                invitationId,
            );

            expect(response.status).toBe(204);
            expect(response.text).toBe('');
            expect(response.headers['cache-control']).toBe('no-store');

            const rows: Array<{
                revoked_at: Date | null;
                accepted_at: Date | null;
            }> = await dataSource.query(
                `
                SELECT revoked_at, accepted_at
                FROM business_membership_invitations
                WHERE id = $1
                  AND business_id = $2
            `,
                [invitationId, businessAId],
            );

            expect(rows).toHaveLength(1);
            expect(rows[0].revoked_at).toBeInstanceOf(Date);
            expect(rows[0].accepted_at).toBeNull();
        });

        it('allows an admin to revoke a pending invitation', async () => {
            const invitationId = await createInvitation();

            const response = await authenticatedRevoke(
                adminId,
                businessAId,
                invitationId,
            );

            expect(response.status).toBe(204);
        });

        it.each([
            ['viewer', viewerId],
            ['operator', operatorId],
            ['inventory_manager', inventoryManagerId],
        ])('rejects %s revocation', async (_role, userId) => {
            const invitationId = await createInvitation();

            const response = await authenticatedRevoke(
                userId,
                businessAId,
                invitationId,
            );

            expect(response.status).toBe(403);
        });

        it('rejects revocation without authentication', async () => {
            const invitationId = await createInvitation();

            await request(app.getHttpServer())
                .post(`${endpoint}/${invitationId}/revoke`)
                .set('X-Business-Id', businessAId)
                .expect(401);
        });

        it('rejects revocation with an invalid JWT', async () => {
            const invitationId = await createInvitation();

            await request(app.getHttpServer())
                .post(`${endpoint}/${invitationId}/revoke`)
                .set('Authorization', 'Bearer invalid-token')
                .set('X-Business-Id', businessAId)
                .expect(401);
        });

        it('rejects revocation without business context', async () => {
            const invitationId = await createInvitation();
            const token = await createTestJwt(ownerId);

            await request(app.getHttpServer())
                .post(`${endpoint}/${invitationId}/revoke`)
                .set('Authorization', `Bearer ${token}`)
                .expect(401);
        });

        it('returns 404 for cross-business revocation', async () => {
            const invitationId = await createInvitation(businessBId);

            const response = await authenticatedRevoke(
                adminId,
                businessAId,
                invitationId,
            );

            expect(response.status).toBe(404);

            const rows: Array<{ revoked_at: Date | null }> =
                await dataSource.query(
                    `
                    SELECT revoked_at
                    FROM business_membership_invitations
                    WHERE id = $1
                `,
                    [invitationId],
                );

            expect(rows[0].revoked_at).toBeNull();
        });

        it('returns 404 for nonexistent invitations', async () => {
            const response = await authenticatedRevoke(
                ownerId,
                businessAId,
                randomUUID(),
            );

            expect(response.status).toBe(404);
        });

        it('rejects malformed invitation IDs', async () => {
            const response = await authenticatedRevoke(
                ownerId,
                businessAId,
                'invalid-id',
            );

            expect(response.status).toBe(400);
        });

        it('rejects repeated revocation', async () => {
            const invitationId = await createInvitation();

            const first = await authenticatedRevoke(
                ownerId,
                businessAId,
                invitationId,
            );

            const second = await authenticatedRevoke(
                ownerId,
                businessAId,
                invitationId,
            );

            expect(first.status).toBe(204);
            expect(second.status).toBe(409);
        });
    });
});
