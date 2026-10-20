import { DataSource } from 'typeorm';

import { InventoryService } from '../inventory.service';
import { ListInventoryQueryDto } from '../dto/list-inventory-query.dto';

// Mock only the database boundary. These tests verify service behavior
// without connecting to or modifying the real inventory database.
describe('InventoryService', () => {
  let service: InventoryService;
  let dataSource: jest.Mocked<Pick<DataSource, 'query'>>;

  beforeEach(() => {
    dataSource = {
      query: jest.fn(),
    };

    service = new InventoryService(dataSource as unknown as DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the default page and limit when no query is provided', async () => {
    // The first query retrieves the total count; the second retrieves records.
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 30 }])
      .mockResolvedValueOnce([]);

    const result = await service.listInventory(
      new ListInventoryQueryDto(),
    );

    expect(result).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 25,
        totalItems: 30,
        totalPages: 2,
      },
    });

    // Two queries are expected: one count query and one result query.
    expect(dataSource.query).toHaveBeenCalledTimes(2);

    const resultQuery = dataSource.query.mock.calls[1][0] as string;

    expect(resultQuery).toContain('ORDER BY sku ASC');
    expect(resultQuery).toContain('LIMIT $1');
    expect(resultQuery).toContain('OFFSET $2');
  });

  it('searches both SKU and product name using a bound parameter', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 1 }])
      .mockResolvedValueOnce([
        {
          sku: 'FIM-DRE-001-BLAC-42/44',
          productName: 'Evening Gown',
          initialStock: '10',
          availableStock: '8',
          stockStatus: 'in_stock',
          sourceSheet: 'SKU Generator',
          sourceRow: '12',
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

    const query = Object.assign(new ListInventoryQueryDto(), {
      search: '  gown  ',
    });

    const result = await service.listInventory(query);

    const countCall = dataSource.query.mock.calls[0];
    const resultCall = dataSource.query.mock.calls[1];

    // Both fields must be searched, and the input must not be interpolated
    // directly into SQL.
    expect(countCall[0]).toContain('sku ILIKE $1');
    expect(countCall[0]).toContain('product_name ILIKE $1');
    expect(countCall[1]).toEqual(['%gown%']);

    // The result query reuses the search parameter, followed by limit and offset.
    expect(resultCall[1]).toEqual(['%gown%', 25, 0]);

    // PostgreSQL numeric strings are normalized to JavaScript numbers.
    expect(result.data[0].initialStock).toBe(10);
    expect(result.data[0].availableStock).toBe(8);
    expect(result.data[0].sourceRow).toBe(12);
    expect(result.meta.totalItems).toBe(1);
  });

  it('applies the low-stock condition to both count and result queries', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 4 }])
      .mockResolvedValueOnce([]);

    const query = Object.assign(new ListInventoryQueryDto(), {
      stockStatus: 'low_stock' as const,
    });

    const result = await service.listInventory(query);

    expect(dataSource.query.mock.calls[0][0]).toContain(
      'available_stock BETWEEN 1 AND 5',
    );

    expect(dataSource.query.mock.calls[1][0]).toContain(
      'available_stock BETWEEN 1 AND 5',
    );

    expect(result.meta.totalItems).toBe(4);
    expect(result.meta.totalPages).toBe(1);
  });

  it('applies the out-of-stock condition to both queries', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 7 }])
      .mockResolvedValueOnce([]);

    const query = Object.assign(new ListInventoryQueryDto(), {
      stockStatus: 'out_of_stock' as const,
    });

    const result = await service.listInventory(query);

    expect(dataSource.query.mock.calls[0][0]).toContain(
      'available_stock = 0',
    );

    expect(dataSource.query.mock.calls[1][0]).toContain(
      'available_stock = 0',
    );

    expect(result.meta.totalItems).toBe(7);
  });

  it('applies the in-stock condition to both queries', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 20 }])
      .mockResolvedValueOnce([]);

    const query = Object.assign(new ListInventoryQueryDto(), {
      stockStatus: 'in_stock' as const,
    });

    await service.listInventory(query);

    expect(dataSource.query.mock.calls[0][0]).toContain(
      'available_stock > 5',
    );

    expect(dataSource.query.mock.calls[1][0]).toContain(
      'available_stock > 5',
    );
  });

  it('returns zero total pages when no records match', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 0 }])
      .mockResolvedValueOnce([]);

    const result = await service.listInventory(
      new ListInventoryQueryDto(),
    );

    expect(result).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 25,
        totalItems: 0,
        totalPages: 0,
      },
    });
  });

  it('preserves a null initial stock value', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 1 }])
      .mockResolvedValueOnce([
        {
          sku: 'FIM-DRE-001-BLAC-42/44',
          productName: 'Evening Gown',
          initialStock: null,
          availableStock: '0',
          stockStatus: 'out_of_stock',
          sourceSheet: 'SKU Generator',
          sourceRow: '15',
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

    const result = await service.listInventory(
      new ListInventoryQueryDto(),
    );

    expect(result.data[0].initialStock).toBeNull();
    expect(result.data[0].availableStock).toBe(0);
    expect(result.data[0].stockStatus).toBe('out_of_stock');
  });

  it('calculates the correct offset for a later page', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ totalItems: 60 }])
      .mockResolvedValueOnce([]);

    const query = Object.assign(new ListInventoryQueryDto(), {
      page: 3,
      limit: 10,
    });

    const result = await service.listInventory(query);

    // Page 3 at 10 records per page starts after the first 20 records.
    expect(dataSource.query.mock.calls[1][1]).toEqual([10, 20]);

    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      totalItems: 60,
      totalPages: 6,
    });
  });
});