import { apiGet } from '../../../services/api/client'
import type {
  InventoryListResponse,
  InventoryQuery,
} from '../types/inventory.types'

// Build query parameters with URLSearchParams rather than concatenating
// raw user input into the URL.
export async function getInventory(
  query: InventoryQuery = {},
  signal?: AbortSignal,
): Promise<InventoryListResponse> {
  const params = new URLSearchParams()

  // Only include search when it contains meaningful text.
  const search = query.search?.trim()

  if (search) {
    params.set('search', search)
  }

  // The API defaults to "all", page 1, and 25 records per page.
  // Send the chosen values explicitly so requests are easy to inspect.
  params.set('stockStatus', query.stockStatus ?? 'all')
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? 25))

  const queryString = params.toString()

  // Reuse the shared client so API base URL and error handling stay
  // consistent across the dashboard and inventory features.
  return apiGet<InventoryListResponse>(
    `/inventory?${queryString}`,
    { signal },
  )
}
