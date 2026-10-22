import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds business ownership to the inventory tables.
 *
 * Supports two scenarios:
 *
 * 1. Existing Fimonaa installation:
 *    Historical inventory is assigned to Fimonaa India.
 *
 * 2. Fresh SaaS installation:
 *    Empty inventory tables are migrated without requiring
 *    any predefined business.
 *
 * This migration does not modify stock quantities or delete
 * inventory records.
 *
 * Composite foreign keys ensure inventory movements belong
 * to the same business as their referenced SKU.
 */
export class AddBusinessOwnershipToInventory1792600000000
  implements MigrationInterface
{
  name = 'AddBusinessOwnershipToInventory1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * STEP 1: Detect historical inventory.
     *
     * Fresh SaaS installations have empty inventory tables.
     * They should not require Fimonaa India or Finland.
     */
    const existingInventory: Array<{ count: string }> =
      await queryRunner.query(`
        SELECT (
          (SELECT COUNT(*) FROM inventory_skus) +
          (SELECT COUNT(*) FROM inventory_movements)
        )::text AS count
      `);

    const hasHistoricalInventory =
      Number(existingInventory[0].count) > 0;

    let indiaBusinessId: string | null = null;

    /**
     * STEP 2: Resolve the historical inventory owner.
     *
     * Only legacy Fimonaa installations require the
     * Fimonaa India workspace.
     */
    if (hasHistoricalInventory) {
      const businesses: Array<{ id: string }> =
        await queryRunner.query(
          `
            SELECT id
            FROM businesses
            WHERE slug = $1
          `,
          ['fimonaa-india'],
        );

      if (businesses.length !== 1) {
        throw new Error(
          'Historical inventory exists, but the Fimonaa India ' +
            'workspace is missing. Bootstrap the original ' +
            'business before migrating.',
        );
      }

      indiaBusinessId = businesses[0].id;
    }

    /**
     * STEP 3: Add nullable business ownership columns.
     *
     * Existing records must be backfilled before these
     * columns become mandatory.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_skus
      ADD COLUMN business_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD COLUMN business_id UUID
    `);

    /**
     * STEP 4: Assign historical SKUs to Fimonaa India.
     *
     * On fresh installations, this UPDATE affects zero rows.
     */
    if (hasHistoricalInventory) {
      await queryRunner.query(
        `
          UPDATE inventory_skus
          SET business_id = $1
        `,
        [indiaBusinessId],
      );
    }

    /**
     * STEP 5: Assign movement ownership using the SKU.
     *
     * This preserves the relationship between each
     * movement and its inventory record.
     */
    await queryRunner.query(`
      UPDATE inventory_movements AS movement
      SET business_id = sku.business_id
      FROM inventory_skus AS sku
      WHERE movement.sku = sku.sku
    `);

    /**
     * STEP 6: Verify that every historical record
     * has a business owner.
     */
    const missingOwnership: Array<{ count: string }> =
      await queryRunner.query(`
        SELECT (
          (SELECT COUNT(*) FROM inventory_skus WHERE business_id IS NULL) +
          (SELECT COUNT(*) FROM inventory_movements WHERE business_id IS NULL)
        )::text AS count
      `);

    if (Number(missingOwnership[0].count) !== 0) {
      throw new Error(
        'Some inventory records could not be assigned to a business.',
      );
    }

    /**
     * STEP 7: Make business ownership mandatory.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_skus
      ALTER COLUMN business_id SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ALTER COLUMN business_id SET NOT NULL
    `);

    /**
     * STEP 8: Add foreign keys to businesses.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_skus
      ADD CONSTRAINT inventory_skus_business_id_fkey
      FOREIGN KEY (business_id)
      REFERENCES businesses(id)
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD CONSTRAINT inventory_movements_business_id_fkey
      FOREIGN KEY (business_id)
      REFERENCES businesses(id)
      ON DELETE RESTRICT
    `);

    /**
     * STEP 9: Enforce business-specific SKU references.
     *
     * The existing global SKU primary key remains unchanged.
     * Allowing duplicate SKU codes across businesses will
     * require a separate migration.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_skus
      ADD CONSTRAINT inventory_skus_business_sku_unique
      UNIQUE (business_id, sku)
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD CONSTRAINT inventory_movements_business_sku_fkey
      FOREIGN KEY (business_id, sku)
      REFERENCES inventory_skus(business_id, sku)
      ON DELETE RESTRICT
    `);

    /**
     * STEP 10: Create indexes for business-scoped queries.
     */
    await queryRunner.query(`
      CREATE INDEX inventory_skus_business_id_idx
      ON inventory_skus (business_id)
    `);

    await queryRunner.query(`
      CREATE INDEX inventory_movements_business_id_idx
      ON inventory_movements (business_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * Reverse schema changes without deleting inventory.
     */
    await queryRunner.query(`
      DROP INDEX inventory_movements_business_id_idx
    `);

    await queryRunner.query(`
      DROP INDEX inventory_skus_business_id_idx
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP CONSTRAINT inventory_movements_business_sku_fkey
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_skus
      DROP CONSTRAINT inventory_skus_business_sku_unique
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP CONSTRAINT inventory_movements_business_id_fkey
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_skus
      DROP CONSTRAINT inventory_skus_business_id_fkey
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP COLUMN business_id
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_skus
      DROP COLUMN business_id
    `);
  }
}