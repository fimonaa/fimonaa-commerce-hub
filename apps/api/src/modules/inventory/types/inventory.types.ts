import type { InventoryStockStatus } from '../dto/list-inventory-query.dto';

// Stock status is derived from availableStock rather than stored separately.
// This ensures the response always reflects the current inventory quantity.
export type InventoryItemStatus = Exclude<
  InventoryStockStatus,
  'all'
>;

export interface InventoryItem {
  sku: string;
  productName: string;
  initialStock: number | null;
  availableStock: number;
  stockStatus: InventoryItemStatus;
  sourceSheet: string;
  sourceRow: number;
  updatedAt: Date;
}

export interface InventoryPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface InventoryListResponse {
  data: InventoryItem[];
  meta: InventoryPaginationMeta;
}