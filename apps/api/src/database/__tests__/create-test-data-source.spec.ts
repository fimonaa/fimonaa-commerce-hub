import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { createTestDataSource } from '../../../test/helpers/create-test-data-source';

describe('Protected integration-test DataSource', () => {
  const originalTestDatabaseUrl = process.env.TEST_DATABASE_URL;

  afterEach(() => {
    if (originalTestDatabaseUrl === undefined) {
      delete process.env.TEST_DATABASE_URL;
    } else {
      process.env.TEST_DATABASE_URL = originalTestDatabaseUrl;
    }
  });

  it('rejects missing TEST_DATABASE_URL', () => {
    delete process.env.TEST_DATABASE_URL;

    expect(() => createTestDataSource()).toThrow(
      'Integration tests require an explicit TEST_DATABASE_URL.',
    );
  });

  it('rejects the protected main database', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://fimonaa:password@localhost:5432/fimonaa_commerce';

    expect(() => createTestDataSource()).toThrow(
      'Unsafe integration-test database',
    );
  });

  it('creates an uninitialized DataSource with safe settings', () => {
    const url =
      'postgresql://fimonaa:password@localhost:5432/fimonaa_commerce_import_test';

    process.env.TEST_DATABASE_URL = url;

    const dataSource = createTestDataSource();

    expect(dataSource.isInitialized).toBe(false);
    expect(dataSource.options.type).toBe('postgres');
    expect(dataSource.options.synchronize).toBe(false);
    expect(dataSource.options.migrationsRun).toBe(false);
    expect((dataSource.options as PostgresConnectionOptions).url).toBe(url);
  });
});
