import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// These values define the only supported stock filters.
// Keeping them explicit prevents arbitrary filter expressions from
// reaching the database layer.
export const INVENTORY_STOCK_STATUSES = [
  'all',
  'in_stock',
  'low_stock',
  'out_of_stock',
] as const;

export type InventoryStockStatus =
  (typeof INVENTORY_STOCK_STATUSES)[number];

export class ListInventoryQueryDto {
  // Trim search input before validation and querying.
  // This prevents leading or trailing spaces from affecting searches.
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  // Default to all inventory when the caller doesn't specify a filter.
  // Unsupported values are rejected with HTTP 400.
  @IsOptional()
  @IsIn(INVENTORY_STOCK_STATUSES)
  stockStatus: InventoryStockStatus = 'all';

  // URL query parameters arrive as strings, so convert them to numbers
  // before validating that page is a positive integer.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  // Limit the number of records per response to protect the API
  // from unnecessarily large requests.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}