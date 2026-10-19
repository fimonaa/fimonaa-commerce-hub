import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, stat } from 'node:fs/promises';
import { FileInterceptor } from '@nestjs/platform-express';
import { InventoryOpeningBalanceService } from './inventory-opening-balance.service';
import * as XLSX from 'xlsx';

@Controller('inventory-import')
export class InventoryImportController {
  constructor(
    private readonly configService: ConfigService,
    private readonly inventoryOpeningBalanceService: InventoryOpeningBalanceService,
  ) {}

  @Get('validate-local')
  async validateLocalWorkbook() {
    const workbookPath = this.configService.get<string>(
      'FIMONAA_SKU_WORKBOOK_PATH',
    );

    if (!workbookPath) {
      throw new InternalServerErrorException(
        'FIMONAA_SKU_WORKBOOK_PATH is not configured in apps/api/.env',
      );
    }

    let buffer: Buffer;
    let workbookStats: Awaited<ReturnType<typeof stat>>;

    try {
      [buffer, workbookStats] = await Promise.all([
        readFile(workbookPath),
        stat(workbookPath),
      ]);
    } catch {
      throw new InternalServerErrorException(
        `Unable to read the configured SKU workbook at: ${workbookPath}`,
      );
    }

    return {
      ...this.validateWorkbookBuffer(
        buffer,
        workbookPath.split('/').pop() ?? 'SKU workbook',
      ),
      source: 'configured-local-file',
      filePath: workbookPath,
      fileSizeBytes: workbookStats.size,
      lastModified: workbookStats.mtime.toISOString(),
    };
  }

  @Post('validate')
  @UseInterceptors(FileInterceptor('file'))
  validateWorkbook(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Upload an Excel workbook using the file field.',
      );
    }

    return this.validateWorkbookBuffer(file.buffer, file.originalname);
  }

  private validateWorkbookBuffer(buffer: Buffer, workbookName: string) {
    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,
      });
    } catch {
      throw new BadRequestException(
        'The uploaded file could not be read as an Excel workbook.',
      );
    }

    const sheetName = 'SKU Generator';
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new BadRequestException(
        `Required worksheet "${sheetName}" was not found.`,
      );
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    });

    const normalize = (value: unknown) => String(value ?? '').trim();

    const skuCounts = new Map<string, number>();
    const errors: Array<{ row: number; issue: string }> = [];
    const warnings: Array<{ row: number; issue: string }> = [];

    let populatedRows = 0;
    let numericStockRows = 0;
    let negativeStockRows = 0;
    let missingSkuRows = 0;
    let missingProductNameRows = 0;
    let initialStockTotal = 0;
    let availableStockTotal = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const sku = normalize(row['SKU Code']);
      const productName = normalize(row['Product Name']);
      const initialStockText = normalize(row['Initial Stock']);
      const availableStockText = normalize(row['Available Stock']);

      const hasAnyData = Object.values(row).some(
        (value) => normalize(value) !== '',
      );

      if (!hasAnyData || (!sku && !productName)) {
        return;
      }

      populatedRows += 1;

      if (!sku) {
        missingSkuRows += 1;
        errors.push({
          row: rowNumber,
          issue: 'Missing SKU Code.',
        });
      } else {
        skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
      }

      if (!productName) {
        missingProductNameRows += 1;
        errors.push({
          row: rowNumber,
          issue: 'Missing Product Name.',
        });
      }

      const initialStock =
        initialStockText === ''
          ? NaN
          : Number(initialStockText.replace(/,/g, ''));

      const availableStock =
        availableStockText === ''
          ? NaN
          : Number(availableStockText.replace(/,/g, ''));

      if (!Number.isFinite(availableStock)) {
        errors.push({
          row: rowNumber,
          issue:
            'Available Stock is missing or not numeric; it will not be imported.',
        });
      } else {
        numericStockRows += 1;
        availableStockTotal += availableStock;

        if (availableStock < 0) {
          negativeStockRows += 1;
          warnings.push({
            row: rowNumber,
            issue: `Available Stock is negative (${availableStock}).`,
          });
        }
      }

      if (Number.isFinite(initialStock)) {
        initialStockTotal += initialStock;
      } else {
        warnings.push({
          row: rowNumber,
          issue: 'Initial Stock is missing or not numeric.',
        });
      }
    });

    const duplicateSkus = [...skuCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([sku, count]) => ({ sku, count }));

    duplicateSkus.forEach(({ sku, count }) => {
      errors.push({
        row: 0,
        issue: `Duplicate SKU "${sku}" appears ${count} times.`,
      });
    });

    return {
      mode: 'validation-only',
      workbook: workbookName,
      worksheet: sheetName,
      summary: {
        populatedRows,
        uniqueSkus: skuCounts.size,
        duplicateSkuCount: duplicateSkus.length,
        missingSkuRows,
        missingProductNameRows,
        numericStockRows,
        negativeStockRows,
        initialStockTotal,
        availableStockTotal,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
      duplicateSkus,
      errors,
      warnings,
      note: 'Validation only. No database records or Shopify inventory were changed.',
    };
  }
  @Post('import-opening-balance')
  async importOpeningBalance() {
    return this.inventoryOpeningBalanceService.importOpeningBalance();
  }
}