/**
 * Prevent integration tests from connecting to protected databases.
 *
 * This check must run BEFORE DataSource.initialize().
 */
export function assertSafeTestDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      'Integration tests require an explicit TEST_DATABASE_URL.',
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL is not a valid connection URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('Integration tests require a PostgreSQL connection.');
  }

  // Reject connection parameters that could override the target database.
  if (parsed.search || parsed.hash) {
    throw new Error(
      'Integration-test database URLs must not contain query parameters or fragments.',
    );
  }

  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    throw new Error(
      'Integration tests may connect only to local PostgreSQL.',
    );
  }

  const databaseName = decodeURIComponent(parsed.pathname.slice(1));

  if (databaseName !== 'fimonaa_commerce_import_test') {
    throw new Error(
      'Unsafe integration-test database. Only fimonaa_commerce_import_test is permitted.',
    );
  }

  return databaseUrl;
}
