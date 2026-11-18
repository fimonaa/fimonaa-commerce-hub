import { createTestMigrationDataSource } from './helpers/create-test-migration-data-source';

async function main(): Promise<void> {
    const dataSource = createTestMigrationDataSource();

    try {
        await dataSource.initialize();

        const result: Array<{ database_name: string }> =
            await dataSource.query(
                'SELECT current_database() AS database_name',
            );

        const databaseName = result[0]?.database_name;

        if (databaseName !== 'fimonaa_commerce_import_test') {
            throw new Error(
                `Unsafe database connection: ${databaseName}`,
            );
        }

        const migrations = dataSource.migrations;

        console.log('Connected database:', databaseName);
        console.log('Discovered migrations:', migrations.length);

        for (const migration of migrations) {
            console.log(`  ${migration.name}`);
        }

        const inspect = process.argv.includes('--inspect');
        const apply = process.argv.includes('--apply');

        if (inspect === apply) {
            throw new Error(
                'Specify exactly one mode: --inspect or --apply.',
            );
        }

        if (inspect) {
            const tables: Array<{ table_name: string }> =
                await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

            console.log('\nExisting tables:');
            console.table(tables);

            const migrationTable: Array<{ table_name: string | null }> =
                await dataSource.query(`
      SELECT to_regclass('public.typeorm_migrations')::text
        AS table_name
    `);

            if (migrationTable[0]?.table_name) {
                const appliedMigrations: Array<{
                    name: string;
                    timestamp: string;
                }> = await dataSource.query(`
      SELECT name, timestamp
      FROM typeorm_migrations
      ORDER BY timestamp
    `);

                console.log('\nApplied migrations:');
                console.table(appliedMigrations);
            } else {
                console.log('\nNo TypeORM migration history table exists.');
            }

            console.log('\nInspection completed. No migrations executed.');
            return;
        }

        const executed = await dataSource.runMigrations({
            transaction: 'all',
        });

        console.log(
            `Successfully executed ${executed.length} test migrations.`,
        );
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});