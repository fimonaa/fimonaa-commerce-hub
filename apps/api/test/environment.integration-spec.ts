import { assertSafeTestDatabase } from './helpers/assert-safe-test-database';

describe('Integration-test environment', () => {
  it('loads the dedicated test database configuration', () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;

    expect(databaseUrl).toBeDefined();
    expect(assertSafeTestDatabase(databaseUrl)).toBe(databaseUrl);
  });

  it('targets only the isolated import-test database', () => {
    const databaseUrl = process.env.TEST_DATABASE_URL;

    expect(databaseUrl).toBeDefined();

    const parsed = new URL(databaseUrl!);

    expect(parsed.pathname).toBe('/fimonaa_commerce_import_test');
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(
      parsed.hostname,
    );
  });
});
