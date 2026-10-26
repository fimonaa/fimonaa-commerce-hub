import { UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../auth/types/authenticated-user.type';
import { InventoryController } from '../inventory.controller';
import { InventoryService } from '../inventory.service';
import { ListInventoryQueryDto } from '../dto/list-inventory-query.dto';

describe('InventoryController', () => {
  const businessId = '550e8400-e29b-41d4-a716-446655440001';
  const otherBusinessId = '550e8400-e29b-41d4-a716-446655440002';

  let controller: InventoryController;
  let inventoryService: jest.Mocked<
    Pick<InventoryService, 'listInventory'>
  >;

  const createRequest = (
    selectedBusinessId: string,
  ): AuthenticatedRequest => ({
    user: {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      businessId: selectedBusinessId,
      role: 'inventory_manager',
    },
  });

  beforeEach(() => {
    inventoryService = {
      listInventory: jest.fn(),
    };

    controller = new InventoryController(
      inventoryService as unknown as InventoryService,
    );
  });

  it('passes authenticated business context and query to the service', async () => {
    const request = createRequest(businessId);

    const query = Object.assign(new ListInventoryQueryDto(), {
      search: 'gown',
      stockStatus: 'low_stock' as const,
      page: 2,
      limit: 10,
    });

    const expectedResponse = {
      data: [],
      meta: {
        page: 2,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
      },
    };

    inventoryService.listInventory.mockResolvedValue(expectedResponse);

    const result = await controller.listInventory(request, query);

    expect(inventoryService.listInventory).toHaveBeenCalledWith(
      businessId,
      query,
    );

    expect(result).toEqual(expectedResponse);
  });

  it('uses the authenticated business rather than another business', async () => {
    const request = createRequest(otherBusinessId);
    const query = new ListInventoryQueryDto();

    inventoryService.listInventory.mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
      },
    });

    await controller.listInventory(request, query);

    expect(inventoryService.listInventory).toHaveBeenCalledWith(
      otherBusinessId,
      query,
    );

    expect(inventoryService.listInventory).not.toHaveBeenCalledWith(
      businessId,
      query,
    );
  });

  it('rejects requests without authenticated business context', () => {
    const request = {} as AuthenticatedRequest;
    const query = new ListInventoryQueryDto();

    expect(() => controller.listInventory(request, query)).toThrow(
      UnauthorizedException,
    );

    expect(inventoryService.listInventory).not.toHaveBeenCalled();
  });
});
