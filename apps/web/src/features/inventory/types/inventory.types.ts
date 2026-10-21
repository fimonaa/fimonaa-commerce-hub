// These values must match the stock statuses accepted by the API.
export type InventoryStockStatus =
  | 'all'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'

// One inventory record returned by GET /api/inventory.
export interface InventoryItem {
  sku: string
  productName: string
  initialStock: number | null
  availableStock: number
  stockStatus: Exclude<InventoryStockStatus, 'all'>
  sourceSheet: string
  sourceRow: number
  updatedAt: string
}

// Pagination information returned by the API.
// Keeping this type aligned with the backend lets the UI navigate pages
// without downloading the entire inventory catalogue.
export interface InventoryPaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface InventoryListResponse {
  data: InventoryItem[]
  meta: InventoryPaginationMeta
}

// These parameters correspond to the supported backend query parameters.
export interface InventoryQuery {
  search?: string
  stockStatus?: InventoryStockStatus
  page?: number
  limit?: number
}
