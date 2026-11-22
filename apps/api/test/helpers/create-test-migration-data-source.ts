import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';
import { DataSource } from 'typeorm';

import { assertSafeTestDatabase } from './assert-safe-test-database';

export function createTestMigrationDataSource(): DataSource {
  const environmentPath = resolve(__dirname, '../../.env.test');
  const configuration = parse(readFileSync(environmentPath));

  const databaseUrl = assertSafeTestDatabase(
    configuration.TEST_DATABASE_URL,
  );

  if (
    process.env.TEST_DATABASE_URL &&
    process.env.TEST_DATABASE_URL !== databaseUrl
  ) {
    throw new Error(
      'Conflicting TEST_DATABASE_URL detected.',
    );
  }

  if (process.env.DATABASE_URL) {
    const developmentUrl = new URL(process.env.DATABASE_URL);
    const testUrl = new URL(databaseUrl);

    if (
      developmentUrl.href === testUrl.href
    ) {
      throw new Error(
        'Test database must not equal development database.',
      );
    }
  }

  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    migrationsTableName: 'typeorm_migrations',
    migrations: [
      join(
        __dirname,
        '../../src/database/migrations/*.ts',
      ),
    ],
  });
}