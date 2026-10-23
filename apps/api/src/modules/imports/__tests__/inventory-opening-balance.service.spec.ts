import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { InventoryOpeningBalanceService } from '../inventory-opening-balance.service';
import { ExcelWorkbookReaderService } from '../excel-workbook-reader.service';
import { readFile } from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('InventoryOpeningBalanceService', () => {
  let service: InventoryOpeningBalanceService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockExcelWorkbookReaderService = {
    readWorksheet: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new InventoryOpeningBalanceService(
      mockConfigService as unknown as ConfigService,
      mockDataSource as unknown as DataSource,
      mockExcelWorkbookReaderService as unknown as ExcelWorkbookReaderService,
    );
  });

  describe('business ID validation', () => {
    it('rejects an empty business ID', async () => {
      await expect(service.importOpeningBalance('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an invalid business ID', async () => {
      await expect(
        service.importOpeningBalance('fimonaa-india'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects malformed UUID values', async () => {
      await expect(
        service.importOpeningBalance('1234-invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not access the database when the business ID is invalid', async () => {
      await expect(
        service.importOpeningBalance('invalid-business'),
      ).rejects.toThrow(BadRequestException);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('does not read the workbook when the business ID is invalid', async () => {
      await expect(
        service.importOpeningBalance('invalid-business'),
      ).rejects.toThrow(BadRequestException);

      expect(
        mockExcelWorkbookReaderService.readWorksheet,
      ).not.toHaveBeenCalled();
    });
  });

  describe('business existence and status validation', () => {
    const validBusinessId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('/test/sku-workbook.xlsx');

      jest.mocked(readFile).mockResolvedValue(
        Buffer.from('mock-workbook-content'),
      );

      mockExcelWorkbookReaderService.readWorksheet.mockResolvedValue({
        rows: [
          {
            'SKU Code': 'FIM-DRE-001-BLK-M',
            'Product Name': 'Test Dress',
            'Initial Stock': 10,
            'Available Stock': 10,
          },
        ],
      });
    });

    it('rejects a business that does not exist', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([]) // Advisory lock
        .mockResolvedValueOnce([]); // Business lookup

      mockDataSource.transaction.mockImplementation(
        async (callback: (manager: { query: typeof query }) => Promise<unknown>) =>
          callback({ query }),
      );

      await expect(
        service.importOpeningBalance(validBusinessId),
      ).rejects.toThrow(BadRequestException);

      expect(query).toHaveBeenCalledTimes(2);
    });

    it('rejects an inactive business', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([]) // Advisory lock
        .mockResolvedValueOnce([
          {
            id: validBusinessId,
            name: 'Fimonaa Finland',
            status: 'suspended',
          },
        ]);

      mockDataSource.transaction.mockImplementation(
        async (callback: (manager: { query: typeof query }) => Promise<unknown>) =>
          callback({ query }),
      );

      await expect(
        service.importOpeningBalance(validBusinessId),
      ).rejects.toThrow(ConflictException);

      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  describe('duplicate opening-balance protection', () => {
    const validBusinessId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('/test/sku-workbook.xlsx');

      jest.mocked(readFile).mockResolvedValue(
        Buffer.from('mock-workbook-content'),
      );

      mockExcelWorkbookReaderService.readWorksheet.mockResolvedValue({
        rows: [
          {
            'SKU Code': 'FIM-DRE-001-BLK-M',
            'Product Name': 'Test Dress',
            'Initial Stock': 10,
            'Available Stock': 10,
          },
        ],
      });
    });

    it('rejects a second opening-balance import for the same business', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([]) // Advisory lock
        .mockResolvedValueOnce([
          {
            id: validBusinessId,
            name: 'Fimonaa India',
            status: 'active',
          },
        ]) // Business lookup
        .mockResolvedValueOnce([{ id: 1 }]) // Existing import
        .mockResolvedValueOnce([]); // Existing SKUs

      mockDataSource.transaction.mockImplementation(
        async (
          callback: (manager: { query: typeof query }) => Promise<unknown>,
        ) => callback({ query }),
      );

      await expect(
        service.importOpeningBalance(validBusinessId),
      ).rejects.toThrow(ConflictException);

      expect(query).toHaveBeenCalledTimes(4);
    });

    it('rejects an opening-balance import when the business already has SKUs', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([]) // Advisory lock
        .mockResolvedValueOnce([
          {
            id: validBusinessId,
            name: 'Fimonaa India',
            status: 'active',
          },
        ]) // Business lookup
        .mockResolvedValueOnce([]) // No previous import
        .mockResolvedValueOnce([
          { sku: 'FIM-DRE-001-BLK-M' },
        ]); // Existing SKU

      mockDataSource.transaction.mockImplementation(
        async (
          callback: (manager: { query: typeof query }) => Promise<unknown>,
        ) => callback({ query }),
      );

      await expect(
        service.importOpeningBalance(validBusinessId),
      ).rejects.toThrow(ConflictException);

      expect(query).toHaveBeenCalledTimes(4);
    });
  });
  describe('tenant-scoped SKU imports', () => {
    const validBusinessId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('/test/sku-workbook.xlsx');

      jest.mocked(readFile).mockResolvedValue(
        Buffer.from('mock-workbook-content'),
      );

      mockExcelWorkbookReaderService.readWorksheet.mockResolvedValue({
        rows: [
          {
            'SKU Code': 'FIM-DRE-001-BLK-M',
            'Product Name': 'Test Dress',
            'Initial Stock': 10,
            'Available Stock': 10,
          },
        ],
      });
    });

    it('allows a business to import SKU codes used by another business', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([]) // Advisory lock
        .mockResolvedValueOnce([
          {
            id: validBusinessId,
            name: 'Fimonaa Finland',
            status: 'active',
          },
        ]) // Business lookup
        .mockResolvedValueOnce([]) // No previous imports for Finland
        .mockResolvedValueOnce([]) // No existing SKUs for Finland
        .mockResolvedValueOnce([]) // Insert import history
        .mockResolvedValueOnce([]) // Insert inventory SKU
        .mockResolvedValueOnce([]); // Insert inventory movement

      mockDataSource.transaction.mockImplementation(
        async (
          callback: (manager: { query: typeof query }) => Promise<unknown>,
        ) => callback({ query }),
      );

      const result = await service.importOpeningBalance(validBusinessId);

      expect(result).toMatchObject({
        status: 'success',
        businessId: validBusinessId,
        businessName: 'Fimonaa Finland',
        importedSkuCount: 1,
        totalAvailableStock: 10,
        movementRowsCreated: 1,
      });

      expect(query).toHaveBeenCalledTimes(7);

      // All inventory queries must be scoped to Finland's business ID.
      const inventoryCheck = query.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('FROM inventory_skus'),
      );

      expect(inventoryCheck?.[0]).toContain('WHERE business_id = $1');
      expect(inventoryCheck?.[1]).toEqual([validBusinessId]);

      // No global SKU collision query should be executed.
      expect(
        query.mock.calls.some(
          ([sql]: [string]) => sql.includes('WHERE sku = ANY'),
        ),
      ).toBe(false);
    });
  });
  describe('business ownership during opening-balance imports', () => {
    const validBusinessId = '123e4567-e89b-42d3-a456-426614174000';

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('/test/sku-workbook.xlsx');

      jest.mocked(readFile).mockResolvedValue(
        Buffer.from('mock-workbook-content'),
      );

      mockExcelWorkbookReaderService.readWorksheet.mockResolvedValue({
        rows: [
          {
            'SKU Code': 'FIM-DRE-001-BLK-M',
            'Product Name': 'Test Dress',
            'Initial Stock': 10,
            'Available Stock': 10,
          },
        ],
      });
    });

    it('assigns the same business ID to import history, inventory, and movements', async () => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([]) // Advisory lock
        .mockResolvedValueOnce([
          {
            id: validBusinessId,
            name: 'Fimonaa Finland',
            status: 'active',
          },
        ]) // Business lookup
        .mockResolvedValueOnce([]) // No previous imports
        .mockResolvedValueOnce([]) // No existing SKUs in this business
        .mockResolvedValueOnce([]) // Insert import history
        .mockResolvedValueOnce([]) // Insert inventory SKU
        .mockResolvedValueOnce([]); // Insert inventory movement

      mockDataSource.transaction.mockImplementation(
        async (
          callback: (manager: { query: typeof query }) => Promise<unknown>,
        ) => callback({ query }),
      );

      const result = await service.importOpeningBalance(validBusinessId);

      expect(result).toMatchObject({
        status: 'success',
        businessId: validBusinessId,
        businessName: 'Fimonaa Finland',
        importedSkuCount: 1,
        totalAvailableStock: 10,
        movementRowsCreated: 1,
      });

      const insertCalls = query.mock.calls.filter(
        ([sql]: [string]) => sql.includes('INSERT INTO'),
      );

      expect(insertCalls).toHaveLength(3);

      const expectedTables = [
        'inventory_opening_balance_imports',
        'inventory_skus',
        'inventory_movements',
      ];

      insertCalls.forEach(([sql, parameters], index) => {
        expect(sql).toContain(`INSERT INTO ${expectedTables[index]}`);
        expect(sql).toContain('business_id');
        expect(parameters[0]).toBe(validBusinessId);
      });

      expect(query).toHaveBeenCalledTimes(7);
    });
  });
});
