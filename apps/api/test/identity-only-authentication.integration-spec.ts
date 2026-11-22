import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import * as request from "supertest";
import { DataSource } from "typeorm";

import { AppModule } from "../src/modules/app.module";
import { IdentityOnly } from "../src/modules/auth/decorators/identity-only.decorator";
import { assertSafeTestDatabase } from "./helpers/assert-safe-test-database";
import { createTestJwt } from "./helpers/create-test-jwt";

/**
 * Test-only endpoint for verifying identity-only authentication.
 * This controller is not registered in the production application.
 */
@Controller("test-identity")
class IdentityOnlyTestController {
  @Get()
  @IdentityOnly()
  getIdentity() {
    return {
      authenticated: true,
    };
  }
}

describe("Identity-only authentication HTTP integration", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const safeDatabaseUrl = assertSafeTestDatabase(
      process.env.TEST_DATABASE_URL,
    );

    if (process.env.DATABASE_URL !== safeDatabaseUrl) {
      throw new Error(
        "Identity-only integration tests must use the isolated test database.",
      );
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [IdentityOnlyTestController],
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

    const configuredWorkbook = app
      .get(ConfigService)
      .get<string>("FIMONAA_SKU_WORKBOOK_PATH");

    const expectedWorkbook = resolve(
      __dirname,
      "fixtures/opening-balance-test.xlsx",
    );

    if (configuredWorkbook !== expectedWorkbook) {
      throw new Error(
        "Integration tests must use the synthetic workbook exclusively.",
      );
    }

    const databaseRows: Array<{ database_name: string }> =
      await dataSource.query("SELECT current_database() AS database_name");

    if (databaseRows[0].database_name !== "fimonaa_commerce_import_test") {
      throw new Error("Integration tests connected to an unsafe database.");
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("allows an active user without business membership", async () => {
    const userId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
       VALUES ($1, $2, 'active')`,
        [userId, `identity-test-${userId}@example.invalid`],
      );

      const token = await createTestJwt(userId);

      const response = await request(app.getHttpServer())
        .get("/api/test-identity")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        authenticated: true,
      });

      // The same identity must not grant access to business inventory.
      await request(app.getHttpServer())
        .get("/api/inventory")
        .set("Authorization", `Bearer ${token}`)
        .set("X-Business-Id", randomUUID())
        .expect(401);
    } finally {
      await dataSource.query("DELETE FROM users WHERE id = $1", [userId]);
    }
  });

  it("rejects identity-only requests without a JWT", async () => {
    await request(app.getHttpServer()).get("/api/test-identity").expect(401);
  });

  it("rejects identity-only requests with an invalid JWT", async () => {
    await request(app.getHttpServer())
      .get("/api/test-identity")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });

  it("rejects disabled users despite a valid JWT", async () => {
    const userId = randomUUID();

    try {
      await dataSource.query(
        `INSERT INTO users (id, email, status)
       VALUES ($1, $2, 'active')`,
        [userId, `identity-disabled-${userId}@example.invalid`],
      );

      const token = await createTestJwt(userId);

      // Verify that the user can initially authenticate.
      await request(app.getHttpServer())
        .get("/api/test-identity")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Disable the account after the JWT has been issued.
      await dataSource.query(
        `UPDATE users
       SET status = 'disabled'
       WHERE id = $1`,
        [userId],
      );

      // The existing JWT must no longer grant access.
      const response = await request(app.getHttpServer())
        .get("/api/test-identity")
        .set("Authorization", `Bearer ${token}`)
        .expect(401);

      expect(response.body.message).toBe("User is not active");
    } finally {
      await dataSource.query("DELETE FROM users WHERE id = $1", [userId]);
    }
  });

  it("rejects expired JWTs on identity-only endpoints", async () => {
    const userId = randomUUID();

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 64) {
      throw new Error("Integration-test JWT secret is missing or invalid.");
    }

    const jwtService = new JwtService({
      secret,
      signOptions: {
        algorithm: "HS256",
      },
    });

    const now = Math.floor(Date.now() / 1000);

    const expiredToken = await jwtService.signAsync({
      sub: userId,
      iat: now - 120,
      exp: now - 60,
    });

    await request(app.getHttpServer())
      .get("/api/test-identity")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);
  });
});
