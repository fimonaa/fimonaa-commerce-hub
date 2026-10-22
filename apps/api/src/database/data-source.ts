import 'dotenv/config';
import { DataSource } from 'typeorm';
/**
 * Standalone TypeORM configuration for migration commands.
 *
 * The NestJS application configures TypeORM through AppModule.
 * The CLI cannot rely on NestJS bootstrapping, so it needs its own
 * DataSource instance.
 *
 * DATABASE_URL is loaded from the environment. dotenv/config supports
 * the normal root-level .env file when commands run from the repository root.
 *
 * Keep synchronize disabled. Database structure changes must be
 * introduced through reviewed, version-controlled migrations.
 */
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: 'typeorm_migrations',
  migrations: ['src/database/migrations/*.ts'],
});
export default dataSource;
