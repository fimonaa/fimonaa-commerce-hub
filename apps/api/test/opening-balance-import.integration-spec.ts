import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';

import { InventoryOpeningBalanceService } from '../src/modules/imports/inventory-opening-balance.service';
import { ExcelWorkbookReaderService } from '../src/modules/imports/excel-workbook-reader.service';

import { createTestDataSource } from './helpers/create-test-data-source';

describe('Opening-balance import PostgreSQL integration', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeAll(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
  });

  beforeEach(async () => {
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
  });

  afterEach(async () => {
    if (queryRunner?.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }

    if (queryRunner && !queryRunner.isReleased) {
      await queryRunner.release();
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  function createTransactionBoundDataSource(): DataSource {
    return {
      query: (sql: string, parameters?: unknown[]) =>
        queryRunner.query(sql, parameters),
      transaction: async <T>(
        callback: (manager: typeof queryRunner.manager) => Promise<T>,
      ): Promise<T> => {
        if (!queryRunner.isTransactionActive) {
          throw new Error('Integration-test transaction is not active.');
        }

        return callback(queryRunner.manager);
      },
    } as DataSource;
  }

  function createRollbackAwareDataSource(): DataSource {
    return {
      query: (sql: string, parameters?: unknown[]) =>
        queryRunner.query(sql, parameters),
      transaction: async <T>(
        callback: (manager: typeof queryRunner.manager) => Promise<T>,
      ): Promise<T> => {
        if (!queryRunner.isTransactionActive) {
          throw new Error('Integration-test transaction is not active.');
        }

        await queryRunner.startTransaction();

        try {
          const result = await callback(queryRunner.manager);
          await queryRunner.commitTransaction();
          return result;
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        }
      },
    } as DataSource;
  }

  it('imports synthetic inventory into the selected business', async () => {
    const businesses: Array<{ id: string }> = await queryRunner.query(
      `INSERT INTO businesses (name, slug)
       VALUES ('Opening Balance Integration Test', 'opening-balance-integration-test')
       RETURNING id`,
    );

    const businessId = businesses[0].id;

    const configService = {
      get: (key: string) =>
        key === 'FIMONAA_SKU_WORKBOOK_PATH'
          ? resolve(__dirname, 'fixtures/opening-balance-test.xlsx')
          : undefined,
    } as ConfigService;

    const service = new InventoryOpeningBalanceService(
      configService,
      createTransactionBoundDataSource(),
      new ExcelWorkbookReaderService(),
    );

    const result = await service.importOpeningBalance(businessId);

    expect(result.status).toBe('success');
    expect(result.businessId).toBe(businessId);
    expect(result.importedSkuCount).toBe(2);
    expect(result.totalAvailableStock).toBe(15);
    expect(result.movementRowsCreated).toBe(2);

    const inventory: Array<{ sku: string; available_stock: number }> =
      await queryRunner.query(
        `SELECT sku, available_stock
         FROM inventory_skus
         WHERE business_id = $1
         ORDER BY sku`,
        [businessId],
      );

    expect(inventory).toEqual([
      { sku: 'TEST-DRE-001-BLAC-ME', available_stock: 10 },
      { sku: 'TEST-DRE-002-BLUE-LA', available_stock: 5 },
    ]);

    const movements: Array<{ count: number }> = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM inventory_movements
       WHERE business_id = $1 AND movement_type = 'OPENING_BALANCE'`,
      [businessId],
    );

    expect(movements[0].count).toBe(2);

    const imports: Array<{ count: number }> = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM inventory_opening_balance_imports
       WHERE business_id = $1`,
      [businessId],
    );

    expect(imports[0].count).toBe(1);
  });

  it('rejects a second opening-balance import for the same business', async () => {
    const businesses: Array<{ id: string }> = await queryRunner.query(
      `INSERT INTO businesses (name, slug)
       VALUES ('Duplicate Import Test', 'duplicate-import-test')
       RETURNING id`,
    );

    const businessId = businesses[0].id;

    const configService = {
      get: (key: string) =>
        key === 'FIMONAA_SKU_WORKBOOK_PATH'
          ? resolve(__dirname, 'fixtures/opening-balance-test.xlsx')
          : undefined,
    } as ConfigService;

    const service = new InventoryOpeningBalanceService(
      configService,
      createTransactionBoundDataSource(),
      new ExcelWorkbookReaderService(),
    );

    await service.importOpeningBalance(businessId);

    await expect(
      service.importOpeningBalance(businessId),
    ).rejects.toThrow('already contains inventory');

    const inventory: Array<{ count: number; total: number }> =
      await queryRunner.query(
        `SELECT COUNT(*)::int AS count,
                SUM(available_stock)::int AS total
         FROM inventory_skus
         WHERE business_id = $1`,
        [businessId],
      );

    expect(inventory[0]).toEqual({
      count: 2,
      total: 15,
    });

    const imports: Array<{ count: number }> = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM inventory_opening_balance_imports
       WHERE business_id = $1`,
      [businessId],
    );

    expect(imports[0].count).toBe(1);

    const movements: Array<{ count: number }> = await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM inventory_movements
       WHERE business_id = $1`,
      [businessId],
    );

    expect(movements[0].count).toBe(2);
  });

  it('allows different businesses to import identical SKU codes', async () => {
    const businesses: Array<{ id: string }> = await queryRunner.query(
      `INSERT INTO businesses (name, slug)
       VALUES
         ('Import Isolation Business A', 'import-isolation-business-a'),
         ('Import Isolation Business B', 'import-isolation-business-b')
       RETURNING id`,
    );

    const [businessA, businessB] = businesses;

    const configService = {
      get: (key: string) =>
        key === 'FIMONAA_SKU_WORKBOOK_PATH'
          ? resolve(__dirname, 'fixtures/opening-balance-test.xlsx')
          : undefined,
    } as ConfigService;

    const service = new InventoryOpeningBalanceService(
      configService,
      createTransactionBoundDataSource(),
      new ExcelWorkbookReaderService(),
    );

    await service.importOpeningBalance(businessA.id);
    await service.importOpeningBalance(businessB.id);

    const inventory: Array<{
      business_id: string;
      sku_count: number;
      total_stock: number;
    }> = await queryRunner.query(
      `SELECT business_id,
              COUNT(*)::int AS sku_count,
              SUM(available_stock)::int AS total_stock
       FROM inventory_skus
       WHERE business_id IN ($1, $2)
       GROUP BY business_id`,
      [businessA.id, businessB.id],
    );

    expect(inventory).toHaveLength(2);

    for (const business of businesses) {
      expect(inventory).toContainEqual({
        business_id: business.id,
        sku_count: 2,
        total_stock: 15,
      });
    }

    const sharedSkus: Array<{ sku: string; count: number }> =
      await queryRunner.query(
        `SELECT sku, COUNT(*)::int AS count
         FROM inventory_skus
         WHERE business_id IN ($1, $2)
         GROUP BY sku
         ORDER BY sku`,
        [businessA.id, businessB.id],
      );

    expect(sharedSkus).toEqual([
      { sku: 'TEST-DRE-001-BLAC-ME', count: 2 },
      { sku: 'TEST-DRE-002-BLUE-LA', count: 2 },
    ]);

    const imports: Array<{ business_id: string; count: number }> =
      await queryRunner.query(
        `SELECT business_id, COUNT(*)::int AS count
         FROM inventory_opening_balance_imports
         WHERE business_id IN ($1, $2)
         GROUP BY business_id`,
        [businessA.id, businessB.id],
      );

    expect(imports).toHaveLength(2);

    for (const business of businesses) {
      expect(imports).toContainEqual({
        business_id: business.id,
        count: 1,
      });
    }
  });

  it('rolls back all import records after a PostgreSQL failure', async () => {
    const businesses: Array<{ id: string }> = await queryRunner.query(
      `INSERT INTO businesses (name, slug)
       VALUES ('Import Rollback Test', 'import-rollback-test')
       RETURNING id`,
    );

    const businessId = businesses[0].id;

    const configService = {
      get: (key: string) =>
        key === 'FIMONAA_SKU_WORKBOOK_PATH'
          ? resolve(__dirname, 'fixtures/opening-balance-test.xlsx')
          : undefined,
    } as ConfigService;

    // A transaction-local trigger forces the second movement to fail.
    // It is created inside the outer test transaction and rolled back afterward.
    await queryRunner.query(`
      CREATE FUNCTION pg_temp.reject_second_opening_movement()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.sku = 'TEST-DRE-002-BLUE-LA' THEN
          RAISE EXCEPTION 'Synthetic second movement failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`
      CREATE TRIGGER test_reject_second_opening_movement
      BEFORE INSERT ON inventory_movements
      FOR EACH ROW
      EXECUTE FUNCTION pg_temp.reject_second_opening_movement()
    `);

    const service = new InventoryOpeningBalanceService(
      configService,
      createRollbackAwareDataSource(),
      new ExcelWorkbookReaderService(),
    );

    await expect(
      service.importOpeningBalance(businessId),
    ).rejects.toThrow('Synthetic second movement failure');

    for (const table of [
      'inventory_skus',
      'inventory_movements',
      'inventory_opening_balance_imports',
    ]) {
      const rows: Array<{ count: number }> = await queryRunner.query(
        `SELECT COUNT(*)::int AS count
         FROM ${table}
         WHERE business_id = $1`,
        [businessId],
      );

      expect(rows[0].count).toBe(0);
    }
  });

  it('connects to the isolated import-test database', async () => {
    const rows: Array<{ database_name: string }> =
      await queryRunner.query(
        'SELECT current_database() AS database_name',
      );

    expect(rows[0].database_name).toBe(
      'fimonaa_commerce_import_test',
    );
  });
});
