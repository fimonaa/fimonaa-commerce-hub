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

/**
 * A validated inventory row extracted from the Excel workbook.
 */
interface OpeningBalanceRow {
  sku: string;
  productName: string;
  initialStock: number | null;
  availableStock: number;
  sourceRow: number;
}

/**
 * Imports the opening inventory balance for a specific business.
 *
 * IMPORTANT:
 * This service must only be called after authentication and
 * business-level authorization have been verified.
 *
 * The public import endpoint remains disabled until those
 * security controls are implemented.
 */
@Injectable()
export class InventoryOpeningBalanceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly excelWorkbookReaderService: ExcelWorkbookReaderService,
  ) { }

  /**
   * Imports opening inventory into an explicitly selected business.
   *
   * The entire database operation runs inside one transaction.
   * If any database operation fails, PostgreSQL rolls back all changes.
   */
  async importOpeningBalance(businessId: string) {
    /**
     * STEP 1: Validate the business ID.
     *
     * A valid UUID format is required.
     * Business existence and status are verified later in the transaction.
     */
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        businessId,
      )
    ) {
      throw new BadRequestException(
        'A valid business ID is required for opening-balance imports.',
      );
    }

    /**
     * STEP 2: Locate the configured Excel workbook.
     */
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

    /**
     * STEP 3: Read the inventory worksheet.
     */
    const { rows: rawRows } =
      await this.excelWorkbookReaderService.readWorksheet(
        buffer,
        worksheetName,
      );

    const normalize = (value: unknown) => String(value ?? '').trim();

    const rows: OpeningBalanceRow[] = [];
    const seenSkus = new Set<string>();
    const errors: string[] = [];

    /**
     * STEP 4: Validate every populated inventory row.
     *
     * Validation happens before any database writes.
     */
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

      /**
       * Convert Excel stock values into whole numbers.
       *
       * Empty values return null.
       * Decimal or nonnumeric values are rejected.
       */
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

    /**
     * Reject the entire workbook if validation fails.
     *
     * We never partially import an invalid workbook.
     */
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

    /**
     * STEP 5: Calculate import metadata.
     *
     * The SHA-256 hash identifies the workbook contents.
     */
    const importKey = createHash('sha256')
      .update(buffer)
      .digest('hex');

    const totalAvailableStock = rows.reduce(
      (sum, row) => sum + row.availableStock,
      0,
    );

    /**
     * STEP 6: Begin the database transaction.
     *
     * All inventory records, movements, and import history
     * are committed together or rolled back together.
     */
    return this.dataSource.transaction(async (manager) => {
      /**
       * Prevent simultaneous opening-balance imports into
       * the same business.
       *
       * The lock is automatically released when the
       * transaction completes.
       */
      await manager.query(
        `
          SELECT pg_advisory_xact_lock(
            hashtext('fimonaa-opening-balance-import'),
            hashtext($1::text)
          )
        `,
        [businessId],
      );

      /**
       * STEP 7: Verify the target business exists and is active.
       */
      const businesses: Array<{
        id: string;
        name: string;
        status: string;
      }> = await manager.query(
        `
          SELECT id, name, status
          FROM businesses
          WHERE id = $1
          LIMIT 1
        `,
        [businessId],
      );

      if (businesses.length === 0) {
        throw new BadRequestException(
          'The selected business does not exist.',
        );
      }

      const business = businesses[0];

      if (business.status !== 'active') {
        throw new ConflictException(
          'Opening-balance imports are only permitted for active businesses.',
        );
      }

      /**
       * STEP 8: Check whether this business already has inventory.
       *
       * A business must not receive another opening-balance import
       * when inventory or an opening-balance import already exists.
       *
       * Other businesses are checked independently.
       */
      const priorRuns: Array<{ id: number }> = await manager.query(
        `
          SELECT id
          FROM inventory_opening_balance_imports
          WHERE business_id = $1
          LIMIT 1
        `,
        [businessId],
      );

      const priorSkus: Array<{ sku: string }> = await manager.query(
        `
          SELECT sku
          FROM inventory_skus
          WHERE business_id = $1
          LIMIT 1
        `,
        [businessId],
      );

      if (priorRuns.length > 0 || priorSkus.length > 0) {
        throw new ConflictException(
          'This business already contains inventory or an opening-balance import. Nothing was imported.',
        );
      }

      /**
       * STEP 9: Record the opening-balance import.
       *
       * Every import belongs to exactly one business.
       */
      await manager.query(
        `
          INSERT INTO inventory_opening_balance_imports (
            business_id,
            import_key,
            workbook_name,
            worksheet_name,
            sku_count,
            total_available_stock
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          businessId,
          importKey,
          workbookName,
          worksheetName,
          rows.length,
          totalAvailableStock,
        ],
      );

      /**
       * STEP 10: Insert inventory and opening-balance movements.
       *
       * Both inventory_skus and inventory_movements receive
       * the same business ID.
       */
      for (const row of rows) {
        await manager.query(
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
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            businessId,
            row.sku,
            row.productName,
            row.initialStock,
            row.availableStock,
            worksheetName,
            row.sourceRow,
          ],
        );

        await manager.query(
          `
            INSERT INTO inventory_movements (
              business_id,
              sku,
              movement_type,
              quantity_delta,
              quantity_after,
              reference,
              notes
            )
            VALUES (
              $1,
              $2,
              'OPENING_BALANCE',
              $3,
              $4,
              $5,
              $6
            )
          `,
          [
            businessId,
            row.sku,
            row.availableStock,
            row.availableStock,
            importKey,
            'Opening balance imported from Excel Available Stock. Historical orders and returns were not imported.',
          ],
        );
      }

      /**
       * STEP 11: Return the import summary.
       */
      return {
        mode: 'opening-balance-import',
        status: 'success',
        businessId,
        businessName: business.name,
        workbook: workbookName,
        worksheet: worksheetName,
        importedSkuCount: rows.length,
        totalAvailableStock,
        movementRowsCreated: rows.length,
        note:
          'Current Available Stock was imported as opening balance. Initial Stock was retained as metadata only. No historical orders, returns, or Shopify inventory were changed.',
      };
    });
  }
}
