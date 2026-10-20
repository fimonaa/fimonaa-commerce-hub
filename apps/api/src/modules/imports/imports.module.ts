import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { InventoryImportController } from './inventory-import.controller';
import { InventoryOpeningBalanceService } from './inventory-opening-balance.service';
import { ExcelWorkbookReaderService } from './excel-workbook-reader.service';

@Module({
  imports: [ConfigModule],
  controllers: [InventoryImportController],
  providers: [
    InventoryOpeningBalanceService,
    ExcelWorkbookReaderService,
  ],
})
export class ImportsModule {}
