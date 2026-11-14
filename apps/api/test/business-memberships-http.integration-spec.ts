import { randomUUID } from 'node:crypto';

import {
    INestApplication,
    ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { createTestJwt } from './helpers/create-test-jwt';

describe('Business memberships HTTP integration', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    const userId = randomUUID();
    const businessAId = randomUUID();
    const businessBId = randomUUID();

    let membershipAId: string;
    let membershipBId: string;

    const assertTestDatabase = async (): Promise<void> => {
        const safeDatabaseUrl = assertSafeTestDatabase(
            process.env.TEST_DATABASE_URL,
        );

        if (process.env.DATABASE_URL !== safeDatabaseUrl) {
            throw new Error(
                'Membership integration tests require the isolated test database.',
            );
        }

        const rows: Array<{ database_name: string }> =
            await dataSource.query(
                'SELECT current_database() AS database_name',
            );

        if (rows[0]?.database_name !== 'fimonaa_commerce_import_test') {
            throw new Error(
                'Membership integration tests connected to an unsafe database.',
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
                `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
                [userId, `membership-http-${userId}@example.invalid`],
            );

            await manager.query(
                `INSERT INTO businesses (id, name, slug, status)
         VALUES
           ($1, 'Membership Test A', $3, 'active'),
           ($2, 'Membership Test B', $4, 'active')`,
                [
                    businessAId,
                    businessBId,
                    `membership-test-${businessAId}`,
                    `membership-test-${businessBId}`,
                ],
            );

            const rows: Array<{ id: string; business_id: string }> =
                await manager.query(
                    `INSERT INTO business_memberships
             (business_id, user_id, role)
           VALUES
             ($1, $3, 'owner'),
             ($2, $3, 'owner')
           RETURNING id, business_id`,
                    [businessAId, businessBId, userId],
                );

            membershipAId = rows.find(
                (row) => row.business_id === businessAId,
            )!.id;

            membershipBId = rows.find(
                (row) => row.business_id === businessBId,
            )!.id;
        });
    });

    afterAll(async () => {
        try {
            if (dataSource?.isInitialized) {
                await assertTestDatabase();

                await dataSource.transaction(async (manager) => {
                    await manager.query(
                        `DELETE FROM business_memberships
             WHERE business_id IN ($1, $2)
               AND user_id = $3`,
                        [businessAId, businessBId, userId],
                    );

                    await manager.query(
                        'DELETE FROM users WHERE id = $1',
                        [userId],
                    );

                    await manager.query(
                        'DELETE FROM businesses WHERE id IN ($1, $2)',
                        [businessAId, businessBId],
                    );
                });
            }
        } finally {
            if (app) {
                await app.close();
            }
        }
    });

    const authenticatedRequest = async (
        businessId: string,
    ): Promise<{ token: string; businessId: string }> => ({
        token: await createTestJwt(userId),
        businessId,
    });

    it('rejects unauthenticated membership requests', async () => {
        await request(app.getHttpServer())
            .get('/api/business-memberships')
            .expect(401);

        await request(app.getHttpServer())
            .get(`/api/business-memberships/${membershipAId}`)
            .expect(401);
    });

    it('rejects invalid access tokens', async () => {
        await request(app.getHttpServer())
            .get('/api/business-memberships')
            .set('Authorization', 'Bearer invalid-token')
            .set('X-Business-Id', businessAId)
            .expect(401);
    });

    it('rejects requests without business context', async () => {
        const token = await createTestJwt(userId);

        await request(app.getHttpServer())
            .get('/api/business-memberships')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);
    });

    it('lists only memberships belonging to the selected business', async () => {
        const { token } = await authenticatedRequest(businessAId);

        const response = await request(app.getHttpServer())
            .get('/api/business-memberships')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessAId)
            .expect(200);

        expect(response.body.items).toHaveLength(1);

        expect(response.body.items[0]).toMatchObject({
            id: membershipAId,
            userId,
            role: 'owner',
            status: 'active',
        });

        expect(response.body.items[0]).toHaveProperty('email');

        expect(response.body.items).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: membershipBId,
                }),
            ]),
        );
    });

    it('returns membership details for the selected business', async () => {
        const token = await createTestJwt(userId);

        const response = await request(app.getHttpServer())
            .get(`/api/business-memberships/${membershipAId}`)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessAId)
            .expect(200);

        expect(response.body).toMatchObject({
            id: membershipAId,
            userId,
            role: 'owner',
            status: 'active',
        });

        expect(Object.keys(response.body).sort()).toEqual([
            'createdAt',
            'email',
            'id',
            'membershipStatus',
            'role',
            'status',
            'userId',
        ]);

        expect(response.body.membershipStatus).toBe('active');

        expect(response.body).not.toHaveProperty('passwordHash');
        expect(response.body).not.toHaveProperty('password_hash');
    });

    it('does not expose memberships from another business', async () => {
        const token = await createTestJwt(userId);

        await request(app.getHttpServer())
            .get(`/api/business-memberships/${membershipBId}`)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessAId)
            .expect(404);
    });

    it('returns 404 for a nonexistent membership', async () => {
        const token = await createTestJwt(userId);

        await request(app.getHttpServer())
            .get(`/api/business-memberships/${randomUUID()}`)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessAId)
            .expect(404);
    });

    it('rejects invalid membership UUIDs', async () => {
        const token = await createTestJwt(userId);

        await request(app.getHttpServer())
            .get('/api/business-memberships/not-a-uuid')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', businessAId)
            .expect(400);
    });

    it.each([
        ['inventory_manager', 403],
        ['operator', 403],
        ['viewer', 403],
        ['admin', 200],
    ])(
        'enforces membership access for the %s role',
        async (role, expectedStatus) => {
            const roleUserId = randomUUID();
            const token = await createTestJwt(roleUserId);

            await assertTestDatabase();

            try {
                await dataSource.transaction(async (manager) => {
                    await manager.query(
                        `INSERT INTO users (id, email, status)
           VALUES ($1, $2, 'active')`,
                        [
                            roleUserId,
                            `membership-role-${roleUserId}@example.invalid`,
                        ],
                    );

                    await manager.query(
                        `INSERT INTO business_memberships
             (business_id, user_id, role)
           VALUES ($1, $2, $3)`,
                        [businessAId, roleUserId, role],
                    );
                });

                await request(app.getHttpServer())
                    .get('/api/business-memberships')
                    .set('Authorization', `Bearer ${token}`)
                    .set('X-Business-Id', businessAId)
                    .expect(expectedStatus);

                await request(app.getHttpServer())
                    .get(`/api/business-memberships/${membershipAId}`)
                    .set('Authorization', `Bearer ${token}`)
                    .set('X-Business-Id', businessAId)
                    .expect(expectedStatus);
            } finally {
                await assertTestDatabase();

                await dataSource.transaction(async (manager) => {
                    await manager.query(
                        `DELETE FROM business_memberships
           WHERE business_id = $1 AND user_id = $2`,
                        [businessAId, roleUserId],
                    );

                    await manager.query(
                        'DELETE FROM users WHERE id = $1',
                        [roleUserId],
                    );
                });
            }
        },
    );

    it('rejects access to a business without membership', async () => {
        const token = await createTestJwt(userId);
        const unauthorizedBusinessId = randomUUID();

        await request(app.getHttpServer())
            .get('/api/business-memberships')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', unauthorizedBusinessId)
            .expect(401);

        await request(app.getHttpServer())
            .get(`/api/business-memberships/${membershipAId}`)
            .set('Authorization', `Bearer ${token}`)
            .set('X-Business-Id', unauthorizedBusinessId)
            .expect(401);
    });

    describe('membership lifecycle authorization', () => {
        const membershipStatuses = [
            'pending',
            'suspended',
            'removed',
        ] as const;

        it.each(membershipStatuses)(
            'denies access when membership is %s',
            async (membershipStatus) => {
                const token = await createTestJwt(userId);

                try {
                    await dataSource.query(
                        `UPDATE business_memberships
                     SET status = $1,
                         updated_at = NOW()
                     WHERE id = $2`,
                        [membershipStatus, membershipAId],
                    );

                    await request(app.getHttpServer())
                        .get('/api/business-memberships')
                        .set('Authorization', `Bearer ${token}`)
                        .set('X-Business-Id', businessAId)
                        .expect(401);

                    await request(app.getHttpServer())
                        .get(`/api/business-memberships/${membershipAId}`)
                        .set('Authorization', `Bearer ${token}`)
                        .set('X-Business-Id', businessAId)
                        .expect(401);
                } finally {
                    await dataSource.query(
                        `UPDATE business_memberships
                     SET status = 'active',
                         removed_at = NULL,
                         updated_at = NOW()
                     WHERE id = $1`,
                        [membershipAId],
                    );
                }
            },
        );

        it('revokes access for an existing JWT after suspension', async () => {
            const token = await createTestJwt(userId);

            try {
                await request(app.getHttpServer())
                    .get('/api/business-memberships')
                    .set('Authorization', `Bearer ${token}`)
                    .set('X-Business-Id', businessAId)
                    .expect(200);

                await dataSource.query(
                    `UPDATE business_memberships
                 SET status = 'suspended',
                     updated_at = NOW()
                 WHERE id = $1`,
                    [membershipAId],
                );

                await request(app.getHttpServer())
                    .get('/api/business-memberships')
                    .set('Authorization', `Bearer ${token}`)
                    .set('X-Business-Id', businessAId)
                    .expect(401);
            } finally {
                await dataSource.query(
                    `UPDATE business_memberships
                 SET status = 'active',
                     updated_at = NOW()
                 WHERE id = $1`,
                    [membershipAId],
                );
            }
        });

        it('preserves access to another active business', async () => {
            const token = await createTestJwt(userId);

            try {
                await dataSource.query(
                    `UPDATE business_memberships
                 SET status = 'suspended',
                     updated_at = NOW()
                 WHERE id = $1`,
                    [membershipAId],
                );

                await request(app.getHttpServer())
                    .get('/api/business-memberships')
                    .set('Authorization', `Bearer ${token}`)
                    .set('X-Business-Id', businessAId)
                    .expect(401);

                await request(app.getHttpServer())
                    .get('/api/business-memberships')
                    .set('Authorization', `Bearer ${token}`)
                    .set('X-Business-Id', businessBId)
                    .expect(200);
            } finally {
                await dataSource.query(
                    `UPDATE business_memberships
                 SET status = 'active',
                     updated_at = NOW()
                 WHERE id = $1`,
                    [membershipAId],
                );
            }
        });

        it('does not change the global user status', async () => {
            try {
                await dataSource.query(
                    `UPDATE business_memberships
                 SET status = 'suspended',
                     updated_at = NOW()
                 WHERE id = $1`,
                    [membershipAId],
                );

                const rows: Array<{ status: string }> =
                    await dataSource.query(
                        `SELECT status
                     FROM users
                     WHERE id = $1`,
                        [userId],
                    );

                expect(rows).toHaveLength(1);
                expect(rows[0].status).toBe('active');
            } finally {
                await dataSource.query(
                    `UPDATE business_memberships
                 SET status = 'active',
                     updated_at = NOW()
                 WHERE id = $1`,
                    [membershipAId],
                );
            }
        });

        it.each(['pending', 'suspended', 'removed'] as const)(
            'allows an active owner to view a %s membership',
            async (membershipStatus) => {
                const memberUserId = randomUUID();
                const ownerToken = await createTestJwt(userId);
                const memberToken = await createTestJwt(memberUserId);

                await assertTestDatabase();

                try {
                    const inserted: Array<{ id: string }> =
                        await dataSource.transaction(async (manager) => {
                            await manager.query(
                                `INSERT INTO users (id, email, status)
                         VALUES ($1, $2, 'active')`,
                                [
                                    memberUserId,
                                    `membership-lifecycle-${memberUserId}@example.invalid`,
                                ],
                            );

                            return manager.query(
                                `INSERT INTO business_memberships
                            (business_id, user_id, role, status)
                         VALUES ($1, $2, 'viewer', $3)
                         RETURNING id`,
                                [businessAId, memberUserId, membershipStatus],
                            );
                        });

                    const memberMembershipId = inserted[0].id;

                    // The active owner can see the inactive membership.
                    const listResponse = await request(app.getHttpServer())
                        .get('/api/business-memberships')
                        .set('Authorization', `Bearer ${ownerToken}`)
                        .set('X-Business-Id', businessAId)
                        .expect(200);

                    expect(listResponse.body.items).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                id: memberMembershipId,
                                userId: memberUserId,
                                role: 'viewer',
                                status: 'active',
                                membershipStatus,
                            }),
                        ]),
                    );

                    // The active owner can inspect the membership details.
                    const detailResponse = await request(app.getHttpServer())
                        .get(`/api/business-memberships/${memberMembershipId}`)
                        .set('Authorization', `Bearer ${ownerToken}`)
                        .set('X-Business-Id', businessAId)
                        .expect(200);

                    expect(detailResponse.body).toMatchObject({
                        id: memberMembershipId,
                        userId: memberUserId,
                        role: 'viewer',
                        status: 'active',
                        membershipStatus,
                    });

                    // The inactive member cannot access the business.
                    await request(app.getHttpServer())
                        .get('/api/business-memberships')
                        .set('Authorization', `Bearer ${memberToken}`)
                        .set('X-Business-Id', businessAId)
                        .expect(401);

                    // Membership status does not change global account status.
                    const users: Array<{ status: string }> =
                        await dataSource.query(
                            `SELECT status FROM users WHERE id = $1`,
                            [memberUserId],
                        );

                    expect(users).toHaveLength(1);
                    expect(users[0].status).toBe('active');
                } finally {
                    await assertTestDatabase();

                    await dataSource.transaction(async (manager) => {
                        await manager.query(
                            `DELETE FROM business_memberships
                     WHERE business_id = $1 AND user_id = $2`,
                            [businessAId, memberUserId],
                        );

                        await manager.query(
                            `DELETE FROM users WHERE id = $1`,
                            [memberUserId],
                        );
                    });
                }
            },
        );
    });
});