/**
 * Validates that a PostgreSQL URL points exclusively to the
 * approved local development database.
 *
 * This function does not establish a database connection.
 */
export function validateLocalDevDatabase(databaseUrl: string | undefined): {
  databaseName: string;
};
