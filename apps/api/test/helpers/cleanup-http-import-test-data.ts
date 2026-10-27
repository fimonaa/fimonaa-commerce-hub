import { DataSource } from 'typeorm';
import { assertSafeTestDatabase } from './assert-safe-test-database';

export async function cleanupHttpImportTestData(
  dataSource: DataSource,
  businessId: string,
  userId: string,
): Promise<void> {
  const safeDatabaseUrl = assertSafeTestDatabase(
    process.env.TEST_DATABASE_URL,
  );

  if (process.env.DATABASE_URL !== safeDatabaseUrl) {
    throw new Error('Refusing cleanup outside the isolated test database.');
  }

  const databaseRows: Array<{ database_name: string }> =
    await dataSource.query('SELECT current_database() AS database_name');

  if (databaseRows[0]?.database_name !== 'fimonaa_commerce_import_test') {
    throw new Error('Refusing cleanup on an unexpected database.');
  }

  await dataSource.transaction(async (manager) => {
    await manager.query(
      'DELETE FROM inventory_movements WHERE business_id = $1',
      [businessId],
    );

    await manager.query(
      'DELETE FROM inventory_skus WHERE business_id = $1',
      [businessId],
    );

    await manager.query(
      'DELETE FROM inventory_opening_balance_imports WHERE business_id = $1',
      [businessId],
    );

    await manager.query(
      'DELETE FROM business_memberships WHERE business_id = $1 AND user_id = $2',
      [businessId, userId],
    );

    await manager.query('DELETE FROM users WHERE id = $1', [userId]);
    await manager.query('DELETE FROM businesses WHERE id = $1', [businessId]);
  });
}
