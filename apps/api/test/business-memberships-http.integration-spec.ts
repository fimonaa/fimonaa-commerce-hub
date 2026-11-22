import { randomUUID } from "node:crypto";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { DataSource } from "typeorm";

import { AppModule } from "../src/modules/app.module";
import { assertSafeTestDatabase } from "./helpers/assert-safe-test-database";
import { createTestJwt } from "./helpers/create-test-jwt";

describe("Business memberships HTTP integration", () => {
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
        "Membership integration tests require the isolated test database.",
      );
    }

    const rows: Array<{ database_name: string }> = await dataSource.query(
      "SELECT current_database() AS database_name",
    );

    if (rows[0]?.database_name !== "fimonaa_commerce_import_test") {
      throw new Error(
        "Membership integration tests connected to an unsafe database.",
      );
    }
  };

  beforeAll(async () => {
    assertSafeTestDatabase(process.env.TEST_DATABASE_URL);

    if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
      throw new Error("Unsafe integration-test database configuration.");
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");

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

      membershipAId = rows.find((row) => row.business_id === businessAId)!.id;

      membershipBId = rows.find((row) => row.business_id === businessBId)!.id;
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

          await manager.query("DELETE FROM users WHERE id = $1", [userId]);

          await manager.query("DELETE FROM businesses WHERE id IN ($1, $2)", [
            businessAId,
            businessBId,
          ]);
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

  it("rejects unauthenticated membership requests", async () => {
    await request(app.getHttpServer())
      .get("/api/business-memberships")
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/business-memberships/${membershipAId}`)
      .expect(401);
  });

  it("rejects invalid access tokens", async () => {
    await request(app.getHttpServer())
      .get("/api/business-memberships")
      .set("Authorization", "Bearer invalid-token")
      .set("X-Business-Id", businessAId)
      .expect(401);
  });

  it("rejects requests without business context", async () => {
    const token = await createTestJwt(userId);

    await request(app.getHttpServer())
      .get("/api/business-memberships")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("lists only memberships belonging to the selected business", async () => {
    const { token } = await authenticatedRequest(businessAId);

    const response = await request(app.getHttpServer())
      .get("/api/business-memberships")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", businessAId)
      .expect(200);

    expect(response.body.items).toHaveLength(1);

    expect(response.body.items[0]).toMatchObject({
      id: membershipAId,
      userId,
      role: "owner",
      status: "active",
    });

    expect(response.body.items[0]).toHaveProperty("email");

    expect(response.body.items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: membershipBId,
        }),
      ]),
    );
  });

  it("returns membership details for the selected business", async () => {
    const token = await createTestJwt(userId);

    const response = await request(app.getHttpServer())
      .get(`/api/business-memberships/${membershipAId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", businessAId)
      .expect(200);

    expect(response.body).toMatchObject({
      id: membershipAId,
      userId,
      role: "owner",
      status: "active",
    });

    expect(Object.keys(response.body).sort()).toEqual([
      "createdAt",
      "email",
      "id",
      "membershipStatus",
      "role",
      "status",
      "userId",
    ]);

    expect(response.body.membershipStatus).toBe("active");

    expect(response.body).not.toHaveProperty("passwordHash");
    expect(response.body).not.toHaveProperty("password_hash");
  });

  it("does not expose memberships from another business", async () => {
    const token = await createTestJwt(userId);

    await request(app.getHttpServer())
      .get(`/api/business-memberships/${membershipBId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", businessAId)
      .expect(404);
  });

  it("returns 404 for a nonexistent membership", async () => {
    const token = await createTestJwt(userId);

    await request(app.getHttpServer())
      .get(`/api/business-memberships/${randomUUID()}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", businessAId)
      .expect(404);
  });

  it("rejects invalid membership UUIDs", async () => {
    const token = await createTestJwt(userId);

    await request(app.getHttpServer())
      .get("/api/business-memberships/not-a-uuid")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", businessAId)
      .expect(400);
  });

  it.each([
    ["inventory_manager", 403],
    ["operator", 403],
    ["viewer", 403],
    ["admin", 200],
  ])(
    "enforces membership access for the %s role",
    async (role, expectedStatus) => {
      const roleUserId = randomUUID();
      const token = await createTestJwt(roleUserId);

      await assertTestDatabase();

      try {
        await dataSource.transaction(async (manager) => {
          await manager.query(
            `INSERT INTO users (id, email, status)
           VALUES ($1, $2, 'active')`,
            [roleUserId, `membership-role-${roleUserId}@example.invalid`],
          );

          await manager.query(
            `INSERT INTO business_memberships
             (business_id, user_id, role)
           VALUES ($1, $2, $3)`,
            [businessAId, roleUserId, role],
          );
        });

        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${token}`)
          .set("X-Business-Id", businessAId)
          .expect(expectedStatus);

        await request(app.getHttpServer())
          .get(`/api/business-memberships/${membershipAId}`)
          .set("Authorization", `Bearer ${token}`)
          .set("X-Business-Id", businessAId)
          .expect(expectedStatus);
      } finally {
        await assertTestDatabase();

        await dataSource.transaction(async (manager) => {
          await manager.query(
            `DELETE FROM business_memberships
           WHERE business_id = $1 AND user_id = $2`,
            [businessAId, roleUserId],
          );

          await manager.query("DELETE FROM users WHERE id = $1", [roleUserId]);
        });
      }
    },
  );

  it("rejects access to a business without membership", async () => {
    const token = await createTestJwt(userId);
    const unauthorizedBusinessId = randomUUID();

    await request(app.getHttpServer())
      .get("/api/business-memberships")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", unauthorizedBusinessId)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/api/business-memberships/${membershipAId}`)
      .set("Authorization", `Bearer ${token}`)
      .set("X-Business-Id", unauthorizedBusinessId)
      .expect(401);
  });

  describe("membership lifecycle authorization", () => {
    const membershipStatuses = ["pending", "suspended", "removed"] as const;

    it.each(membershipStatuses)(
      "denies access when membership is %s",
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
            .get("/api/business-memberships")
            .set("Authorization", `Bearer ${token}`)
            .set("X-Business-Id", businessAId)
            .expect(401);

          await request(app.getHttpServer())
            .get(`/api/business-memberships/${membershipAId}`)
            .set("Authorization", `Bearer ${token}`)
            .set("X-Business-Id", businessAId)
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

    it("revokes access for an existing JWT after suspension", async () => {
      const token = await createTestJwt(userId);

      try {
        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${token}`)
          .set("X-Business-Id", businessAId)
          .expect(200);

        await dataSource.query(
          `UPDATE business_memberships
                 SET status = 'suspended',
                     updated_at = NOW()
                 WHERE id = $1`,
          [membershipAId],
        );

        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${token}`)
          .set("X-Business-Id", businessAId)
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

    it("preserves access to another active business", async () => {
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
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${token}`)
          .set("X-Business-Id", businessAId)
          .expect(401);

        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${token}`)
          .set("X-Business-Id", businessBId)
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

    it("does not change the global user status", async () => {
      try {
        await dataSource.query(
          `UPDATE business_memberships
                 SET status = 'suspended',
                     updated_at = NOW()
                 WHERE id = $1`,
          [membershipAId],
        );

        const rows: Array<{ status: string }> = await dataSource.query(
          `SELECT status
                     FROM users
                     WHERE id = $1`,
          [userId],
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe("active");
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

    it.each(["pending", "suspended", "removed"] as const)(
      "allows an active owner to view a %s membership",
      async (membershipStatus) => {
        const memberUserId = randomUUID();
        const ownerToken = await createTestJwt(userId);
        const memberToken = await createTestJwt(memberUserId);

        await assertTestDatabase();

        try {
          const inserted: Array<{ id: string }> = await dataSource.transaction(
            async (manager) => {
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
            },
          );

          const memberMembershipId = inserted[0].id;

          // The active owner can see the inactive membership.
          const listResponse = await request(app.getHttpServer())
            .get("/api/business-memberships")
            .set("Authorization", `Bearer ${ownerToken}`)
            .set("X-Business-Id", businessAId)
            .expect(200);

          expect(listResponse.body.items).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: memberMembershipId,
                userId: memberUserId,
                role: "viewer",
                status: "active",
                membershipStatus,
              }),
            ]),
          );

          // The active owner can inspect the membership details.
          const detailResponse = await request(app.getHttpServer())
            .get(`/api/business-memberships/${memberMembershipId}`)
            .set("Authorization", `Bearer ${ownerToken}`)
            .set("X-Business-Id", businessAId)
            .expect(200);

          expect(detailResponse.body).toMatchObject({
            id: memberMembershipId,
            userId: memberUserId,
            role: "viewer",
            status: "active",
            membershipStatus,
          });

          // The inactive member cannot access the business.
          await request(app.getHttpServer())
            .get("/api/business-memberships")
            .set("Authorization", `Bearer ${memberToken}`)
            .set("X-Business-Id", businessAId)
            .expect(401);

          // Membership status does not change global account status.
          const users: Array<{ status: string }> = await dataSource.query(
            `SELECT status FROM users WHERE id = $1`,
            [memberUserId],
          );

          expect(users).toHaveLength(1);
          expect(users[0].status).toBe("active");
        } finally {
          await assertTestDatabase();

          await dataSource.transaction(async (manager) => {
            await manager.query(
              `DELETE FROM business_memberships
                     WHERE business_id = $1 AND user_id = $2`,
              [businessAId, memberUserId],
            );

            await manager.query(`DELETE FROM users WHERE id = $1`, [
              memberUserId,
            ]);
          });
        }
      },
    );
  });

  describe("membership role management", () => {
    const memberUserId = randomUUID();
    const adminUserId = randomUUID();
    const otherOwnerUserId = randomUUID();

    let memberMembershipId: string;
    let otherOwnerMembershipId: string;

    const roleEndpoint = (membershipId: string): string =>
      `/api/business-memberships/${membershipId}/role`;

    const ownerRequest = (membershipId: string, role: string) =>
      request(app.getHttpServer())
        .patch(roleEndpoint(membershipId))
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .send({ role });

    let ownerToken: string;
    let adminToken: string;

    beforeAll(async () => {
      await assertTestDatabase();

      ownerToken = await createTestJwt(userId);
      adminToken = await createTestJwt(adminUserId);

      await dataSource.transaction(async (manager) => {
        for (const temporaryUserId of [
          memberUserId,
          adminUserId,
          otherOwnerUserId,
        ]) {
          await manager.query(
            `INSERT INTO users (id, email, status)
                         VALUES ($1, $2, 'active')`,
            [
              temporaryUserId,
              `membership-update-${temporaryUserId}@example.invalid`,
            ],
          );
        }

        const inserted: Array<{
          id: string;
          user_id: string;
        }> = await manager.query(
          `INSERT INTO business_memberships
                        (business_id, user_id, role, status)
                     VALUES
                        ($1, $2, 'viewer', 'active'),
                        ($1, $3, 'admin', 'active'),
                        ($1, $4, 'owner', 'active')
                     RETURNING id, user_id`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        memberMembershipId = inserted.find(
          (row) => row.user_id === memberUserId,
        )!.id;

        otherOwnerMembershipId = inserted.find(
          (row) => row.user_id === otherOwnerUserId,
        )!.id;
      });
    });

    beforeEach(async () => {
      await assertTestDatabase();

      await dataSource.query(
        `UPDATE business_memberships
                 SET role = 'viewer',
                     status = 'active',
                     removed_at = NULL,
                     updated_at = NOW()
                 WHERE id = $1`,
        [memberMembershipId],
      );
    });

    afterAll(async () => {
      await assertTestDatabase();

      await dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM business_memberships
                     WHERE user_id IN ($1, $2, $3)
                       AND business_id = $4`,
          [memberUserId, adminUserId, otherOwnerUserId, businessAId],
        );

        await manager.query(
          `DELETE FROM users
                     WHERE id IN ($1, $2, $3)`,
          [memberUserId, adminUserId, otherOwnerUserId],
        );
      });
    });

    it("allows an owner to update an active member role", async () => {
      const response = await ownerRequest(
        memberMembershipId,
        "operator",
      ).expect(200);

      expect(response.body).toMatchObject({
        id: memberMembershipId,
        userId: memberUserId,
        role: "operator",
        membershipStatus: "active",
      });

      const rows: Array<{ role: string }> = await dataSource.query(
        `SELECT role
                     FROM business_memberships
                     WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows[0]?.role).toBe("operator");
    });

    it("applies updated roles to existing JWTs", async () => {
      const memberToken = await createTestJwt(memberUserId);

      await ownerRequest(memberMembershipId, "admin").expect(200);

      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(200);

      await ownerRequest(memberMembershipId, "viewer").expect(200);

      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(403);
    });

    it("rejects role updates from admins", async () => {
      await request(app.getHttpServer())
        .patch(roleEndpoint(memberMembershipId))
        .set("Authorization", `Bearer ${adminToken}`)
        .set("X-Business-Id", businessAId)
        .send({ role: "operator" })
        .expect(403);
    });

    it("rejects self-modification", async () => {
      await ownerRequest(membershipAId, "admin").expect(403);
    });

    it("protects other owner memberships", async () => {
      await ownerRequest(otherOwnerMembershipId, "admin").expect(403);
    });

    it("does not expose memberships from another business", async () => {
      await ownerRequest(membershipBId, "operator").expect(404);
    });

    it.each(["pending", "suspended", "removed"])(
      "rejects role changes for %s memberships",
      async (status) => {
        try {
          await dataSource.query(
            `UPDATE business_memberships
                         SET status = $1,
                             updated_at = NOW()
                         WHERE id = $2`,
            [status, memberMembershipId],
          );

          await ownerRequest(memberMembershipId, "operator").expect(409);
        } finally {
          await dataSource.query(
            `UPDATE business_memberships
                         SET status = 'active',
                             removed_at = NULL,
                             updated_at = NOW()
                         WHERE id = $1`,
            [memberMembershipId],
          );
        }
      },
    );

    it("rejects assigning the current role again", async () => {
      await ownerRequest(memberMembershipId, "viewer").expect(409);
    });

    it.each(["owner", "invalid", ""])(
      "rejects invalid role value %s",
      async (role) => {
        await ownerRequest(memberMembershipId, role).expect(400);
      },
    );

    it("rejects missing role values", async () => {
      await request(app.getHttpServer())
        .patch(roleEndpoint(memberMembershipId))
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .send({})
        .expect(400);
    });

    it("rejects unexpected request properties", async () => {
      await request(app.getHttpServer())
        .patch(roleEndpoint(memberMembershipId))
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .send({
          role: "operator",
          businessId: businessBId,
        })
        .expect(400);
    });

    it("rejects invalid membership UUIDs", async () => {
      await ownerRequest("not-a-uuid", "operator").expect(400);
    });

    it("rejects unauthenticated role updates", async () => {
      await request(app.getHttpServer())
        .patch(roleEndpoint(memberMembershipId))
        .set("X-Business-Id", businessAId)
        .send({ role: "operator" })
        .expect(401);
    });

    it("preserves membership roles in other businesses", async () => {
      await ownerRequest(memberMembershipId, "operator").expect(200);

      const rows: Array<{
        business_id: string;
        role: string;
      }> = await dataSource.query(
        `SELECT business_id, role
                 FROM business_memberships
                 WHERE user_id = $1
                 ORDER BY business_id`,
        [userId],
      );

      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            business_id: businessAId,
            role: "owner",
          }),
          expect.objectContaining({
            business_id: businessBId,
            role: "owner",
          }),
        ]),
      );
    });

    it("preserves the target member's role in another business", async () => {
      const rows: Array<{ id: string }> = await dataSource.query(
        `INSERT INTO business_memberships
       (business_id, user_id, role, status)
     VALUES ($1, $2, 'inventory_manager', 'active')
     RETURNING id`,
        [businessBId, memberUserId],
      );

      const otherMembershipId = rows[0].id;

      try {
        await ownerRequest(memberMembershipId, "operator").expect(200);

        const memberships: Array<{
          business_id: string;
          role: string;
        }> = await dataSource.query(
          `SELECT business_id, role
       FROM business_memberships
       WHERE user_id = $1
         AND business_id IN ($2, $3)
       ORDER BY business_id`,
          [memberUserId, businessAId, businessBId],
        );

        expect(memberships).toEqual(
          expect.arrayContaining([
            {
              business_id: businessAId,
              role: "operator",
            },
            {
              business_id: businessBId,
              role: "inventory_manager",
            },
          ]),
        );
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `DELETE FROM business_memberships
       WHERE id = $1
         AND business_id = $2`,
          [otherMembershipId, businessBId],
        );
      }
    });

    it("serializes concurrent role updates for the same membership", async () => {
      const [first, second] = await Promise.all([
        ownerRequest(memberMembershipId, "operator"),
        ownerRequest(memberMembershipId, "admin"),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      const rows: Array<{ role: string }> = await dataSource.query(
        `SELECT role
     FROM business_memberships
     WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(["operator", "admin"]).toContain(rows[0].role);

      const detailResponse = await request(app.getHttpServer())
        .get(`/api/business-memberships/${memberMembershipId}`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .expect(200);

      expect(detailResponse.body.role).toBe(rows[0].role);
    });
  });

  describe("membership suspension management", () => {
    const memberUserId = randomUUID();
    const adminUserId = randomUUID();
    const otherOwnerUserId = randomUUID();

    let memberMembershipId: string;
    let adminMembershipId: string;
    let otherOwnerMembershipId: string;

    let ownerToken: string;
    let adminToken: string;
    let memberToken: string;

    const suspensionEndpoint = (membershipId: string): string =>
      `/api/business-memberships/${membershipId}/suspend`;

    const suspendRequest = (
      membershipId: string,
      token: string,
      businessId = businessAId,
    ) =>
      request(app.getHttpServer())
        .post(suspensionEndpoint(membershipId))
        .set("Authorization", `Bearer ${token}`)
        .set("X-Business-Id", businessId);

    beforeAll(async () => {
      await assertTestDatabase();

      ownerToken = await createTestJwt(userId);
      adminToken = await createTestJwt(adminUserId);
      memberToken = await createTestJwt(memberUserId);

      await dataSource.transaction(async (manager) => {
        for (const temporaryUserId of [
          memberUserId,
          adminUserId,
          otherOwnerUserId,
        ]) {
          await manager.query(
            `INSERT INTO users (id, email, status)
           VALUES ($1, $2, 'active')`,
            [
              temporaryUserId,
              `membership-suspension-${temporaryUserId}@example.invalid`,
            ],
          );
        }

        const inserted: Array<{
          id: string;
          user_id: string;
        }> = await manager.query(
          `INSERT INTO business_memberships
           (business_id, user_id, role, status)
         VALUES
           ($1, $2, 'viewer', 'active'),
           ($1, $3, 'admin', 'active'),
           ($1, $4, 'owner', 'active')
         RETURNING id, user_id`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        memberMembershipId = inserted.find(
          (row) => row.user_id === memberUserId,
        )!.id;

        adminMembershipId = inserted.find(
          (row) => row.user_id === adminUserId,
        )!.id;

        otherOwnerMembershipId = inserted.find(
          (row) => row.user_id === otherOwnerUserId,
        )!.id;
      });
    });

    beforeEach(async () => {
      await assertTestDatabase();

      await dataSource.query(
        `UPDATE business_memberships
       SET role = 'viewer',
           status = 'active',
           removed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
        [memberMembershipId],
      );

      await dataSource.query(
        `UPDATE business_memberships
       SET role = 'admin',
           status = 'active',
           removed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
        [adminMembershipId],
      );
    });

    afterAll(async () => {
      await assertTestDatabase();

      await dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM business_memberships
         WHERE business_id = $1
           AND user_id IN ($2, $3, $4)`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        await manager.query(
          `DELETE FROM users
         WHERE id IN ($1, $2, $3)`,
          [memberUserId, adminUserId, otherOwnerUserId],
        );
      });
    });

    it("allows an owner to suspend an active viewer", async () => {
      const response = await suspendRequest(
        memberMembershipId,
        ownerToken,
      ).expect(201);

      expect(response.body).toMatchObject({
        id: memberMembershipId,
        userId: memberUserId,
        role: "viewer",
        membershipStatus: "suspended",
      });

      const rows: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("suspended");
    });

    it.each(["inventory_manager", "operator", "viewer"])(
      "allows an admin to suspend an active %s",
      async (role) => {
        await dataSource.query(
          `UPDATE business_memberships
         SET role = $1
         WHERE id = $2`,
          [role, memberMembershipId],
        );

        await suspendRequest(memberMembershipId, adminToken).expect(201);
      },
    );

    it("allows an owner to suspend an active admin", async () => {
      const response = await suspendRequest(
        adminMembershipId,
        ownerToken,
      ).expect(201);

      expect(response.body).toMatchObject({
        id: adminMembershipId,
        role: "admin",
        membershipStatus: "suspended",
      });
    });

    it("rejects an admin suspending another admin", async () => {
      await suspendRequest(adminMembershipId, adminToken).expect(403);
    });

    it("rejects self-suspension", async () => {
      await suspendRequest(membershipAId, ownerToken).expect(403);

      await suspendRequest(adminMembershipId, adminToken).expect(403);
    });

    it("protects owner memberships", async () => {
      await suspendRequest(otherOwnerMembershipId, ownerToken).expect(403);

      await suspendRequest(otherOwnerMembershipId, adminToken).expect(403);
    });

    it.each(["pending", "suspended", "removed"])(
      "rejects suspending a %s membership",
      async (status) => {
        await dataSource.query(
          `UPDATE business_memberships
         SET status = $1
         WHERE id = $2`,
          [status, memberMembershipId],
        );

        await suspendRequest(memberMembershipId, ownerToken).expect(409);
      },
    );

    it("does not expose memberships from another business", async () => {
      await suspendRequest(membershipBId, ownerToken).expect(404);
    });

    it("revokes access for an existing JWT after suspension", async () => {
      await suspendRequest(memberMembershipId, ownerToken).expect(201);

      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(401);
    });

    it("preserves the global user status", async () => {
      await suspendRequest(memberMembershipId, ownerToken).expect(201);

      const users: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM users
       WHERE id = $1`,
        [memberUserId],
      );

      expect(users).toHaveLength(1);
      expect(users[0].status).toBe("active");
    });

    it("preserves membership access in another business", async () => {
      const rows: Array<{ id: string }> = await dataSource.query(
        `INSERT INTO business_memberships
         (business_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')
       RETURNING id`,
        [businessBId, memberUserId],
      );

      const otherMembershipId = rows[0].id;

      try {
        await suspendRequest(memberMembershipId, ownerToken).expect(201);

        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${memberToken}`)
          .set("X-Business-Id", businessBId)
          .expect(200);

        const memberships: Array<{ status: string }> = await dataSource.query(
          `SELECT status
         FROM business_memberships
         WHERE id = $1`,
          [otherMembershipId],
        );

        expect(memberships[0].status).toBe("active");
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `DELETE FROM business_memberships
         WHERE id = $1 AND business_id = $2`,
          [otherMembershipId, businessBId],
        );
      }
    });

    it("serializes concurrent suspension requests", async () => {
      const [first, second] = await Promise.all([
        suspendRequest(memberMembershipId, ownerToken),
        suspendRequest(memberMembershipId, ownerToken),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);

      const rows: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("suspended");
    });

    it("rejects unauthenticated suspension requests", async () => {
      await request(app.getHttpServer())
        .post(suspensionEndpoint(memberMembershipId))
        .set("X-Business-Id", businessAId)
        .expect(401);
    });

    it("rejects invalid membership UUIDs", async () => {
      await suspendRequest("invalid-id", ownerToken).expect(400);
    });
  });

  describe("membership reactivation management", () => {
    const memberUserId = randomUUID();
    const adminUserId = randomUUID();
    const otherOwnerUserId = randomUUID();

    let memberMembershipId: string;
    let adminMembershipId: string;
    let otherOwnerMembershipId: string;

    let ownerToken: string;
    let adminToken: string;
    let memberToken: string;

    const reactivateEndpoint = (membershipId: string): string =>
      `/api/business-memberships/${membershipId}/reactivate`;

    const reactivateRequest = (
      membershipId: string,
      token: string,
      businessId = businessAId,
    ) =>
      request(app.getHttpServer())
        .post(reactivateEndpoint(membershipId))
        .set("Authorization", `Bearer ${token}`)
        .set("X-Business-Id", businessId);

    beforeAll(async () => {
      await assertTestDatabase();

      ownerToken = await createTestJwt(userId);
      adminToken = await createTestJwt(adminUserId);
      memberToken = await createTestJwt(memberUserId);

      await dataSource.transaction(async (manager) => {
        for (const temporaryUserId of [
          memberUserId,
          adminUserId,
          otherOwnerUserId,
        ]) {
          await manager.query(
            `INSERT INTO users (id, email, status)
           VALUES ($1, $2, 'active')`,
            [
              temporaryUserId,
              `membership-reactivation-${temporaryUserId}@example.invalid`,
            ],
          );
        }

        const inserted: Array<{
          id: string;
          user_id: string;
        }> = await manager.query(
          `INSERT INTO business_memberships
           (business_id, user_id, role, status)
         VALUES
           ($1, $2, 'viewer', 'suspended'),
           ($1, $3, 'admin', 'suspended'),
           ($1, $4, 'owner', 'suspended')
         RETURNING id, user_id`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        memberMembershipId = inserted.find(
          (row) => row.user_id === memberUserId,
        )!.id;

        adminMembershipId = inserted.find(
          (row) => row.user_id === adminUserId,
        )!.id;

        otherOwnerMembershipId = inserted.find(
          (row) => row.user_id === otherOwnerUserId,
        )!.id;
      });
    });

    beforeEach(async () => {
      await assertTestDatabase();

      await dataSource.query(
        `UPDATE business_memberships
       SET role = 'viewer',
           status = 'suspended',
           removed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
        [memberMembershipId],
      );

      await dataSource.query(
        `UPDATE business_memberships
       SET role = 'admin',
           status = 'active',
           removed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
        [adminMembershipId],
      );
    });

    afterAll(async () => {
      await assertTestDatabase();

      await dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM business_memberships
         WHERE business_id = $1
           AND user_id IN ($2, $3, $4)`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        await manager.query(
          `DELETE FROM users
         WHERE id IN ($1, $2, $3)`,
          [memberUserId, adminUserId, otherOwnerUserId],
        );
      });
    });

    it("allows an owner to reactivate a suspended viewer", async () => {
      const response = await reactivateRequest(
        memberMembershipId,
        ownerToken,
      ).expect(201);

      expect(response.body).toMatchObject({
        id: memberMembershipId,
        userId: memberUserId,
        role: "viewer",
        membershipStatus: "active",
      });

      const rows: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("active");
    });

    it.each(["inventory_manager", "operator", "viewer"])(
      "allows an admin to reactivate a suspended %s",
      async (role) => {
        await dataSource.query(
          `UPDATE business_memberships
         SET role = $1
         WHERE id = $2`,
          [role, memberMembershipId],
        );

        const response = await reactivateRequest(
          memberMembershipId,
          adminToken,
        ).expect(201);

        expect(response.body).toMatchObject({
          role,
          membershipStatus: "active",
        });
      },
    );

    it("allows an owner to reactivate a suspended admin", async () => {
      await dataSource.query(
        `UPDATE business_memberships
       SET status = 'suspended'
       WHERE id = $1`,
        [adminMembershipId],
      );

      const response = await reactivateRequest(
        adminMembershipId,
        ownerToken,
      ).expect(201);

      expect(response.body).toMatchObject({
        id: adminMembershipId,
        role: "admin",
        membershipStatus: "active",
      });
    });

    it("rejects an admin reactivating another admin", async () => {
      const secondAdminUserId = randomUUID();
      let secondAdminMembershipId: string | undefined;

      await assertTestDatabase();

      try {
        await dataSource.transaction(async (manager) => {
          await manager.query(
            `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
            [
              secondAdminUserId,
              `membership-reactivation-admin-${secondAdminUserId}@example.invalid`,
            ],
          );

          const rows: Array<{ id: string }> = await manager.query(
            `INSERT INTO business_memberships
           (business_id, user_id, role, status)
         VALUES ($1, $2, 'admin', 'suspended')
         RETURNING id`,
            [businessAId, secondAdminUserId],
          );

          secondAdminMembershipId = rows[0].id;
        });

        // The acting admin remains active.
        // The target is a different, suspended admin.
        await reactivateRequest(secondAdminMembershipId!, adminToken).expect(
          403,
        );

        const memberships: Array<{ status: string }> = await dataSource.query(
          `SELECT status
         FROM business_memberships
         WHERE id = $1`,
          [secondAdminMembershipId],
        );

        expect(memberships).toHaveLength(1);
        expect(memberships[0].status).toBe("suspended");
      } finally {
        await assertTestDatabase();

        await dataSource.transaction(async (manager) => {
          await manager.query(
            `DELETE FROM business_memberships
         WHERE business_id = $1
           AND user_id = $2`,
            [businessAId, secondAdminUserId],
          );

          await manager.query(
            `DELETE FROM users
         WHERE id = $1`,
            [secondAdminUserId],
          );
        });
      }
    });

    it("rejects self-reactivation", async () => {
      await reactivateRequest(membershipAId, ownerToken).expect(403);

      await reactivateRequest(adminMembershipId, adminToken).expect(403);
    });

    it("protects owner memberships", async () => {
      await reactivateRequest(otherOwnerMembershipId, ownerToken).expect(403);

      await reactivateRequest(otherOwnerMembershipId, adminToken).expect(403);
    });

    it.each(["pending", "active", "removed"])(
      "rejects reactivating a %s membership",
      async (status) => {
        await dataSource.query(
          `UPDATE business_memberships
         SET status = $1
         WHERE id = $2`,
          [status, memberMembershipId],
        );

        await reactivateRequest(memberMembershipId, ownerToken).expect(409);
      },
    );

    it("does not expose memberships from another business", async () => {
      await reactivateRequest(membershipBId, ownerToken).expect(404);
    });

    it("restores access for an existing JWT after reactivation", async () => {
      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(401);

      await reactivateRequest(memberMembershipId, ownerToken).expect(201);

      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(403);
    });

    it("preserves the global user status", async () => {
      await reactivateRequest(memberMembershipId, ownerToken).expect(201);

      const users: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM users
       WHERE id = $1`,
        [memberUserId],
      );

      expect(users).toHaveLength(1);
      expect(users[0].status).toBe("active");
    });

    it("preserves membership access in another business", async () => {
      const rows: Array<{ id: string }> = await dataSource.query(
        `INSERT INTO business_memberships
         (business_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')
       RETURNING id`,
        [businessBId, memberUserId],
      );

      const otherMembershipId = rows[0].id;

      try {
        await reactivateRequest(memberMembershipId, ownerToken).expect(201);

        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${memberToken}`)
          .set("X-Business-Id", businessBId)
          .expect(200);

        const memberships: Array<{ status: string }> = await dataSource.query(
          `SELECT status
         FROM business_memberships
         WHERE id = $1`,
          [otherMembershipId],
        );

        expect(memberships[0].status).toBe("active");
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `DELETE FROM business_memberships
         WHERE id = $1 AND business_id = $2`,
          [otherMembershipId, businessBId],
        );
      }
    });

    it("serializes concurrent reactivation requests", async () => {
      const [first, second] = await Promise.all([
        reactivateRequest(memberMembershipId, ownerToken),
        reactivateRequest(memberMembershipId, ownerToken),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);

      const rows: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("active");
    });

    it("rejects unauthenticated reactivation requests", async () => {
      await request(app.getHttpServer())
        .post(reactivateEndpoint(memberMembershipId))
        .set("X-Business-Id", businessAId)
        .expect(401);
    });

    it("rejects invalid membership UUIDs", async () => {
      await reactivateRequest("invalid-id", ownerToken).expect(400);
    });
  });

  describe("membership removal management", () => {
    const memberUserId = randomUUID();
    const adminUserId = randomUUID();
    const otherOwnerUserId = randomUUID();

    let memberMembershipId: string;
    let adminMembershipId: string;
    let otherOwnerMembershipId: string;

    let ownerToken: string;
    let adminToken: string;
    let memberToken: string;

    const removeEndpoint = (membershipId: string): string =>
      `/api/business-memberships/${membershipId}/remove`;

    const removeRequest = (
      membershipId: string,
      token: string,
      businessId = businessAId,
    ) =>
      request(app.getHttpServer())
        .post(removeEndpoint(membershipId))
        .set("Authorization", `Bearer ${token}`)
        .set("X-Business-Id", businessId);

    beforeAll(async () => {
      await assertTestDatabase();

      ownerToken = await createTestJwt(userId);
      adminToken = await createTestJwt(adminUserId);
      memberToken = await createTestJwt(memberUserId);

      await dataSource.transaction(async (manager) => {
        for (const temporaryUserId of [
          memberUserId,
          adminUserId,
          otherOwnerUserId,
        ]) {
          await manager.query(
            `INSERT INTO users (id, email, status)
           VALUES ($1, $2, 'active')`,
            [
              temporaryUserId,
              `membership-removal-${temporaryUserId}@example.invalid`,
            ],
          );
        }

        const inserted: Array<{
          id: string;
          user_id: string;
        }> = await manager.query(
          `INSERT INTO business_memberships
           (business_id, user_id, role, status)
         VALUES
           ($1, $2, 'viewer', 'active'),
           ($1, $3, 'admin', 'active'),
           ($1, $4, 'owner', 'active')
         RETURNING id, user_id`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        memberMembershipId = inserted.find(
          (row) => row.user_id === memberUserId,
        )!.id;

        adminMembershipId = inserted.find(
          (row) => row.user_id === adminUserId,
        )!.id;

        otherOwnerMembershipId = inserted.find(
          (row) => row.user_id === otherOwnerUserId,
        )!.id;
      });
    });

    beforeEach(async () => {
      await assertTestDatabase();

      await dataSource.query(
        `UPDATE business_memberships
       SET role = 'viewer',
           status = 'active',
           removed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
        [memberMembershipId],
      );

      await dataSource.query(
        `UPDATE business_memberships
       SET role = 'admin',
           status = 'active',
           removed_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
        [adminMembershipId],
      );
    });

    afterAll(async () => {
      await assertTestDatabase();

      await dataSource.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM business_memberships
         WHERE business_id = $1
           AND user_id IN ($2, $3, $4)`,
          [businessAId, memberUserId, adminUserId, otherOwnerUserId],
        );

        await manager.query(
          `DELETE FROM users
         WHERE id IN ($1, $2, $3)`,
          [memberUserId, adminUserId, otherOwnerUserId],
        );
      });
    });

    it("allows an owner to remove an active viewer", async () => {
      const response = await removeRequest(
        memberMembershipId,
        ownerToken,
      ).expect(201);

      expect(response.body).toMatchObject({
        id: memberMembershipId,
        userId: memberUserId,
        role: "viewer",
        membershipStatus: "removed",
      });

      expect(response.body.removedAt).toBeTruthy();

      const rows: Array<{
        status: string;
        removed_at: Date | null;
      }> = await dataSource.query(
        `SELECT status, removed_at
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("removed");
      expect(rows[0].removed_at).toBeInstanceOf(Date);
    });

    it("allows an owner to remove a suspended membership", async () => {
      await dataSource.query(
        `UPDATE business_memberships
       SET status = 'suspended'
       WHERE id = $1`,
        [memberMembershipId],
      );

      const response = await removeRequest(
        memberMembershipId,
        ownerToken,
      ).expect(201);

      expect(response.body).toMatchObject({
        membershipStatus: "removed",
      });
    });

    it.each(["admin", "inventory_manager", "operator", "viewer"])(
      "allows an owner to remove an active %s",
      async (role) => {
        await dataSource.query(
          `UPDATE business_memberships
         SET role = $1
         WHERE id = $2`,
          [role, memberMembershipId],
        );

        const response = await removeRequest(
          memberMembershipId,
          ownerToken,
        ).expect(201);

        expect(response.body).toMatchObject({
          role,
          membershipStatus: "removed",
        });
      },
    );

    it("rejects removal by an admin", async () => {
      await removeRequest(memberMembershipId, adminToken).expect(403);
    });

    it("rejects self-removal", async () => {
      await removeRequest(membershipAId, ownerToken).expect(403);
    });

    it("protects other owner memberships", async () => {
      await removeRequest(otherOwnerMembershipId, ownerToken).expect(403);
    });

    it.each(["pending", "removed"])(
      "rejects removing a %s membership",
      async (status) => {
        await dataSource.query(
          `UPDATE business_memberships
         SET status = $1
         WHERE id = $2`,
          [status, memberMembershipId],
        );

        await removeRequest(memberMembershipId, ownerToken).expect(409);
      },
    );

    it("does not expose memberships from another business", async () => {
      await removeRequest(membershipBId, ownerToken).expect(404);
    });

    it("records removal timestamps", async () => {
      const beforeRemoval = new Date();

      const response = await removeRequest(
        memberMembershipId,
        ownerToken,
      ).expect(201);

      const afterRemoval = new Date();

      const rows: Array<{
        created_at: Date;
        updated_at: Date;
        removed_at: Date;
      }> = await dataSource.query(
        `SELECT created_at, updated_at, removed_at
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);

      expect(rows[0].removed_at.getTime()).toBeGreaterThanOrEqual(
        beforeRemoval.getTime(),
      );

      expect(rows[0].removed_at.getTime()).toBeLessThanOrEqual(
        afterRemoval.getTime(),
      );

      expect(rows[0].updated_at.getTime()).toBeGreaterThanOrEqual(
        beforeRemoval.getTime(),
      );

      expect(response.body.removedAt).toBeTruthy();
    });

    it("revokes access for an existing JWT after removal", async () => {
      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(403);

      await removeRequest(memberMembershipId, ownerToken).expect(201);

      await request(app.getHttpServer())
        .get("/api/business-memberships")
        .set("Authorization", `Bearer ${memberToken}`)
        .set("X-Business-Id", businessAId)
        .expect(401);
    });

    it("preserves the global user account", async () => {
      await removeRequest(memberMembershipId, ownerToken).expect(201);

      const users: Array<{ status: string }> = await dataSource.query(
        `SELECT status
       FROM users
       WHERE id = $1`,
        [memberUserId],
      );

      expect(users).toHaveLength(1);
      expect(users[0].status).toBe("active");
    });

    it("preserves membership access in another business", async () => {
      const rows: Array<{ id: string }> = await dataSource.query(
        `INSERT INTO business_memberships
         (business_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')
       RETURNING id`,
        [businessBId, memberUserId],
      );

      const otherMembershipId = rows[0].id;

      try {
        await removeRequest(memberMembershipId, ownerToken).expect(201);

        await request(app.getHttpServer())
          .get("/api/business-memberships")
          .set("Authorization", `Bearer ${memberToken}`)
          .set("X-Business-Id", businessBId)
          .expect(200);

        const memberships: Array<{
          status: string;
          role: string;
        }> = await dataSource.query(
          `SELECT status, role
         FROM business_memberships
         WHERE id = $1`,
          [otherMembershipId],
        );

        expect(memberships).toHaveLength(1);
        expect(memberships[0]).toEqual({
          status: "active",
          role: "admin",
        });
      } finally {
        await assertTestDatabase();

        await dataSource.query(
          `DELETE FROM business_memberships
         WHERE id = $1 AND business_id = $2`,
          [otherMembershipId, businessBId],
        );
      }
    });

    it("prevents reactivation after removal", async () => {
      await removeRequest(memberMembershipId, ownerToken).expect(201);

      await request(app.getHttpServer())
        .post(`/api/business-memberships/${memberMembershipId}/reactivate`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .expect(409);
    });

    it("prevents suspension after removal", async () => {
      await removeRequest(memberMembershipId, ownerToken).expect(201);

      await request(app.getHttpServer())
        .post(`/api/business-memberships/${memberMembershipId}/suspend`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .expect(409);
    });

    it("prevents role changes after removal", async () => {
      await removeRequest(memberMembershipId, ownerToken).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/business-memberships/${memberMembershipId}/role`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("X-Business-Id", businessAId)
        .send({ role: "operator" })
        .expect(409);
    });

    it("serializes concurrent removal requests", async () => {
      const [first, second] = await Promise.all([
        removeRequest(memberMembershipId, ownerToken),
        removeRequest(memberMembershipId, ownerToken),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);

      const rows: Array<{
        status: string;
        removed_at: Date | null;
      }> = await dataSource.query(
        `SELECT status, removed_at
       FROM business_memberships
       WHERE id = $1`,
        [memberMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("removed");
      expect(rows[0].removed_at).toBeInstanceOf(Date);
    });

    it("rejects unauthenticated removal requests", async () => {
      await request(app.getHttpServer())
        .post(removeEndpoint(memberMembershipId))
        .set("X-Business-Id", businessAId)
        .expect(401);
    });

    it("rejects invalid membership UUIDs", async () => {
      await removeRequest("invalid-id", ownerToken).expect(400);
    });
  });
});
