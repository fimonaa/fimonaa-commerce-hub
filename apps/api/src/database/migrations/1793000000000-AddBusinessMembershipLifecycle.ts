import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessMembershipLifecycle1793000000000
  implements MigrationInterface
{
  name = 'AddBusinessMembershipLifecycle1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE business_memberships
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'
        CONSTRAINT business_memberships_status_check
        CHECK (status IN ('pending', 'active', 'suspended', 'removed'))
    `);

    await queryRunner.query(`
      ALTER TABLE business_memberships
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await queryRunner.query(`
      ALTER TABLE business_memberships
      ADD COLUMN removed_at TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE INDEX business_memberships_business_status_idx
      ON business_memberships (business_id, status)
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'Automatic rollback is disabled for membership lifecycle changes. ' +
      'A reviewed data-preserving rollback plan is required.',
    );
  }
}