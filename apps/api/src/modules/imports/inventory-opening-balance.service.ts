import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ExcelWorkbookReaderService } from './excel-workbook-reader.service';

interface OpeningBalanceRow {
  sku: string;
  productName: string;
  initialStock: number | null;
  availableStock: number;
  sourceRow: number;
}

@Injectable()
export class InventoryOpeningBalanceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly excelWorkbookReaderService: ExcelWorkbookReaderService,
  ) { }

  async importOpeningBalance() {
    const workbookPath = this.configService.get<string>(
      'FIMONAA_SKU_WORKBOOK_PATH',
    );

    if (!workbookPath) {
      throw new InternalServerErrorException(
        'FIMONAA_SKU_WORKBOOK_PATH is not configured in apps/api/.env',
      );
    }

    let buffer: Buffer;

    try {
      buffer = await readFile(workbookPath);
    } catch {
      throw new InternalServerErrorException(
        `Unable to read the configured SKU workbook at: ${workbookPath}`,
      );
    }

    const workbookName = workbookPath.split('/').pop() ?? 'SKU workbook';
    const worksheetName = 'SKU Generator';

    const { rows: rawRows } =
      await this.excelWorkbookReaderService.readWorksheet(
        buffer,
        worksheetName,
      );

    const normalize = (value: unknown) => String(value ?? '').trim();
    const rows: OpeningBalanceRow[] = [];
    const seenSkus = new Set<string>();
    const errors: string[] = [];

    rawRows.forEach((row, index) => {
      const sourceRow = index + 2;

      const hasAnyData = Object.values(row).some(
        (value) => normalize(value) !== '',
      );

      const sku = normalize(row['SKU Code']);
      const productName = normalize(row['Product Name']);

      if (!hasAnyData || (!sku && !productName)) {
        return;
      }

      if (!sku) {
        errors.push(`Row ${sourceRow}: SKU Code is missing.`);
      }

      if (!productName) {
        errors.push(`Row ${sourceRow}: Product Name is missing.`);
      }

      if (sku && seenSkus.has(sku)) {
        errors.push(`Row ${sourceRow}: duplicate SKU "${sku}".`);
      }

      if (sku) {
        seenSkus.add(sku);
      }

      const parseStock = (value: unknown): number | null => {
        const text = normalize(value);

        if (!text) {
          return null;
        }

        const parsed = Number(text.replace(/,/g, ''));

        return Number.isSafeInteger(parsed) ? parsed : null;
      };

      const availableStock = parseStock(row['Available Stock']);
      const initialStock = parseStock(row['Initial Stock']);

      if (availableStock === null) {
        errors.push(
          `Row ${sourceRow}: Available Stock must be a whole number.`,
        );
      } else if (availableStock < 0) {
        errors.push(
          `Row ${sourceRow}: Available Stock cannot be negative.`,
        );
      }

      if (
        normalize(row['Initial Stock']) !== '' &&
        initialStock === null
      ) {
        errors.push(
          `Row ${sourceRow}: Initial Stock must be a whole number when provided.`,
        );
      }

      if (
        sku &&
        productName &&
        availableStock !== null &&
        availableStock >= 0 &&
        (normalize(row['Initial Stock']) === '' || initialStock !== null)
      ) {
        rows.push({
          sku,
          productName,
          initialStock,
          availableStock,
          sourceRow,
        });
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message:
          'Opening balance import cancelled because the workbook has validation errors.',
        errors,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('No SKU rows were found to import.');
    }

    const importKey = createHash('sha256').update(buffer).digest('hex');

    const totalAvailableStock = rows.reduce(
      (sum, row) => sum + row.availableStock,
      0,
    );

    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtext('fimonaa-opening-balance-import'))",
      );

      await manager.query(`
        CREATE TABLE IF NOT EXISTS inventory_skus (
          sku TEXT PRIMARY KEY,
          product_name TEXT NOT NULL,
          initial_stock INTEGER NULL,
          available_stock INTEGER NOT NULL CHECK (available_stock >= 0),
          source_sheet TEXT NOT NULL,
          source_row INTEGER NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await manager.query(`
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

      await manager.query(`
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

      const priorRuns = await manager.query(
        'SELECT id FROM inventory_opening_balance_imports LIMIT 1',
      );

      const priorSkus = await manager.query(
        'SELECT sku FROM inventory_skus LIMIT 1',
      );

      if (priorRuns.length > 0 || priorSkus.length > 0) {
        throw new ConflictException(
          'Inventory already contains SKUs or an opening balance import. Nothing was imported. Review the database before attempting a replacement.',
        );
      }

      await manager.query(
        `INSERT INTO inventory_opening_balance_imports
          (
            import_key,
            workbook_name,
            worksheet_name,
            sku_count,
            total_available_stock
          )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          importKey,
          workbookName,
          worksheetName,
          rows.length,
          totalAvailableStock,
        ],
      );

      for (const row of rows) {
        await manager.query(
          `INSERT INTO inventory_skus
            (
              sku,
              product_name,
              initial_stock,
              available_stock,
              source_sheet,
              source_row
            )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            row.sku,
            row.productName,
            row.initialStock,
            row.availableStock,
            worksheetName,
            row.sourceRow,
          ],
        );

        await manager.query(
          `INSERT INTO inventory_movements
            (
              sku,
              movement_type,
              quantity_delta,
              quantity_after,
              reference,
              notes
            )
           VALUES ($1, 'OPENING_BALANCE', $2, $3, $4, $5)`,
          [
            row.sku,
            row.availableStock,
            row.availableStock,
            importKey,
            'Opening balance imported from Excel Available Stock. Historical orders and returns were not imported.',
          ],
        );
      }

      return {
        mode: 'opening-balance-import',
        status: 'success',
        workbook: workbookName,
        worksheet: worksheetName,
        importedSkuCount: rows.length,
        totalAvailableStock,
        movementRowsCreated: rows.length,
        note: 'Current Available Stock was imported as opening balance. Initial Stock was retained as metadata only. No historical orders, returns, or Shopify inventory were changed.',
      };
    });
  }
}
