import { Controller, Get, Query } from '@nestjs/common';

import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { InventoryService } from './inventory.service';
import type { InventoryListResponse } from './types/inventory.types';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  // GET /api/inventory
  // Query validation is handled by the global ValidationPipe.
  @Get()
  listInventory(
    @Query() query: ListInventoryQueryDto,
  ): Promise<InventoryListResponse> {
    return this.inventoryService.listInventory(query);
  }
}