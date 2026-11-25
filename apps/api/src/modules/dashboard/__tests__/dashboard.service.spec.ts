import { DashboardService } from "../dashboard.service";
import type { DataSource } from "typeorm";

describe("DashboardService", () => {
  const businessId = "11111111-1111-4111-8111-111111111111";

  const inventoryMetrics = {
    totalSkus: 12,
    availableStock: 45,
    lowStockSkus: 3,
    outOfStockSkus: 2,
  };

  let service: DashboardService;
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue([inventoryMetrics]);

    const dataSource = {
      query,
    } as unknown as DataSource;

    service = new DashboardService(dataSource);
  });

  it("restricts dashboard inventory metrics to the authenticated business", async () => {
    await service.getSummary(businessId);

    expect(query).toHaveBeenCalledTimes(1);

    const [sql, parameters] = query.mock.calls[0] as [string, unknown[]];

    expect(sql).toMatch(/WHERE\s+business_id\s*=\s*\$1/i);
    expect(parameters).toEqual([businessId]);

    // The business ID must never be interpolated into SQL.
    expect(sql).not.toContain(businessId);
  });

  it("returns inventory metrics from the business scoped query", async () => {
    const result = await service.getSummary(businessId);

    expect(result).toEqual(expect.objectContaining(inventoryMetrics));
  });

  it("passes different business IDs independently", async () => {
    const secondBusinessId = "22222222-2222-4222-8222-222222222222";

    await service.getSummary(businessId);
    await service.getSummary(secondBusinessId);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/WHERE\s+business_id\s*=\s*\$1/i),
      [businessId],
    );

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/WHERE\s+business_id\s*=\s*\$1/i),
      [secondBusinessId],
    );
  });
});
