import { apiGet } from '../../../services/api/client'
import type { DashboardSummary } from '../types/dashboard.types'

type DashboardSummaryResponse = DashboardSummary & {
  data?: DashboardSummary
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const payload = await apiGet<DashboardSummaryResponse>(
    '/dashboard/summary',
  )

  if (payload === null || typeof payload !== 'object') {
    throw new Error('Invalid dashboard summary response')
  }

  const summary =
    payload.data !== null && typeof payload.data === 'object'
      ? payload.data
      : payload

  return summary
}