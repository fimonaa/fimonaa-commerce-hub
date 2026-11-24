import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getSummary(businessId: string) {
    /**
     * Dashboard inventory metrics must be scoped to the authenticated
     * business. The business ID comes from the verified authentication
     * context and is passed as a parameterized SQL value.
     *
     * Never calculate dashboard metrics across all businesses.
     */
    const [inventory] = await this.dataSource.query(
      `
      SELECT
        COUNT(*)::int AS "totalSkus",
        COALESCE(SUM(available_stock), 0)::int AS "availableStock",
        COUNT(*) FILTER (
          WHERE available_stock BETWEEN 1 AND 5
        )::int AS "lowStockSkus",
        COUNT(*) FILTER (
          WHERE available_stock = 0
        )::int AS "outOfStockSkus"
      FROM inventory_skus
      WHERE business_id = $1
    `,
      [businessId],
    );

    return {
      totalSkus: inventory.totalSkus,
      availableStock: inventory.availableStock,
      lowStockSkus: inventory.lowStockSkus,
      outOfStockSkus: inventory.outOfStockSkus,

      // These metrics remain placeholders until their respective
      // business scoped modules are implemented.
      ordersToday: 0,
      pendingFulfillment: 0,
      failedSyncJobs: 0,

      channels: [
        { code: "shopify", name: "Shopify", status: "not_connected" },
        { code: "myntra", name: "Myntra", status: "not_connected" },
        { code: "ajio", name: "AJIO", status: "not_connected" },
        {
          code: "nykaa",
          name: "Nykaa Fashion",
          status: "not_connected",
        },
      ],
    };
  }
}
