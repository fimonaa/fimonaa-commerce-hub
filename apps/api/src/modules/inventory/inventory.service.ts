import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import {
  ListInventoryQueryDto,
  type InventoryStockStatus,
} from './dto/list-inventory-query.dto';

import type {
  InventoryItem,
  InventoryItemStatus,
  InventoryListResponse,
} from './types/inventory.types';

@Injectable()
export class InventoryService {
  constructor(private readonly dataSource: DataSource) {}

  async listInventory(
    query: ListInventoryQueryDto,
  ): Promise<InventoryListResponse> {
    const {
      search,
      stockStatus = 'all',
      page = 1,
      limit = 25,
    } = query;

    // Share the WHERE clause between the count and result queries
    // so both queries apply exactly the same filters.
    const conditions: string[] = [];
    const parameters: unknown[] = [];

    if (search?.trim()) {
      // Bind the search term separately to prevent SQL injection.
      parameters.push(`%${search.trim()}%`);

      // Search both SKU and product name without case sensitivity.
      conditions.push(
        `(sku ILIKE $${parameters.length}
          OR product_name ILIKE $${parameters.length})`,
      );
    }

    // Only predefined stock conditions are added to the SQL.
    this.addStockStatusFilter(stockStatus, conditions);

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    // Count matching records without loading all inventory rows.
    const countRows: Array<{ totalItems: number }> =
      await this.dataSource.query(
        `
          SELECT COUNT(*)::int AS "totalItems"
          FROM inventory_skus
          ${whereClause}
        `,
        parameters,
      );

    const totalItems = countRows[0]?.totalItems ?? 0;

    // Sort by SKU for deterministic pagination.
    const offset = (page - 1) * limit;

    // Append pagination parameters after the search parameters.
    const dataParameters = [...parameters, limit, offset];

    const rows: Array<{
      sku: string;
      productName: string;
      initialStock: number | null;
      availableStock: number;
      stockStatus: InventoryItemStatus;
      sourceSheet: string;
      sourceRow: number;
      updatedAt: Date;
    }> = await this.dataSource.query(
      `
        SELECT
          sku,
          product_name AS "productName",
          initial_stock AS "initialStock",
          available_stock AS "availableStock",
          CASE
            WHEN available_stock = 0 THEN 'out_of_stock'
            WHEN available_stock BETWEEN 1 AND 5 THEN 'low_stock'
            ELSE 'in_stock'
          END AS "stockStatus",
          source_sheet AS "sourceSheet",
          source_row AS "sourceRow",
          updated_at AS "updatedAt"
        FROM inventory_skus
        ${whereClause}
        ORDER BY sku ASC
        LIMIT $${parameters.length + 1}
        OFFSET $${parameters.length + 2}
      `,
      dataParameters,
    );

    // Normalize numeric fields at the API boundary while preserving
    // NULL for initialStock when no opening quantity was recorded.
    const data: InventoryItem[] = rows.map((row) => ({
      ...row,
      initialStock:
        row.initialStock === null
          ? null
          : Number(row.initialStock),
      availableStock: Number(row.availableStock),
      sourceRow: Number(row.sourceRow),
    }));

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  // Keep stock thresholds consistent with the dashboard:
  // zero is out of stock, 1-5 is low stock, and 6+ is in stock.
  private addStockStatusFilter(
    stockStatus: InventoryStockStatus,
    conditions: string[],
  ): void {
    switch (stockStatus) {
      case 'in_stock':
        conditions.push('available_stock > 5');
        break;

      case 'low_stock':
        conditions.push('available_stock BETWEEN 1 AND 5');
        break;

      case 'out_of_stock':
        conditions.push('available_stock = 0');
        break;

      case 'all':
        // No stock filter is needed when all statuses are requested.
        break;
    }
  }
}