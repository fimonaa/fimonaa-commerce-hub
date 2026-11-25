import { seedDevelopmentInventory } from "./seed-development-inventory";

/**
 * Explicit entry point for the development inventory seed.
 *
 * The seed implementation can be imported by unit tests
 * without automatically connecting to PostgreSQL.
 */
seedDevelopmentInventory().catch(() => {
  // Never expose database credentials or SQL parameters.
  console.error(
    "Development inventory seed failed. Check database configuration and fixture consistency.",
  );

  process.exitCode = 1;
});
