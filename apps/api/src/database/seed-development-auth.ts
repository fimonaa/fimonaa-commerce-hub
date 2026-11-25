import dataSource from "./data-source";
import { PasswordHashingService } from "../modules/auth/password-hashing.service";
import { validateLocalDevDatabase } from "../../scripts/validate-local-dev-database.cjs";

const businesses = [
  { name: "Commerce Demo A", slug: "commerce-demo-a" },
  { name: "Commerce Demo B", slug: "commerce-demo-b" },
] as const;

const users = [
  { email: "owner@commerce-demo.test" },
  { email: "employee@commerce-demo.test" },
  { email: "multi@commerce-demo.test" },
  { email: "nomembership@commerce-demo.test" },
] as const;

const memberships = [
  {
    email: "owner@commerce-demo.test",
    businessSlug: "commerce-demo-a",
    role: "owner",
  },
  {
    email: "employee@commerce-demo.test",
    businessSlug: "commerce-demo-a",
    role: "inventory_manager",
  },
  {
    email: "multi@commerce-demo.test",
    businessSlug: "commerce-demo-a",
    role: "viewer",
  },
  {
    email: "multi@commerce-demo.test",
    businessSlug: "commerce-demo-b",
    role: "admin",
  },
] as const;

async function seedDevelopmentAuth(): Promise<void> {
  /**
   * Apply the same database safety policy used by the development
   * launcher before initializing TypeORM or modifying any records.
   */
  validateLocalDevDatabase(process.env.DATABASE_URL);

  const password = process.env.DEV_AUTH_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("DEV_AUTH_PASSWORD must contain at least 12 characters.");
  }

  await dataSource.initialize();

  try {
    const hashing = new PasswordHashingService();
    const passwordHash = await hashing.hash(password);

    await dataSource.transaction(async (manager) => {
      for (const business of businesses) {
        await manager.query(
          `
            INSERT INTO businesses (name, slug, status)
            VALUES ($1, $2, 'active')
            ON CONFLICT (slug) DO NOTHING
          `,
          [business.name, business.slug],
        );

        const rows: Array<{ name: string; status: string }> =
          await manager.query(
            `
              SELECT name, status
              FROM businesses
              WHERE slug = $1
            `,
            [business.slug],
          );

        if (
          rows.length !== 1 ||
          rows[0].name !== business.name ||
          rows[0].status !== "active"
        ) {
          throw new Error(`Conflicting business fixture: ${business.slug}`);
        }
      }

      for (const user of users) {
        await manager.query(
          `
            INSERT INTO users (email, password_hash, status)
            VALUES ($1, $2, 'active')
            ON CONFLICT DO NOTHING
          `,
          [user.email, passwordHash],
        );

        const rows: Array<{
          email: string;
          status: string;
          password_hash: string | null;
        }> = await manager.query(
          `
    SELECT email, status, password_hash
    FROM users
    WHERE LOWER(email) = $1
  `,
          [user.email],
        );

        if (
          rows.length !== 1 ||
          rows[0].email !== user.email ||
          rows[0].status !== "active" ||
          !rows[0].password_hash ||
          !(await hashing.verify(rows[0].password_hash, password))
        ) {
          throw new Error(`Conflicting user fixture: ${user.email}`);
        }
      }

      for (const membership of memberships) {
        // Insert the membership without modifying existing records.
        await manager.query(
          `
      INSERT INTO business_memberships (
        business_id,
        user_id,
        role,
        status
      )
      SELECT
        business.id,
        app_user.id,
        $3,
        'active'
      FROM businesses AS business
      CROSS JOIN users AS app_user
      WHERE business.slug = $2
        AND LOWER(app_user.email) = $1
      ON CONFLICT (business_id, user_id) DO NOTHING
    `,
          [membership.email, membership.businessSlug, membership.role],
        );

        // Verify the membership in a separate SQL statement.
        const rows: Array<{
          role: string;
          status: string;
        }> = await manager.query(
          `
      SELECT
        membership.role,
        membership.status
      FROM business_memberships AS membership
      JOIN businesses AS business
        ON business.id = membership.business_id
      JOIN users AS app_user
        ON app_user.id = membership.user_id
      WHERE business.slug = $2
        AND LOWER(app_user.email) = $1
    `,
          [membership.email, membership.businessSlug],
        );

        if (
          rows.length !== 1 ||
          rows[0].role !== membership.role ||
          rows[0].status !== "active"
        ) {
          throw new Error(
            `Conflicting membership fixture: ${membership.email}`,
          );
        }
      }

      const unexpectedMemberships: Array<{ count: string }> =
        await manager.query(
          `
      SELECT COUNT(*)::text AS count
      FROM business_memberships AS membership
      JOIN users AS app_user
        ON app_user.id = membership.user_id
      WHERE LOWER(app_user.email) = ANY($1::text[])
        AND NOT EXISTS (
          SELECT 1
          FROM (
            VALUES
              ('owner@commerce-demo.test', 'commerce-demo-a'),
              ('employee@commerce-demo.test', 'commerce-demo-a'),
              ('multi@commerce-demo.test', 'commerce-demo-a'),
              ('multi@commerce-demo.test', 'commerce-demo-b')
          ) AS expected(email, slug)
          JOIN businesses AS business
            ON business.slug = expected.slug
          WHERE expected.email = LOWER(app_user.email)
            AND business.id = membership.business_id
        )
    `,
          [users.map((user) => user.email)],
        );

      if (unexpectedMemberships[0]?.count !== "0") {
        throw new Error(
          "Unexpected memberships exist for development fixture users.",
        );
      }
    });

    console.log("Development authentication fixtures created successfully.");
    console.log("Businesses: 2");
    console.log("Users: 4");
    console.log("Expected fixture memberships: 4");
  } finally {
    await dataSource.destroy();
  }
}

/**
 * Report seed failures without printing database connection
 * details, SQL parameters, or authentication credentials.
 */
seedDevelopmentAuth().catch(() => {
  console.error(
    "Development authentication seed failed. Check the database configuration and fixture consistency.",
  );

  process.exitCode = 1;
});
