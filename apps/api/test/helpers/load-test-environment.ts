import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { parse } from 'dotenv';
import { assertSafeTestDatabase } from './assert-safe-test-database';

const environmentPath = resolve(__dirname, '../../.env.test');

const configuration = parse(readFileSync(environmentPath));

const databaseUrl = configuration.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Integration-test environment must define TEST_DATABASE_URL.');
}

assertSafeTestDatabase(databaseUrl);

if (
  process.env.TEST_DATABASE_URL &&
  process.env.TEST_DATABASE_URL !== databaseUrl
) {
  throw new Error(
    'Conflicting TEST_DATABASE_URL detected. Integration tests cannot continue.',
  );
}

// Force the complete NestJS application to use the validated test database.
// This must execute before AppModule initializes its TypeORM connection.
process.env.TEST_DATABASE_URL = databaseUrl;
process.env.DATABASE_URL = databaseUrl;

// Use a dedicated JWT secret for integration tests.
const testJwtSecret = configuration.JWT_SECRET;

if (!testJwtSecret || testJwtSecret.length < 64) {
  throw new Error(
    'Integration tests require a dedicated JWT_SECRET of at least 64 characters.',
  );
}

process.env.JWT_SECRET = testJwtSecret;

// Force every integration test to use the committed synthetic workbook.
// Never allow the application's production workbook path to be inherited.
const testWorkbookPath = resolve(
  __dirname,
  '../fixtures/opening-balance-test.xlsx',
);

if (!existsSync(testWorkbookPath)) {
  throw new Error(
    'Synthetic integration-test workbook is missing. Tests cannot continue.',
  );
}

process.env.FIMONAA_SKU_WORKBOOK_PATH = testWorkbookPath;
