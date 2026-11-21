import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/modules/app.module';
import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';
import { createTestJwt } from './helpers/create-test-jwt';

describe('Business membership invitation acceptance HTTP integration', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    const ownerId = randomUUID();
    const recipientId = randomUUID();
    const businessId = randomUUID();

    const ownerEmail = `accept-owner-${ownerId}@example.invalid`;
    const recipientEmail = `accept-recipient-${recipientId}@example.invalid`;

    const endpoint =
        '/api/auth/business-membership-invitations/accept';

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
            await manager.query(
                `
          INSERT INTO users (id, email, status)
          VALUES
            ($1, $3, 'active'),
            ($2, $4, 'active')
        `,
                [
                    ownerId,
                    recipientId,
                    ownerEmail,
                    recipientEmail,
                ],
            );

            await manager.query(
                `
          INSERT INTO businesses (id, name, slug, status)
          VALUES ($1, $2, $3, 'active')
        `,
                [
                    businessId,
                    'Membership Acceptance HTTP Test',
                    `accept-http-${businessId}`,
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
                [businessId, ownerId],
            );
        });
    });

    afterEach(async () => {
        if (!dataSource?.isInitialized) {
            return;
        }

        await assertTestDatabase();

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
                [businessId, recipientId],
            );
        });
    });

    afterAll(async () => {
        try {
            if (dataSource?.isInitialized) {
                await assertTestDatabase();

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
                        `
              DELETE FROM businesses
              WHERE id = $1
            `,
                        [businessId],
                    );

                    await manager.query(
                        `
              DELETE FROM users
              WHERE id IN ($1, $2)
            `,
                        [ownerId, recipientId],
                    );
                });
            }
        } finally {
            if (app) {
                await app.close();
            }
        }
    });

    const issueInvitation = async (
        role: 'admin' | 'inventory_manager' | 'operator' | 'viewer' =
            'operator',
    ): Promise<{
        invitationId: string;
        token: string;
    }> => {
        const ownerToken = await createTestJwt(ownerId);

        const response = await request(app.getHttpServer())
            .post('/api/auth/business-membership-invitations')
            .set('Authorization', `Bearer ${ownerToken}`)
            .set('X-Business-Id', businessId)
            .send({
                email: recipientEmail,
                role,
            })
            .expect(201);

        expect(response.body.token).toMatch(
            /^[A-Za-z0-9_-]{43}$/,
        );

        return {
            invitationId: response.body.invitationId,
            token: response.body.token,
        };
    };

    const expectInvitationPendingWithoutMembership = async (
        invitationId: string,
    ): Promise<void> => {
        await assertTestDatabase();

        const memberships: Array<{ count: number }> =
            await dataSource.query(
                `
        SELECT COUNT(*)::int AS count
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientId],
            );

        expect(memberships[0].count).toBe(0);

        const invitations: Array<{
            accepted_at: Date | null;
            revoked_at: Date | null;
        }> = await dataSource.query(
            `
      SELECT accepted_at, revoked_at
      FROM business_membership_invitations
      WHERE id = $1
    `,
            [invitationId],
        );

        expect(invitations).toHaveLength(1);
        expect(invitations[0].accepted_at).toBeNull();
        expect(invitations[0].revoked_at).toBeNull();
    };

    it('allows an authenticated user without membership to accept an invitation without business context', async () => {
        await assertTestDatabase();

        const existingMemberships: Array<{ count: number }> =
            await dataSource.query(
                `
          SELECT COUNT(*)::int AS count
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                [businessId, recipientId],
            );

        expect(existingMemberships[0].count).toBe(0);

        const invitation = await issueInvitation('operator');

        const recipientToken = await createTestJwt(recipientId);

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({
                token: invitation.token,
            })
            .expect(201);

        expect(response.body).toMatchObject({
            businessId,
            role: 'operator',
            status: 'active',
        });

        expect(response.body.membershipId).toEqual(
            expect.any(String),
        );

        expect(response.body).not.toHaveProperty('token');
        expect(response.body).not.toHaveProperty('userId');

        expect(response.headers['cache-control']).toBe(
            'no-store',
        );

        const memberships: Array<{
            id: string;
            business_id: string;
            user_id: string;
            role: string;
            status: string;
        }> = await dataSource.query(
            `
        SELECT
          id,
          business_id,
          user_id,
          role,
          status
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
            [businessId, recipientId],
        );

        expect(memberships).toHaveLength(1);

        expect(memberships[0]).toMatchObject({
            id: response.body.membershipId,
            business_id: businessId,
            user_id: recipientId,
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

        expect(invitations[0].accepted_at).not.toBeNull();
        expect(invitations[0].revoked_at).toBeNull();
    });

    it('rejects invitation acceptance without authentication', async () => {
        const invitation = await issueInvitation();

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .send({
                token: invitation.token,
            })
            .expect(401);

        expect(response.body.statusCode).toBe(401);

        const memberships: Array<{ count: number }> =
            await dataSource.query(
                `
        SELECT COUNT(*)::int AS count
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientId],
            );

        expect(memberships[0].count).toBe(0);

        const invitations: Array<{ accepted_at: Date | null }> =
            await dataSource.query(
                `
        SELECT accepted_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [invitation.invitationId],
            );

        expect(invitations[0].accepted_at).toBeNull();
    });

    it('rejects invitation acceptance with an invalid JWT', async () => {
        const invitation = await issueInvitation();

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', 'Bearer invalid-token')
            .send({
                token: invitation.token,
            })
            .expect(401);

        expect(response.body.statusCode).toBe(401);

        const memberships: Array<{ count: number }> =
            await dataSource.query(
                `
        SELECT COUNT(*)::int AS count
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientId],
            );

        expect(memberships[0].count).toBe(0);

        const invitations: Array<{ accepted_at: Date | null }> =
            await dataSource.query(
                `
        SELECT accepted_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [invitation.invitationId],
            );

        expect(invitations[0].accepted_at).toBeNull();
    });

    it('rejects invitation acceptance with an expired JWT', async () => {
        const invitation = await issueInvitation();

        const secret = process.env.JWT_SECRET;

        if (!secret || secret.length < 64) {
            throw new Error('Integration-test JWT secret is missing or invalid.');
        }

        const jwtService = new JwtService({
            secret,
            signOptions: {
                algorithm: 'HS256',
            },
        });

        const expiredToken = await jwtService.signAsync({
            sub: recipientId,
            iat: Math.floor(Date.now() / 1000) - 3600,
            exp: Math.floor(Date.now() / 1000) - 1800,
        });

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${expiredToken}`)
            .send({
                token: invitation.token,
            })
            .expect(401);

        expect(response.body.statusCode).toBe(401);

        const memberships: Array<{ count: number }> =
            await dataSource.query(
                `
        SELECT COUNT(*)::int AS count
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientId],
            );

        expect(memberships[0].count).toBe(0);

        const invitations: Array<{ accepted_at: Date | null }> =
            await dataSource.query(
                `
        SELECT accepted_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [invitation.invitationId],
            );

        expect(invitations[0].accepted_at).toBeNull();
    });

    it('rejects invitation acceptance when the authenticated user is disabled', async () => {
        const invitation = await issueInvitation();
        const recipientToken = await createTestJwt(recipientId);

        try {
            await assertTestDatabase();

            await dataSource.query(
                `
        UPDATE users
        SET status = 'disabled'
        WHERE id = $1
      `,
                [recipientId],
            );

            const response = await request(app.getHttpServer())
                .post(endpoint)
                .set('Authorization', `Bearer ${recipientToken}`)
                .send({
                    token: invitation.token,
                })
                .expect(401);

            expect(response.body.statusCode).toBe(401);

            const memberships: Array<{ count: number }> =
                await dataSource.query(
                    `
          SELECT COUNT(*)::int AS count
          FROM business_memberships
          WHERE business_id = $1
            AND user_id = $2
        `,
                    [businessId, recipientId],
                );

            expect(memberships[0].count).toBe(0);

            const invitations: Array<{ accepted_at: Date | null }> =
                await dataSource.query(
                    `
          SELECT accepted_at
          FROM business_membership_invitations
          WHERE id = $1
        `,
                    [invitation.invitationId],
                );

            expect(invitations[0].accepted_at).toBeNull();
        } finally {
            await assertTestDatabase();

            await dataSource.query(
                `
        UPDATE users
        SET status = 'active'
        WHERE id = $1
      `,
                [recipientId],
            );
        }
    });

    it('rejects invitation acceptance by a different authenticated user', async () => {
        const invitation = await issueInvitation();

        const ownerToken = await createTestJwt(ownerId);

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                token: invitation.token,
            })
            .expect(400);

        expect(response.body.statusCode).toBe(400);

        await expectInvitationPendingWithoutMembership(
            invitation.invitationId,
        );
    });

    it('rejects an expired membership invitation', async () => {
        const invitation = await issueInvitation();

        await assertTestDatabase();

        await dataSource.query(
            `
    UPDATE business_membership_invitations
    SET created_at = NOW() - INTERVAL '2 hours',
        expires_at = NOW() - INTERVAL '1 hour'
    WHERE id = $1
  `,
            [invitation.invitationId],
        );

        const recipientToken = await createTestJwt(recipientId);

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({
                token: invitation.token,
            })
            .expect(400);

        expect(response.body.statusCode).toBe(400);

        await expectInvitationPendingWithoutMembership(
            invitation.invitationId,
        );
    });

    it('rejects a revoked membership invitation', async () => {
        const invitation = await issueInvitation();

        await assertTestDatabase();

        await dataSource.query(
            `
      UPDATE business_membership_invitations
      SET revoked_at = NOW()
      WHERE id = $1
    `,
            [invitation.invitationId],
        );

        const recipientToken = await createTestJwt(recipientId);

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({
                token: invitation.token,
            })
            .expect(400);

        expect(response.body.statusCode).toBe(400);

        const memberships: Array<{ count: number }> =
            await dataSource.query(
                `
        SELECT COUNT(*)::int AS count
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientId],
            );

        expect(memberships[0].count).toBe(0);

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
        expect(invitations[0].revoked_at).not.toBeNull();
    });

    it('rejects reuse of an already accepted invitation', async () => {
        const invitation = await issueInvitation();

        const recipientToken = await createTestJwt(recipientId);

        await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({
                token: invitation.token,
            })
            .expect(201);

        const response = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({
                token: invitation.token,
            })
            .expect(400);

        expect(response.body.statusCode).toBe(400);

        const memberships: Array<{ count: number }> =
            await dataSource.query(
                `
        SELECT COUNT(*)::int AS count
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
    `,
                [businessId, recipientId],
            );

        expect(memberships[0].count).toBe(1);

        const invitations: Array<{ accepted_at: Date | null }> =
            await dataSource.query(
                `
        SELECT accepted_at
        FROM business_membership_invitations
        WHERE id = $1
      `,
                [invitation.invitationId],
            );

        expect(invitations).toHaveLength(1);
        expect(invitations[0].accepted_at).not.toBeNull();
    });

    it.each([
        ['missing token', {}],
        ['empty token', { token: '' }],
        ['malformed token', { token: 'invalid-token' }],
        ['numeric token', { token: 12345 }],
        ['null token', { token: null }],
        ['unexpected business ID', {
            token: 'A'.repeat(43),
            businessId: randomUUID(),
        }],
        ['unexpected user ID', {
            token: 'A'.repeat(43),
            userId: randomUUID(),
        }],
        ['unexpected role', {
            token: 'A'.repeat(43),
            role: 'owner',
        }],
    ])(
        'rejects %s in the membership invitation acceptance request',
        async (_scenario, body) => {
            const invitation = await issueInvitation();

            const recipientToken = await createTestJwt(recipientId);

            const requestBody = {
                ...body,
                ...(
                    typeof body === 'object' &&
                        body !== null &&
                        'token' in body &&
                        body.token === 'A'.repeat(43)
                        ? { token: invitation.token }
                        : {}
                ),
            };

            const response = await request(app.getHttpServer())
                .post(endpoint)
                .set('Authorization', `Bearer ${recipientToken}`)
                .send(requestBody)
                .expect(400);

            expect(response.body.statusCode).toBe(400);
            expect(response.body.message).toEqual(
                expect.any(Array),
            );

            await expectInvitationPendingWithoutMembership(
                invitation.invitationId,
            );
        },
    );

    it.each([
        'active',
        'pending',
        'suspended',
        'removed',
    ] as const)(
        'rejects invitation acceptance when the recipient already has a %s membership',
        async (membershipStatus) => {
            const invitation = await issueInvitation('operator');

            await assertTestDatabase();

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
                [businessId, recipientId, membershipStatus],
            );

            const recipientToken = await createTestJwt(recipientId);

            const response = await request(app.getHttpServer())
                .post(endpoint)
                .set('Authorization', `Bearer ${recipientToken}`)
                .send({
                    token: invitation.token,
                })
                .expect(409);

            expect(response.body.statusCode).toBe(409);

            const memberships: Array<{
                role: string;
                status: string;
            }> = await dataSource.query(
                `
        SELECT role, status
        FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [businessId, recipientId],
            );

            expect(memberships).toHaveLength(1);
            expect(memberships[0]).toMatchObject({
                role: 'viewer',
                status: membershipStatus,
            });

            const invitations: Array<{ accepted_at: Date | null }> =
                await dataSource.query(
                    `
          SELECT accepted_at
          FROM business_membership_invitations
          WHERE id = $1
        `,
                    [invitation.invitationId],
                );

            expect(invitations).toHaveLength(1);
            expect(invitations[0].accepted_at).toBeNull();
        },
    );

    it.each([
        'suspended',
        'archived',
    ] as const)(
        'rejects invitation acceptance when the business is %s',
        async (businessStatus) => {
            const invitation = await issueInvitation('operator');

            try {
                await assertTestDatabase();

                await dataSource.query(
                    `
          UPDATE businesses
          SET status = $1
          WHERE id = $2
        `,
                    [businessStatus, businessId],
                );

                const recipientToken = await createTestJwt(recipientId);

                const response = await request(app.getHttpServer())
                    .post(endpoint)
                    .set('Authorization', `Bearer ${recipientToken}`)
                    .send({
                        token: invitation.token,
                    })
                    .expect(400);

                expect(response.body.statusCode).toBe(400);

                await expectInvitationPendingWithoutMembership(
                    invitation.invitationId,
                );
            } finally {
                await assertTestDatabase();

                await dataSource.query(
                    `
          UPDATE businesses
          SET status = 'active'
          WHERE id = $1
        `,
                    [businessId],
                );
            }
        },
    );

    it('allows normal business-scoped authentication after accepting an administrator invitation', async () => {
        const invitation = await issueInvitation('admin');

        const recipientToken = await createTestJwt(recipientId);

        const acceptanceResponse = await request(app.getHttpServer())
            .post(endpoint)
            .set('Authorization', `Bearer ${recipientToken}`)
            .send({
                token: invitation.token,
            })
            .expect(201);

        expect(acceptanceResponse.body).toMatchObject({
            businessId,
            role: 'admin',
            status: 'active',
        });

        const memberships: Array<{
            role: string;
            status: string;
        }> = await dataSource.query(
            `
      SELECT role, status
      FROM business_memberships
      WHERE business_id = $1
        AND user_id = $2
    `,
            [businessId, recipientId],
        );

        expect(memberships).toHaveLength(1);

        expect(memberships[0]).toEqual({
            role: 'admin',
            status: 'active',
        });

        const newUserId = randomUUID();

        const newRecipientEmail =
            `accepted-admin-${newUserId}@example.invalid`;

        await assertTestDatabase();

        try {
            await dataSource.query(
                `
        INSERT INTO users (id, email, status)
        VALUES ($1, $2, 'active')
      `,
                [newUserId, newRecipientEmail],
            );

            const response = await request(app.getHttpServer())
                .post('/api/auth/business-membership-invitations')
                .set('Authorization', `Bearer ${recipientToken}`)
                .set('X-Business-Id', businessId)
                .send({
                    email: newRecipientEmail,
                    role: 'viewer',
                })
                .expect(201);

            expect(response.body).toMatchObject({
                businessId,
                invitedEmail: newRecipientEmail,
                role: 'viewer',
            });

            expect(response.body.token).toMatch(
                /^[A-Za-z0-9_-]{43}$/,
            );

            expect(response.headers['cache-control']).toBe(
                'no-store',
            );
        } finally {
            await assertTestDatabase();

            // Invitations reference their recipient by email, but the
            // inviter references the authenticated administrator.
            // Delete the invitation before deleting its recipient.
            await dataSource.query(
                `
        DELETE FROM business_membership_invitations
        WHERE business_id = $1
          AND invited_email = $2
      `,
                [businessId, newRecipientEmail],
            );

            await dataSource.query(
                `
        DELETE FROM users
        WHERE id = $1
      `,
                [newUserId],
            );
        }
    });

    it('does not grant business-scoped access before invitation acceptance', async () => {
        const invitation = await issueInvitation('admin');

        const recipientToken = await createTestJwt(recipientId);

        const response = await request(app.getHttpServer())
            .post('/api/auth/business-membership-invitations')
            .set('Authorization', `Bearer ${recipientToken}`)
            .set('X-Business-Id', businessId)
            .send({
                email: `unauthorized-${randomUUID()}@example.invalid`,
                role: 'viewer',
            })
            .expect(401);

        expect(response.body.statusCode).toBe(401);

        await expectInvitationPendingWithoutMembership(
            invitation.invitationId,
        );
    });

    it('preserves an existing membership in another business when accepting an invitation', async () => {
        const otherBusinessId = randomUUID();

        await assertTestDatabase();

        try {
            await dataSource.transaction(async (manager) => {
                await manager.query(
                    `
          INSERT INTO businesses (id, name, slug, status)
          VALUES ($1, $2, $3, 'active')
        `,
                    [
                        otherBusinessId,
                        'Existing Membership Test Business',
                        `existing-membership-${otherBusinessId}`,
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
          VALUES ($1, $2, 'viewer', 'active')
        `,
                    [otherBusinessId, recipientId],
                );
            });

            const recipientToken = await createTestJwt(recipientId);

            // Membership in Business A must not authorize access to Business B.
            await request(app.getHttpServer())
                .post('/api/auth/business-membership-invitations')
                .set('Authorization', `Bearer ${recipientToken}`)
                .set('X-Business-Id', businessId)
                .send({
                    email: recipientEmail,
                    role: 'viewer',
                })
                .expect(401);

            const invitation = await issueInvitation('admin');

            const acceptanceResponse = await request(app.getHttpServer())
                .post(endpoint)
                .set('Authorization', `Bearer ${recipientToken}`)
                .send({
                    token: invitation.token,
                })
                .expect(201);

            expect(acceptanceResponse.body).toMatchObject({
                businessId,
                role: 'admin',
                status: 'active',
            });

            const memberships: Array<{
                business_id: string;
                role: string;
                status: string;
            }> = await dataSource.query(
                `
        SELECT business_id, role, status
        FROM business_memberships
        WHERE user_id = $1
          AND business_id IN ($2, $3)
        ORDER BY business_id
      `,
                [recipientId, businessId, otherBusinessId],
            );

            expect(memberships).toHaveLength(2);

            expect(memberships).toEqual(
                expect.arrayContaining([
                    {
                        business_id: otherBusinessId,
                        role: 'viewer',
                        status: 'active',
                    },
                    {
                        business_id: businessId,
                        role: 'admin',
                        status: 'active',
                    },
                ]),
            );
        } finally {
            await assertTestDatabase();

            await dataSource.query(
                `
        DELETE FROM business_memberships
        WHERE business_id = $1
          AND user_id = $2
      `,
                [otherBusinessId, recipientId],
            );

            await dataSource.query(
                `
        DELETE FROM businesses
        WHERE id = $1
      `,
                [otherBusinessId],
            );
        }
    });
});
