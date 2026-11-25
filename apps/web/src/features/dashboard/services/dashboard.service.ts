import { apiGet, type ApiRequestOptions } from "../../../services/api/client";

import type { DashboardSummary } from "../types/dashboard.types";

type DashboardSummaryResponse = DashboardSummary & {
  data?: DashboardSummary;
};

export async function getDashboardSummary(
  options: ApiRequestOptions,
): Promise<DashboardSummary> {
  if (!options.accessToken || !options.businessId) {
    throw new Error("Authentication and business selection are required.");
  }

  const payload = await apiGet<DashboardSummaryResponse>(
    "/dashboard/summary",
    options,
  );

  if (payload === null || typeof payload !== "object") {
    throw new Error("Invalid dashboard summary response");
  }

  const summary =
    payload.data !== null && typeof payload.data === "object"
      ? payload.data
      : payload;

  return summary;
}
