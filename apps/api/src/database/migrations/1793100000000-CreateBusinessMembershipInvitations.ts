import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBusinessMembershipInvitations1793100000000
  implements MigrationInterface
{
  name = 'CreateBusinessMembershipInvitations1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE business_membership_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        business_id UUID NOT NULL
          REFERENCES businesses(id) ON DELETE RESTRICT,

        invited_email VARCHAR(320) NOT NULL,

        role VARCHAR(30) NOT NULL,

        token_hash VARCHAR(64) NOT NULL UNIQUE,

        invited_by_user_id UUID NOT NULL
          REFERENCES users(id) ON DELETE RESTRICT,

        expires_at TIMESTAMPTZ NOT NULL,

        accepted_at TIMESTAMPTZ,

        revoked_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT business_membership_invitations_role_check
          CHECK (
            role IN (
              'admin',
              'inventory_manager',
              'operator',
              'viewer'
            )
          ),

        CONSTRAINT business_membership_invitations_email_check
          CHECK (
            invited_email = LOWER(TRIM(invited_email))
            AND LENGTH(invited_email) > 0
          ),

        CONSTRAINT business_membership_invitations_expiration_check
          CHECK (expires_at > created_at),

        CONSTRAINT business_membership_invitations_acceptance_check
          CHECK (
            accepted_at IS NULL
            OR accepted_at >= created_at
          ),

        CONSTRAINT business_membership_invitations_revocation_check
          CHECK (
            revoked_at IS NULL
            OR revoked_at >= created_at
          ),

        CONSTRAINT business_membership_invitations_terminal_state_check
          CHECK (
            accepted_at IS NULL
            OR revoked_at IS NULL
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX business_membership_invitations_business_idx
      ON business_membership_invitations (business_id)
    `);

    await queryRunner.query(`
      CREATE INDEX business_membership_invitations_expires_at_idx
      ON business_membership_invitations (expires_at)
    `);

    await queryRunner.query(`
      CREATE INDEX business_membership_invitations_invited_by_idx
      ON business_membership_invitations (invited_by_user_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX business_membership_invitations_pending_unique_idx
      ON business_membership_invitations (
        business_id,
        LOWER(invited_email)
      )
      WHERE accepted_at IS NULL
        AND revoked_at IS NULL
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'Automatic rollback is disabled for business membership invitations. ' +
        'A reviewed data-preserving rollback plan is required.',
    );
  }
}