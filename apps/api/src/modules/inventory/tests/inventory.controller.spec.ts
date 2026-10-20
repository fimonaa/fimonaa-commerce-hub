import { InventoryController } from '../inventory.controller';
import { InventoryService } from '../inventory.service';
import { ListInventoryQueryDto } from '../dto/list-inventory-query.dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryService: jest.Mocked<
    Pick<InventoryService, 'listInventory'>
  >;

  beforeEach(() => {
    // Mock the service so the controller test does not need a database.
    inventoryService = {
      listInventory: jest.fn(),
    };

    controller = new InventoryController(
      inventoryService as unknown as InventoryService,
    );
  });

  it('delegates the query parameters to the inventory service', async () => {
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

    const result = await controller.listInventory(query);

    expect(inventoryService.listInventory).toHaveBeenCalledWith(query);
    expect(result).toEqual(expectedResponse);
  });
});