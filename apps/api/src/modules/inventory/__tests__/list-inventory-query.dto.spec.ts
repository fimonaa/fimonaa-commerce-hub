import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListInventoryQueryDto } from '../dto/list-inventory-query.dto';

describe('ListInventoryQueryDto', () => {
  it('uses default values when query parameters are omitted', () => {
    const dto = plainToInstance(ListInventoryQueryDto, {});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(25);
    expect(dto.stockStatus).toBe('all');
  });

  it('trims search input', () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      search: '  evening gown  ',
    });

    expect(dto.search).toBe('evening gown');
  });

  it('converts page and limit strings into numbers', () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      page: '2',
      limit: '50',
    });

    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(50);
  });

  it('rejects a page number below one', async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      page: '0',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('rejects a non-integer page number', async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      page: '1.5',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('rejects a limit greater than 100', async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      limit: '101',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects a limit below one', async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      limit: '0',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'limit')).toBe(true);
  });

  it('rejects an unsupported stock status', async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      stockStatus: 'available_everything',
    });

    const errors = await validate(dto);

    expect(
      errors.some((error) => error.property === 'stockStatus'),
    ).toBe(true);
  });

  it('rejects search input longer than 100 characters', async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      search: 'a'.repeat(101),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'search')).toBe(true);
  });
});