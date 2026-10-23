import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the foundational inventory tables.
 *
 * These tables originally existed before formal migrations were introduced.
 *
 * CREATE TABLE IF NOT EXISTS preserves existing inventory tables.
 *
 * Business ownership is added by subsequent migrations.
 */
export class CreateFoundationalInventoryTables1761080000000
  implements MigrationInterface
{
  name = 'CreateFoundationalInventoryTables1761080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * Inventory SKUs.
     *
     * Each SKU stores the opening stock and current available stock.
     */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_skus (
        sku TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        initial_stock INTEGER NULL,
        available_stock INTEGER NOT NULL
          CHECK (available_stock >= 0),
        source_sheet TEXT NOT NULL,
        source_row INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    /**
     * Opening-balance import history.
     *
     * The original schema allows one record per unique workbook hash.
     * Business-specific uniqueness is added later.
     */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_opening_balance_imports (
        id BIGSERIAL PRIMARY KEY,
        import_key TEXT NOT NULL UNIQUE,
        workbook_name TEXT NOT NULL,
        worksheet_name TEXT NOT NULL,
        sku_count INTEGER NOT NULL,
        total_available_stock BIGINT NOT NULL,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    /**
     * Inventory movements.
     *
     * Every movement references an existing inventory SKU.
     */
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id BIGSERIAL PRIMARY KEY,
        sku TEXT NOT NULL REFERENCES inventory_skus(sku),
        movement_type TEXT NOT NULL,
        quantity_delta INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        reference TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /**
     * Safety-first rollback:
     *
     * This migration may have encountered tables that already existed.
     * Therefore, we cannot assume it owns those tables.
     *
     * Never drop inventory tables automatically.
     */
    const tables = [
      'inventory_movements',
      'inventory_opening_balance_imports',
      'inventory_skus',
    ];

    for (const table of tables) {
      const rows: Array<{ count: string }> = await queryRunner.query(
        `SELECT COUNT(*)::text AS count FROM ${table}`,
      );

      if (Number(rows[0].count) > 0) {
        throw new Error(
          `Cannot roll back foundational inventory migration: ${table} contains data.`,
        );
      }
    }

    throw new Error(
      'Automatic rollback is disabled because these inventory tables may predate this migration. Manual schema review is required.',
    );
  }
}