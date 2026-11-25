import dataSource from '../data-source';
import { seedDevelopmentInventory } from '../seed-development-inventory';
import { validateLocalDevDatabase } from '../../../scripts/validate-local-dev-database.cjs';

jest.mock('../data-source', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    transaction: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../../scripts/validate-local-dev-database.cjs', () => ({
  validateLocalDevDatabase: jest.fn(),
}));

describe('Development inventory seed', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  const mockedDataSource = dataSource as jest.Mocked<typeof dataSource>;
  const mockedValidator = validateLocalDevDatabase as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.DATABASE_URL =
      'postgresql://localhost/fimonaa_commerce_dev';
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('rejects an unsafe database before initializing TypeORM', async () => {
    mockedValidator.mockImplementation(() => {
      throw new Error('Unsafe database');
    });

    await expect(seedDevelopmentInventory()).rejects.toThrow(
      'Unsafe database',
    );

    expect(mockedValidator).toHaveBeenCalledWith(
      process.env.DATABASE_URL,
    );

    expect(mockedDataSource.initialize).not.toHaveBeenCalled();
    expect(mockedDataSource.transaction).not.toHaveBeenCalled();
  });

  it('validates the database before attempting a connection', async () => {
    mockedValidator.mockReturnValue({
      databaseName: 'fimonaa_commerce_dev',
    });

    mockedDataSource.initialize.mockRejectedValue(
      new Error('Simulated connection failure'),
    );

    await expect(seedDevelopmentInventory()).rejects.toThrow(
      'Simulated connection failure',
    );

    expect(mockedValidator).toHaveBeenCalledTimes(1);
    expect(mockedDataSource.initialize).toHaveBeenCalledTimes(1);
    expect(mockedDataSource.transaction).not.toHaveBeenCalled();
  });

  it('inserts and verifies all synthetic records within one transaction', async () => {
    mockedValidator.mockReturnValue({
      databaseName: 'fimonaa_commerce_dev',
    });

    mockedDataSource.initialize.mockResolvedValue(
      mockedDataSource,
    );

    const businessIds = {
      'commerce-demo-a': '11111111-1111-4111-8111-111111111111',
      'commerce-demo-b': '22222222-2222-4222-8222-222222222222',
    };

    // Simulate PostgreSQL persistence without connecting to a database.
    // Include the business ID in the key because SKU codes can overlap
    // between independent businesses.
    const storedInventory = new Map<string, {
      product_name: unknown;
      initial_stock: unknown;
      available_stock: unknown;
      source_sheet: unknown;
      source_row: unknown;
    }>();

    const query = jest.fn().mockImplementation(
      async (sql: string, parameters: unknown[]) => {
        if (sql.includes('FROM businesses')) {
          const slug = parameters[0] as keyof typeof businessIds;

          return [{
            id: businessIds[slug],
            name: slug === 'commerce-demo-a'
              ? 'Commerce Demo A'
              : 'Commerce Demo B',
            status: 'active',
          }];
        }

        if (sql.includes('INSERT INTO inventory_skus')) {
          const key = `${parameters[0]}:${parameters[1]}`;

          // Simulate ON CONFLICT DO NOTHING.
          if (!storedInventory.has(key)) {
            storedInventory.set(key, {
              product_name: parameters[2],
              initial_stock: parameters[3],
              available_stock: parameters[4],
              source_sheet: parameters[5],
              source_row: parameters[6],
            });
          }

          return [];
        }

        if (sql.includes('FROM inventory_skus')) {
          const key = `${parameters[0]}:${parameters[1]}`;
          const record = storedInventory.get(key);

          return record ? [record] : [];
        }

        throw new Error('Unexpected SQL query');
      },
    );

    mockedDataSource.transaction.mockImplementation(
      async (callback: any) => callback({ query }),
    );

    await seedDevelopmentInventory();

    expect(mockedDataSource.transaction).toHaveBeenCalledTimes(1);
    expect(mockedDataSource.destroy).toHaveBeenCalledTimes(1);

    const insertCalls = query.mock.calls.filter(
      ([sql]) => sql.includes('INSERT INTO inventory_skus'),
    );

    expect(insertCalls).toHaveLength(45);

    for (const [sql, parameters] of insertCalls) {
      expect(sql).toContain(
        'ON CONFLICT (business_id, sku) DO NOTHING',
      );

      expect(Object.values(businessIds)).toContain(parameters[0]);
    }
  });


  it('rejects conflicting existing inventory without overwriting it', async () => {
    mockedValidator.mockReturnValue({
      databaseName: 'fimonaa_commerce_dev',
    });

    const existingRecord = {
      product_name: 'Existing Demo Product',
      initial_stock: 50,
      available_stock: 50,
      source_sheet: 'Development Fixture',
      source_row: 1,
    };

    const query = jest.fn().mockImplementation(
      async (sql: string, parameters: unknown[]) => {
        if (sql.includes('FROM businesses')) {
          const slug = parameters[0];

          return [{
            id: slug === 'commerce-demo-a'
              ? '11111111-1111-4111-8111-111111111111'
              : '22222222-2222-4222-8222-222222222222',
            name: slug === 'commerce-demo-a'
              ? 'Commerce Demo A'
              : 'Commerce Demo B',
            status: 'active',
          }];
        }

        if (sql.includes('INSERT INTO inventory_skus')) {
          // Simulate an existing record and ON CONFLICT DO NOTHING.
          return [];
        }

        if (sql.includes('FROM inventory_skus')) {
          return [existingRecord];
        }

        throw new Error('Unexpected SQL query');
      },
    );

    mockedDataSource.transaction.mockImplementation(
      async (callback: any) => callback({ query }),
    );

    await expect(seedDevelopmentInventory()).rejects.toThrow(
      'Conflicting development inventory fixture',
    );

    expect(existingRecord.available_stock).toBe(50);

    expect(mockedDataSource.destroy).toHaveBeenCalledTimes(1);
  });


  it('propagates transaction failures and closes the database connection', async () => {
    mockedValidator.mockReturnValue({
      databaseName: 'fimonaa_commerce_dev',
    });

    const transactionError = new Error('Simulated transaction failure');

    mockedDataSource.transaction.mockRejectedValue(transactionError);

    const successLog = jest.spyOn(console, 'log').mockImplementation();

    try {
      await expect(seedDevelopmentInventory()).rejects.toThrow(
        'Simulated transaction failure',
      );

      expect(mockedDataSource.initialize).toHaveBeenCalledTimes(1);
      expect(mockedDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockedDataSource.destroy).toHaveBeenCalledTimes(1);

      expect(successLog).not.toHaveBeenCalled();
    } finally {
      successLog.mockRestore();
    }
  });

});
