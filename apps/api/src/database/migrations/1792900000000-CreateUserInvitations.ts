import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserInvitations1792900000000
  implements MigrationInterface
{
  name = 'CreateUserInvitations1792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id UUID NOT NULL
          REFERENCES users(id) ON DELETE RESTRICT,

        token_hash VARCHAR(64) NOT NULL UNIQUE,

        expires_at TIMESTAMPTZ NOT NULL,

        consumed_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        CONSTRAINT user_invitations_expiration_check
          CHECK (expires_at > created_at),

        CONSTRAINT user_invitations_consumption_check
          CHECK (
            consumed_at IS NULL
            OR consumed_at >= created_at
          )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX user_invitations_user_id_idx
      ON user_invitations (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX user_invitations_expires_at_idx
      ON user_invitations (expires_at)
    `);
  }

  public async down(): Promise<void> {
    throw new Error(
      'Automatic rollback is disabled for user invitations. ' +
      'A reviewed data-preserving rollback plan is required.',
    );
  }
}
