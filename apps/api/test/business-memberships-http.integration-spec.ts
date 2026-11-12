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
            'role',
            'status',
            'userId',
        ]);

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
});