import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { DataSource } from 'typeorm';

import { assertSafeTestDatabase } from './assert-safe-test-database';

async function main(): Promise<void> {
    const environmentPath = resolve(__dirname, '../../.env.test');

    const configuration = parse(readFileSync(environmentPath));

    const databaseUrl = assertSafeTestDatabase(
        configuration.TEST_DATABASE_URL,
    );

    const dataSource = new DataSource({
        type: 'postgres',
        url: databaseUrl,
        synchronize: false,
        migrationsRun: false,
        migrationsTableName: 'typeorm_migrations',
        migrations: [
            resolve(__dirname, '../../src/database/migrations/*.ts'),
        ],
    });

    try {
        await dataSource.initialize();

        const database = await dataSource.query(
            'SELECT current_database() AS name',
        );

        if (database[0]?.name !== 'fimonaa_commerce_import_test') {
            throw new Error('Unexpected database. Migration cancelled.');
        }

        const expectedMigration =
            'AddBusinessMembershipLifecycle1793000000000';

        const migrations = dataSource.migrations.map((migration) => {
            if (!migration.name) {
                throw new Error('Discovered migration without a name.');
            }

            return migration.name;
        });

        if (!migrations.includes(expectedMigration)) {
            throw new Error(
                `Expected migration ${expectedMigration} was not discovered.`,
            );
        }

        const appliedRows: Array<{ name: string }> =
            await dataSource.query(`
        SELECT name
        FROM typeorm_migrations
    `);

        const appliedNames = new Set(
            appliedRows.map((row) => row.name),
        );

        if (appliedNames.has(expectedMigration)) {
            const unexpectedPending = migrations.filter(
                (name) => !appliedNames.has(name),
            );

            if (unexpectedPending.length > 0) {
                throw new Error(
                    `Unexpected pending migrations: ${unexpectedPending.join(', ')}`,
                );
            }

            console.log(
                'Migration already applied:',
                expectedMigration,
            );

            return;
        }

        const pendingNames = migrations.filter(
            (name) => !appliedNames.has(name),
        );

        if (
            pendingNames.length !== 1 ||
            pendingNames[0] !== expectedMigration
        ) {
            throw new Error(
                `Unexpected pending migrations: ${pendingNames.join(', ')}`,
            );
        }

        console.log('Validated pending migration:', expectedMigration);

        const executed = await dataSource.runMigrations({
            transaction: 'all',
        });

        console.log(
            'Executed migrations:',
            executed.map((migration) => migration.name),
        );
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});