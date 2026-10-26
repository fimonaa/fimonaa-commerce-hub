import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/types/authenticated-user.type';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { InventoryService } from './inventory.service';
import type { InventoryListResponse } from './types/inventory.types';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  // GET /api/inventory
  // Business context is verified by the global AuthenticationGuard.
  // Query validation is handled by the global ValidationPipe.
  @Get()
  listInventory(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListInventoryQueryDto,
  ): Promise<InventoryListResponse> {
    const businessId = request.user?.businessId;

    if (!businessId) {
      throw new UnauthorizedException(
        'Authenticated business context required',
      );
    }

    return this.inventoryService.listInventory(businessId, query);
  }
}
