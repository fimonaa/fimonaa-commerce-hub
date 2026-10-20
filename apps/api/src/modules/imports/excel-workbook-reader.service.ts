import { BadRequestException, Injectable } from '@nestjs/common';
import { readSheet, type SheetData } from 'read-excel-file/node';

export interface ExcelWorksheetData {
  headers: string[];
  rows: Record<string, unknown>[];
}

@Injectable()
export class ExcelWorkbookReaderService {
  async readWorksheet(
    buffer: Buffer,
    worksheetName: string,
  ): Promise<ExcelWorksheetData> {
    let worksheetRows: SheetData;

    try {
      worksheetRows = await readSheet(buffer, worksheetName);
    } catch {
      throw new BadRequestException(
        `The Excel workbook could not be read, or the required worksheet "${worksheetName}" was not found.`,
      );
    }

    if (worksheetRows.length === 0) {
      throw new BadRequestException(
        `Required worksheet "${worksheetName}" is empty.`,
      );
    }

    const headers = worksheetRows[0].map((value) =>
      String(value ?? '').trim(),
    );

    const rows = worksheetRows.slice(1).map((values) => {
      const row: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        if (header) {
          row[header] = values[index] ?? null;
        }
      });

      return row;
    });

    return { headers, rows };
  }
}
