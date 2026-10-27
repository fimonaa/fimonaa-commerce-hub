import { assertSafeTestDatabase } from '../../../test/helpers/assert-safe-test-database';

describe('Integration-test database safety guard', () => {
  const baseUrl = 'postgresql://fimonaa:password@localhost:5432/';

  it('allows the designated disposable import-test database', () => {
    const url = baseUrl + 'fimonaa_commerce_import_test';

    expect(assertSafeTestDatabase(url)).toBe(url);
  });

  it.each([
    'fimonaa_commerce',
    'fimonaa_commerce_workspace_test',
    'fimonaa_commerce_migration_test',
    'fimonaa_commerce_populated_migration_test',
    'postgres',
  ])('rejects database %s', (databaseName) => {
    expect(() =>
      assertSafeTestDatabase(baseUrl + databaseName),
    ).toThrow('Unsafe integration-test database');
  });

  it('rejects missing database configuration', () => {
    expect(() => assertSafeTestDatabase(undefined)).toThrow(
      'Integration tests require an explicit TEST_DATABASE_URL.',
    );
  });

  it('rejects malformed connection URLs', () => {
    expect(() => assertSafeTestDatabase('not-a-url')).toThrow(
      'TEST_DATABASE_URL is not a valid connection URL.',
    );
  });

  it('rejects database URL query parameters', () => {
    expect(() =>
      assertSafeTestDatabase(
        baseUrl + 'fimonaa_commerce_import_test?dbname=fimonaa_commerce',
      ),
    ).toThrow(
      'Integration-test database URLs must not contain query parameters or fragments.',
    );
  });

  it('rejects database URL fragments', () => {
    expect(() =>
      assertSafeTestDatabase(
        baseUrl + 'fimonaa_commerce_import_test#unexpected',
      ),
    ).toThrow(
      'Integration-test database URLs must not contain query parameters or fragments.',
    );
  });

  it('rejects non-PostgreSQL connections', () => {
    expect(() =>
      assertSafeTestDatabase(
        'mysql://localhost/fimonaa_commerce_import_test',
      ),
    ).toThrow('Integration tests require a PostgreSQL connection.');
  });
});


describe('Integration-test database host restrictions', () => {
  it('rejects remote PostgreSQL hosts', () => {
    expect(() =>
      assertSafeTestDatabase(
        'postgresql://fimonaa:password@db.example.com:5432/fimonaa_commerce_import_test',
      ),
    ).toThrow('Integration tests may connect only to local PostgreSQL.');
  });

  it('accepts the designated database on localhost', () => {
    const url =
      'postgresql://fimonaa:password@localhost:5432/fimonaa_commerce_import_test';

    expect(assertSafeTestDatabase(url)).toBe(url);
  });
});
