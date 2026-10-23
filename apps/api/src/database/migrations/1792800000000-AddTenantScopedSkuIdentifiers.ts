import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopedSkuIdentifiers1792800000000
  implements MigrationInterface
{
  name = 'AddTenantScopedSkuIdentifiers1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * STEP 1: Introduce an internal UUID identifier.
     *
     * Existing inventory records automatically receive UUIDs.
     * Future records receive UUIDs through the default.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_skus
      ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid()
    `);

    /**
     * STEP 2: Remove the original SKU-only foreign key.
     *
     * We retain inventory_movements_business_sku_fkey,
     * which validates both business_id and sku.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP CONSTRAINT inventory_movements_sku_fkey
    `);

    /**
     * STEP 3: Replace the global SKU primary key.
     *
     * The existing UNIQUE (business_id, sku) constraint
     * remains unchanged.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_skus
      DROP CONSTRAINT inventory_skus_pkey
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_skus
      ADD CONSTRAINT inventory_skus_pkey PRIMARY KEY (id)
    `);
  }

  public async down(): Promise<void> {
    /**
     * Safety-first rollback.
     *
     * Once multiple businesses can use identical SKU codes,
     * restoring PRIMARY KEY (sku) may become impossible.
     *
     * Never remove UUID identifiers automatically.
     */
    throw new Error(
      'Automatic rollback is disabled for tenant-scoped SKU identifiers. A reviewed data-preserving rollback plan is required.',
    );
  }
}
