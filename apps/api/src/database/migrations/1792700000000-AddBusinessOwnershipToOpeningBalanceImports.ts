import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds business ownership to opening-balance import history.
 *
 * Supports two scenarios:
 *
 * 1. Existing Fimonaa installation:
 *    Historical opening-balance imports are assigned to Fimonaa India.
 *
 * 2. Fresh SaaS installation:
 *    Empty import-history tables are migrated without requiring
 *    any predefined business.
 *
 * Import uniqueness is scoped to each business:
 *
 * UNIQUE (business_id, import_key)
 *
 * This migration does not modify inventory quantities,
 * inventory movements, or inventory SKU records.
 */
export class AddBusinessOwnershipToOpeningBalanceImports1792700000000
  implements MigrationInterface
{
  name = 'AddBusinessOwnershipToOpeningBalanceImports1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * STEP 1: Check for historical opening-balance imports.
     *
     * A fresh SaaS installation will have zero records.
     */
    const existingImports: Array<{ count: string }> =
      await queryRunner.query(`
        SELECT COUNT(*)::text AS count
        FROM inventory_opening_balance_imports
      `);

    const hasHistoricalImports =
      Number(existingImports[0].count) > 0;

    let indiaBusinessId: string | null = null;

    /**
     * STEP 2: Resolve the historical business owner.
     *
     * Only installations with existing import history
     * require the original Fimonaa India workspace.
     *
     * We never create businesses automatically here.
     */
    if (hasHistoricalImports) {
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
          'Historical opening-balance imports exist, but the ' +
            'Fimonaa India workspace is missing. Bootstrap the ' +
            'original business before migrating.',
        );
      }

      indiaBusinessId = businesses[0].id;
    }

    /**
     * STEP 3: Add the business ownership column.
     *
     * Initially nullable so historical records can
     * be assigned before enforcing NOT NULL.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      ADD COLUMN business_id UUID
    `);

    /**
     * STEP 4: Assign historical imports to Fimonaa India.
     *
     * Fresh SaaS installations skip this step because
     * there are no historical imports.
     */
    if (hasHistoricalImports) {
      await queryRunner.query(
        `
          UPDATE inventory_opening_balance_imports
          SET business_id = $1
        `,
        [indiaBusinessId],
      );
    }

    /**
     * STEP 5: Verify that all import records
     * have a valid business owner.
     */
    const missingOwnership: Array<{ count: string }> =
      await queryRunner.query(`
        SELECT COUNT(*)::text AS count
        FROM inventory_opening_balance_imports
        WHERE business_id IS NULL
      `);

    if (Number(missingOwnership[0].count) !== 0) {
      throw new Error(
        'Some opening-balance import records could not be ' +
          'assigned to a business.',
      );
    }

    /**
     * STEP 6: Make business ownership mandatory.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      ALTER COLUMN business_id SET NOT NULL
    `);

    /**
     * STEP 7: Ensure every import belongs to
     * an existing business.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      ADD CONSTRAINT inventory_opening_balance_imports_business_id_fkey
      FOREIGN KEY (business_id)
      REFERENCES businesses(id)
      ON DELETE RESTRICT
    `);

    /**
     * STEP 8: Remove the original global uniqueness constraint.
     *
     * Previously, the same import key could only exist
     * once across the entire platform.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      DROP CONSTRAINT inventory_opening_balance_imports_import_key_key
    `);

    /**
     * STEP 9: Add business-specific import uniqueness.
     *
     * Two different businesses may use the same import key,
     * but one business cannot use the same key twice.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      ADD CONSTRAINT inventory_opening_balance_imports_business_key_unique
      UNIQUE (business_id, import_key)
    `);

    /**
     * STEP 10: Create an index for efficient
     * business-scoped import-history queries.
     */
    await queryRunner.query(`
      CREATE INDEX inventory_opening_balance_imports_business_id_idx
      ON inventory_opening_balance_imports (business_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * STEP 1: Verify that global uniqueness can be restored.
     *
     * If two businesses imported the same workbook,
     * restoring the original global unique constraint
     * would fail.
     */
    const duplicateKeys: Array<{ import_key: string }> =
      await queryRunner.query(`
        SELECT import_key
        FROM inventory_opening_balance_imports
        GROUP BY import_key
        HAVING COUNT(*) > 1
        LIMIT 1
      `);

    if (duplicateKeys.length > 0) {
      throw new Error(
        'Cannot restore global import-key uniqueness because ' +
          'duplicate import keys exist across businesses.',
      );
    }

    /**
     * STEP 2: Remove the business-specific index.
     */
    await queryRunner.query(`
      DROP INDEX inventory_opening_balance_imports_business_id_idx
    `);

    /**
     * STEP 3: Remove business-specific uniqueness.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      DROP CONSTRAINT inventory_opening_balance_imports_business_key_unique
    `);

    /**
     * STEP 4: Restore the original global uniqueness.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      ADD CONSTRAINT inventory_opening_balance_imports_import_key_key
      UNIQUE (import_key)
    `);

    /**
     * STEP 5: Remove the business foreign key.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      DROP CONSTRAINT inventory_opening_balance_imports_business_id_fkey
    `);

    /**
     * STEP 6: Remove the business ownership column.
     *
     * Historical import records remain intact.
     */
    await queryRunner.query(`
      ALTER TABLE inventory_opening_balance_imports
      DROP COLUMN business_id
    `);
  }
}