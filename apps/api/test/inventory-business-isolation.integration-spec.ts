import { DataSource, QueryRunner } from 'typeorm';

import { InventoryService } from '../src/modules/inventory/inventory.service';
import { createTestDataSource } from './helpers/create-test-data-source';

describe('InventoryService PostgreSQL business isolation', () => {
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

  it('creates two isolated businesses inside a rollback-protected transaction', async () => {
    const databaseRows: Array<{ database_name: string }> =
      await queryRunner.query(
        'SELECT current_database() AS database_name',
      );

    expect(databaseRows[0].database_name).toBe(
      'fimonaa_commerce_import_test',
    );

    const businesses: Array<{ id: string; slug: string }> =
      await queryRunner.query(
        `
          INSERT INTO businesses (name, slug)
          VALUES
            ('Integration Test Business A', 'integration-test-business-a'),
            ('Integration Test Business B', 'integration-test-business-b')
          RETURNING id, slug
        `,
      );

    expect(businesses).toHaveLength(2);
    expect(businesses[0].id).not.toBe(businesses[1].id);
    expect(businesses.map((business) => business.slug)).toEqual([
      'integration-test-business-a',
      'integration-test-business-b',
    ]);
  });

  it('allows the same SKU in two different businesses', async () => {
    const businesses: Array<{ id: string }> =
      await queryRunner.query(
        `
          INSERT INTO businesses (name, slug)
          VALUES
            ('Inventory Isolation A', 'inventory-isolation-a'),
            ('Inventory Isolation B', 'inventory-isolation-b')
          RETURNING id
        `,
      );

    const [businessA, businessB] = businesses;

    await queryRunner.query(
      `
        INSERT INTO inventory_skus (
          business_id,
          sku,
          product_name,
          initial_stock,
          available_stock,
          source_sheet,
          source_row
        )
        VALUES
          ($1, $3, 'Test Dress A', 10, 10, 'Integration Test', 1),
          ($2, $3, 'Test Dress B', 25, 25, 'Integration Test', 2)
      `,
      [
        businessA.id,
        businessB.id,
        'FIM-DRE-001-BLAC-ME',
      ],
    );

    const rows: Array<{
      business_id: string;
      sku: string;
      available_stock: number;
    }> = await queryRunner.query(
      `
        SELECT business_id, sku, available_stock
        FROM inventory_skus
        WHERE business_id IN ($1, $2)
        ORDER BY available_stock ASC
      `,
      [businessA.id, businessB.id],
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].business_id).toBe(businessA.id);
    expect(rows[0].available_stock).toBe(10);
    expect(rows[1].business_id).toBe(businessB.id);
    expect(rows[1].available_stock).toBe(25);
    expect(rows[0].sku).toBe(rows[1].sku);
  });

  it('returns inventory only for the requested business', async () => {
    const businesses: Array<{ id: string }> =
      await queryRunner.query(
        `
          INSERT INTO businesses (name, slug)
          VALUES
            ('Service Isolation A', 'service-isolation-a'),
            ('Service Isolation B', 'service-isolation-b')
          RETURNING id
        `,
      );

    const [businessA, businessB] = businesses;

    await queryRunner.query(
      `
        INSERT INTO inventory_skus (
          business_id,
          sku,
          product_name,
          initial_stock,
          available_stock,
          source_sheet,
          source_row
        )
        VALUES
          ($1, $3, 'Business A Dress', 10, 10, 'Integration Test', 1),
          ($2, $3, 'Business B Dress', 25, 25, 'Integration Test', 2)
      `,
      [
        businessA.id,
        businessB.id,
        'FIM-DRE-001-BLAC-ME',
      ],
    );

    // Keep service queries inside the rollback-protected transaction.
    const transactionDataSource = {
      query: (sql: string, parameters?: unknown[]) =>
        queryRunner.query(sql, parameters),
    } as DataSource;

    const service = new InventoryService(transactionDataSource);

    const query = {
      stockStatus: 'all' as const,
      page: 1,
      limit: 25,
    };

    const resultA = await service.listInventory(businessA.id, query);
    const resultB = await service.listInventory(businessB.id, query);

    expect(resultA.meta.totalItems).toBe(1);
    expect(resultB.meta.totalItems).toBe(1);

    expect(resultA.data).toHaveLength(1);
    expect(resultB.data).toHaveLength(1);

    expect(resultA.data[0].sku).toBe('FIM-DRE-001-BLAC-ME');
    expect(resultB.data[0].sku).toBe('FIM-DRE-001-BLAC-ME');

    expect(resultA.data[0].productName).toBe('Business A Dress');
    expect(resultB.data[0].productName).toBe('Business B Dress');

    expect(resultA.data[0].availableStock).toBe(10);
    expect(resultB.data[0].availableStock).toBe(25);
  });

  it('does not expose another business inventory through search', async () => {
    const businesses: Array<{ id: string }> =
      await queryRunner.query(
        `
          INSERT INTO businesses (name, slug)
          VALUES
            ('Search Isolation A', 'search-isolation-a'),
            ('Search Isolation B', 'search-isolation-b')
          RETURNING id
        `,
      );

    const [businessA, businessB] = businesses;

    await queryRunner.query(
      `
        INSERT INTO inventory_skus (
          business_id,
          sku,
          product_name,
          initial_stock,
          available_stock,
          source_sheet,
          source_row
        )
        VALUES
          ($1, 'FIM-DRE-101-BLAC-ME', 'Cotton Day Dress', 10, 10, 'Integration Test', 1),
          ($2, 'FIM-DRE-102-BLAC-ME', 'Exclusive Velvet Gown', 25, 25, 'Integration Test', 2)
      `,
      [businessA.id, businessB.id],
    );

    const transactionDataSource = {
      query: (sql: string, parameters?: unknown[]) =>
        queryRunner.query(sql, parameters),
    } as DataSource;

    const service = new InventoryService(transactionDataSource);

    const query = {
      search: 'Velvet',
      stockStatus: 'all' as const,
      page: 1,
      limit: 25,
    };

    const resultA = await service.listInventory(businessA.id, query);
    const resultB = await service.listInventory(businessB.id, query);

    expect(resultA.data).toHaveLength(0);
    expect(resultA.meta.totalItems).toBe(0);

    expect(resultB.data).toHaveLength(1);
    expect(resultB.meta.totalItems).toBe(1);
    expect(resultB.data[0].productName).toBe('Exclusive Velvet Gown');
    expect(resultB.data[0].availableStock).toBe(25);
  });

  it('restricts stock-status filters to the requested business', async () => {
    const businesses: Array<{ id: string }> =
      await queryRunner.query(
        `
          INSERT INTO businesses (name, slug)
          VALUES
            ('Stock Filter A', 'stock-filter-a'),
            ('Stock Filter B', 'stock-filter-b')
          RETURNING id
        `,
      );

    const [businessA, businessB] = businesses;

    await queryRunner.query(
      `
        INSERT INTO inventory_skus (
          business_id,
          sku,
          product_name,
          initial_stock,
          available_stock,
          source_sheet,
          source_row
        )
        VALUES
          ($1, 'FIM-DRE-201-BLAC-ME', 'Cotton Dress', 10, 10, 'Integration Test', 1),
          ($2, 'FIM-DRE-202-BLAC-ME', 'Velvet Gown', 5, 0, 'Integration Test', 2)
      `,
      [businessA.id, businessB.id],
    );

    const transactionDataSource = {
      query: (sql: string, parameters?: unknown[]) =>
        queryRunner.query(sql, parameters),
    } as DataSource;

    const service = new InventoryService(transactionDataSource);

    const query = {
      stockStatus: 'out_of_stock' as const,
      page: 1,
      limit: 25,
    };

    const resultA = await service.listInventory(businessA.id, query);
    const resultB = await service.listInventory(businessB.id, query);

    expect(resultA.data).toHaveLength(0);
    expect(resultA.meta.totalItems).toBe(0);

    expect(resultB.data).toHaveLength(1);
    expect(resultB.meta.totalItems).toBe(1);
    expect(resultB.data[0].productName).toBe('Velvet Gown');
    expect(resultB.data[0].availableStock).toBe(0);
    expect(resultB.data[0].stockStatus).toBe('out_of_stock');
  });

  it('prepares a rollback-protected transaction', async () => {
    const rows: Array<{ database_name: string }> =
      await queryRunner.query(
        'SELECT current_database() AS database_name',
      );

    expect(rows[0].database_name).toBe(
      'fimonaa_commerce_import_test',
    );
  });
});
