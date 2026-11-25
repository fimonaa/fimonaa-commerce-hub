import { randomUUID } from "node:crypto";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { DataSource } from "typeorm";

import { AppModule } from "../src/modules/app.module";
import { assertSafeTestDatabase } from "./helpers/assert-safe-test-database";
import { createTestJwt } from "./helpers/create-test-jwt";

describe("My businesses HTTP integration", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testDataCreated = false;

  const userId = randomUUID();
  const otherUserId = randomUUID();

  const activeBusinessId = randomUUID();
  const secondBusinessId = randomUUID();
  const suspendedMembershipBusinessId = randomUUID();
  const pendingMembershipBusinessId = randomUUID();
  const removedMembershipBusinessId = randomUUID();
  const suspendedBusinessId = randomUUID();
  const archivedBusinessId = randomUUID();
  const otherUserBusinessId = randomUUID();

  const businessIds = [
    activeBusinessId,
    secondBusinessId,
    suspendedMembershipBusinessId,
    pendingMembershipBusinessId,
    removedMembershipBusinessId,
    suspendedBusinessId,
    archivedBusinessId,
    otherUserBusinessId,
  ];

  const assertTestDatabase = async (): Promise<void> => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error("Unsafe integration-test database configuration.");
    }

    const rows: Array<{ database_name: string }> = await dataSource.query(
      "SELECT current_database() AS database_name",
    );

    if (rows[0]?.database_name !== "fimonaa_commerce_import_test") {
      throw new Error("Integration test connected to an unsafe database.");
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
         VALUES
           ($1, $3, 'active'),
           ($2, $4, 'active')`,
        [
          userId,
          otherUserId,
          `my-businesses-${userId}@example.invalid`,
          `my-businesses-${otherUserId}@example.invalid`,
        ],
      );

      for (const [index, businessId] of businessIds.entries()) {
        const status =
          businessId === suspendedBusinessId
            ? "suspended"
            : businessId === archivedBusinessId
              ? "archived"
              : "active";

        await manager.query(
          `INSERT INTO businesses (id, name, slug, status)
           VALUES ($1, $2, $3, $4)`,
          [
            businessId,
            `Workspace ${String(index + 1).padStart(2, "0")}`,
            `workspace-test-${businessId}`,
            status,
          ],
        );
      }

      const memberships = [
        [activeBusinessId, userId, "owner", "active"],
        [secondBusinessId, userId, "admin", "active"],
        [suspendedMembershipBusinessId, userId, "viewer", "suspended"],
        [pendingMembershipBusinessId, userId, "viewer", "pending"],
        [removedMembershipBusinessId, userId, "viewer", "removed"],
        [suspendedBusinessId, userId, "viewer", "active"],
        [archivedBusinessId, userId, "viewer", "active"],
        [otherUserBusinessId, otherUserId, "owner", "active"],
      ];

      for (const [businessId, memberUserId, role, status] of memberships) {
        await manager.query(
          `INSERT INTO business_memberships
             (business_id, user_id, role, status)
           VALUES ($1, $2, $3, $4)`,
          [businessId, memberUserId, role, status],
        );
      }
    });
    testDataCreated = true;
  });

  afterAll(async () => {
    try {
      if (dataSource?.isInitialized && testDataCreated) {
        await assertTestDatabase();

        await dataSource.transaction(async (manager) => {
          await manager.query(
            `DELETE FROM business_memberships
             WHERE business_id = ANY($1::uuid[])`,
            [businessIds],
          );

          await manager.query(
            `DELETE FROM businesses
             WHERE id = ANY($1::uuid[])`,
            [businessIds],
          );

          await manager.query(
            `DELETE FROM users
             WHERE id IN ($1, $2)`,
            [userId, otherUserId],
          );
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("returns only active businesses with active memberships", async () => {
    const token = await createTestJwt(userId);

    const response = await request(app.getHttpServer())
      .get("/api/auth/my-businesses")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);

    expect(response.body.data).toEqual([
      {
        id: activeBusinessId,
        name: "Workspace 01",
        slug: `workspace-test-${activeBusinessId}`,
        role: "owner",
      },
      {
        id: secondBusinessId,
        name: "Workspace 02",
        slug: `workspace-test-${secondBusinessId}`,
        role: "admin",
      },
    ]);
  });

  it("does not require X-Business-Id", async () => {
    const token = await createTestJwt(userId);

    await request(app.getHttpServer())
      .get("/api/auth/my-businesses")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("does not expose another user businesses", async () => {
    const token = await createTestJwt(userId);

    const response = await request(app.getHttpServer())
      .get("/api/auth/my-businesses")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: otherUserBusinessId,
        }),
      ]),
    );
  });

  it("returns an empty list for users without memberships", async () => {
    const emptyUserId = randomUUID();

    try {
      await assertTestDatabase();

      await dataSource.query(
        `INSERT INTO users (id, email, status)
         VALUES ($1, $2, 'active')`,
        [emptyUserId, `my-businesses-empty-${emptyUserId}@example.invalid`],
      );

      const token = await createTestJwt(emptyUserId);

      const response = await request(app.getHttpServer())
        .get("/api/auth/my-businesses")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ data: [] });
    } finally {
      await assertTestDatabase();

      await dataSource.query("DELETE FROM users WHERE id = $1", [emptyUserId]);
    }
  });

  it("rejects requests without a JWT", async () => {
    await request(app.getHttpServer())
      .get("/api/auth/my-businesses")
      .expect(401);
  });

  it("rejects invalid JWTs", async () => {
    await request(app.getHttpServer())
      .get("/api/auth/my-businesses")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });

  it("sets Cache-Control to no-store", async () => {
    const token = await createTestJwt(userId);

    const response = await request(app.getHttpServer())
      .get("/api/auth/my-businesses")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
