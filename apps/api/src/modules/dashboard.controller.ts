import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('summary')
  async getSummary() {
    const [inventory] = await this.dataSource.query(`
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
    `);

    return {
      totalSkus: inventory.totalSkus,
      availableStock: inventory.availableStock,
      lowStockSkus: inventory.lowStockSkus,
      outOfStockSkus: inventory.outOfStockSkus,

      ordersToday: 0,
      pendingFulfillment: 0,
      failedSyncJobs: 0,

      channels: [
        {
          code: 'shopify',
          name: 'Shopify',
          status: 'not_connected',
        },
        {
          code: 'myntra',
          name: 'Myntra',
          status: 'not_connected',
        },
        {
          code: 'ajio',
          name: 'AJIO',
          status: 'not_connected',
        },
        {
          code: 'nykaa',
          name: 'Nykaa Fashion',
          status: 'not_connected',
        },
      ],
    };
  }
}