import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { InventoryImportController } from './inventory-import.controller';
import { InventoryOpeningBalanceService } from './inventory-opening-balance.service';

@Module({
  imports: [ConfigModule],
  controllers: [InventoryImportController],
  providers: [InventoryOpeningBalanceService],
})
export class ImportsModule {}