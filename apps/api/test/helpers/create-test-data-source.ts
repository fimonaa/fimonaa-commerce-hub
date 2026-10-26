import { DataSource } from 'typeorm';
import { assertSafeTestDatabase } from './assert-safe-test-database';

/**
 * Creates an uninitialized DataSource for PostgreSQL integration tests.
 *
 * Never falls back to DATABASE_URL.
 * Never enables automatic schema synchronization or migrations.
 *
 * Call initialize() only after the test environment has been reviewed.
 */
export function createTestDataSource(): DataSource {
  const databaseUrl = assertSafeTestDatabase(
    process.env.TEST_DATABASE_URL,
  );

  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    migrationsRun: false,
    logging: false,
  });
}
