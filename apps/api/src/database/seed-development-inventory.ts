import dataSource from "./data-source";
import {
  createDevelopmentInventoryFixtures,
} from "./development-inventory.fixtures";
import {
  validateLocalDevDatabase,
} from "../../scripts/validate-local-dev-database.cjs";

const expectedBusinesses = [
  { slug: "commerce-demo-a", name: "Commerce Demo A" },
  { slug: "commerce-demo-b", name: "Commerce Demo B" },
] as const;

export async function seedDevelopmentInventory(): Promise<void> {
  /**
   * Never initialize a database connection before validating
   * that the target is the approved local development database.
   */
  validateLocalDevDatabase(process.env.DATABASE_URL);

  const fixtures = createDevelopmentInventoryFixtures();

  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const businessIds = new Map<string, string>();

      /**
       * Resolve the existing development businesses.
       * Never create or modify businesses from this seed.
       */
      for (const expected of expectedBusinesses) {
        const rows: Array<{
          id: string;
          name: string;
          status: string;
        }> = await manager.query(
          `
            SELECT id, name, status
            FROM businesses
            WHERE slug = $1
          `,
          [expected.slug],
        );

        if (
          rows.length !== 1 ||
          rows[0].name !== expected.name ||
          rows[0].status !== "active"
        ) {
          throw new Error(
            `Missing or conflicting development business: ${expected.slug}`,
          );
        }

        businessIds.set(expected.slug, rows[0].id);
      }

      /**
       * Insert synthetic inventory without overwriting
       * existing records.
       *
       * PostgreSQL enforces uniqueness per business and SKU.
       */
      for (const fixture of fixtures) {
        const businessId = businessIds.get(fixture.businessSlug);

        if (!businessId) {
          throw new Error("Unknown development business.");
        }

        await manager.query(
          `
            INSERT INTO inventory_skus (
              business_id,
              sku,
              product_name,
              initial_stock,
              available_stock,
              source_sheet,
              source_row
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (business_id, sku) DO NOTHING
          `,
          [
            businessId,
            fixture.sku,
            fixture.productName,
            fixture.initialStock,
            fixture.availableStock,
            fixture.sourceSheet,
            fixture.sourceRow,
          ],
        );

        /**
         * Validate existing and newly inserted records.
         * Any mismatch aborts the entire transaction.
         */
        const rows: Array<{
          product_name: string;
          initial_stock: number | null;
          available_stock: number;
          source_sheet: string;
          source_row: number;
        }> = await manager.query(
          `
            SELECT
              product_name,
              initial_stock,
              available_stock,
              source_sheet,
              source_row
            FROM inventory_skus
            WHERE business_id = $1
              AND sku = $2
          `,
          [businessId, fixture.sku],
        );

        const record = rows[0];

        if (
          rows.length !== 1 ||
          record.product_name !== fixture.productName ||
          Number(record.initial_stock) !== fixture.initialStock ||
          Number(record.available_stock) !== fixture.availableStock ||
          record.source_sheet !== fixture.sourceSheet ||
          Number(record.source_row) !== fixture.sourceRow
        ) {
          throw new Error(
            `Conflicting development inventory fixture: ${fixture.businessSlug}/${fixture.sku}`,
          );
        }
      }
    });

    console.log("Development inventory fixtures verified successfully.");
    console.log(`Synthetic inventory records: ${fixtures.length}`);
    console.log("Commerce Demo A: 35");
    console.log("Commerce Demo B: 10");
  } finally {
    await dataSource.destroy();
  }
}
