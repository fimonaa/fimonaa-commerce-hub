/**
 * Synthetic inventory records for local development only.
 *
 * These records are not derived from Fimonaa's SKU workbook.
 * This module does not connect to or modify any database.
 */

export interface DevelopmentInventoryFixture {
  businessSlug: string;
  sku: string;
  productName: string;
  initialStock: number;
  availableStock: number;
  sourceSheet: string;
  sourceRow: number;
}

interface FixtureGroup {
  businessSlug: string;
  count: number;
  inStockCount: number;
  lowStockCount: number;
}

const fixtureGroups: FixtureGroup[] = [
  {
    businessSlug: "commerce-demo-a",
    count: 35,
    inStockCount: 22,
    lowStockCount: 8,
  },
  {
    businessSlug: "commerce-demo-b",
    count: 10,
    inStockCount: 6,
    lowStockCount: 2,
  },
];

/**
 * Generate predictable stock quantities covering all stock statuses.
 *
 * In stock: 6 or more
 * Low stock: 1 to 5
 * Out of stock: 0
 */
function getAvailableStock(
  index: number,
  group: FixtureGroup,
): number {
  if (index < group.inStockCount) {
    return 10 + (index % 11);
  }

  if (index < group.inStockCount + group.lowStockCount) {
    return 1 + (index % 5);
  }

  return 0;
}

/**
 * Build independent product records for each business.
 *
 * SKU codes intentionally overlap across businesses.
 * The database must distinguish them using business_id.
 */
export function createDevelopmentInventoryFixtures():
  DevelopmentInventoryFixture[] {
  return fixtureGroups.flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => {
      const productNumber = index + 1;
      const sku = `DEMO-SKU-${String(productNumber).padStart(3, "0")}`;

      const availableStock = getAvailableStock(index, group);

      return {
        businessSlug: group.businessSlug,
        sku,
        productName: `Demo ${group.businessSlug === "commerce-demo-a" ? "A" : "B"} Product ${String(productNumber).padStart(3, "0")}`,
        initialStock: availableStock + 5,
        availableStock,
        sourceSheet: "Development Fixture",
        sourceRow: productNumber,
      };
    }),
  );
}
