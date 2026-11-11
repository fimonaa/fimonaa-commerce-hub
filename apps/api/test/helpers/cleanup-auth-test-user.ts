import { DataSource } from 'typeorm';
import { assertSafeTestDatabase } from './assert-safe-test-database';

export async function cleanupAuthTestUser(
  dataSource: DataSource,
  userId: string,
): Promise<void> {
  const safeDatabaseUrl = assertSafeTestDatabase(
    process.env.TEST_DATABASE_URL,
  );

  if (process.env.DATABASE_URL !== safeDatabaseUrl) {
    throw new Error(
      'Refusing authentication-test cleanup outside the isolated test database.',
    );
  }

  const databaseRows: Array<{ database_name: string }> =
    await dataSource.query('SELECT current_database() AS database_name');

  if (databaseRows[0]?.database_name !== 'fimonaa_commerce_import_test') {
    throw new Error(
      'Refusing authentication-test cleanup on an unexpected database.',
    );
  }

  await dataSource.transaction(async (manager) => {
    await manager.query(
      `DELETE FROM user_invitations
       WHERE user_id = $1
         AND EXISTS (
           SELECT 1
           FROM users
           WHERE id = $1
             AND email LIKE 'auth-test-%@example.invalid'
         )`,
      [userId],
    );

    await manager.query(
      `DELETE FROM users
       WHERE id = $1
         AND email LIKE 'auth-test-%@example.invalid'`,
      [userId],
    );
  });
}
