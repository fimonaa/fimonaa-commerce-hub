import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * Creates the foundational business workspace and user membership schema.
 *
 * This migration deliberately does not modify inventory tables.
 * Existing inventory records will be associated with a business in a
 * separate migration after the workspace schema has been reviewed.
 *
 * Passwords are represented by password_hash. Authentication and password
 * hashing will be implemented in the authentication module, not here.
 */
export class CreateBusinessWorkspace1761070000000
  implements MigrationInterface
{
  name = 'CreateBusinessWorkspace1761070000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Store each business independently so the application can support
    // multiple businesses without creating a separate database per business.
    await queryRunner.query(`
      CREATE TABLE businesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'suspended', 'archived')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Keep user identity separate from business membership. A user can
    // eventually belong to several businesses with different roles.
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(254) NOT NULL,
        password_hash TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'invited'
          CHECK (status IN ('invited', 'active', 'disabled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Store email addresses in a consistent case-insensitive format.
    // This unique index prevents accounts differing only by email case.
    await queryRunner.query(`
      CREATE UNIQUE INDEX users_email_lower_unique
      ON users (LOWER(email))
    `);
    // A membership grants a particular user access to one business.
    // Roles are scoped to the membership, not globally to the user.
    await queryRunner.query(`
      CREATE TABLE business_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID NOT NULL
          REFERENCES businesses(id) ON DELETE RESTRICT,
        user_id UUID NOT NULL
          REFERENCES users(id) ON DELETE RESTRICT,
        role VARCHAR(30) NOT NULL
          CHECK (
            role IN (
              'owner',
              'admin',
              'inventory_manager',
              'operator',
              'viewer'
            )
          ),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (business_id, user_id)
      )
    `);
    // Support efficient membership lookups when resolving a user's
    // accessible businesses.
    await queryRunner.query(`
      CREATE INDEX business_memberships_user_id_idx
      ON business_memberships (user_id)
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the dependency order so foreign-key references are removed
    // before their parent tables.
    await queryRunner.query('DROP TABLE business_memberships');
    await queryRunner.query('DROP INDEX users_email_lower_unique');
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TABLE businesses');
  }
}