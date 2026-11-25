const ALLOWED_DATABASE = "fimonaa_commerce_dev";
/**
 * Node.js URL.hostname retains square brackets for IPv6 addresses.
 * Only explicitly approved local PostgreSQL hosts are permitted.
 */
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Validates that a database URL targets only the approved
 * local development database.
 *
 * This function does not establish a database connection.
 */
function validateLocalDevDatabase(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL is invalid.");
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));

  if (
    !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
    !ALLOWED_HOSTS.has(parsedUrl.hostname) ||
    databaseName !== ALLOWED_DATABASE ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      "Database connection is not the approved local development database.",
    );
  }

  return {
    databaseName,
  };
}

module.exports = {
  validateLocalDevDatabase,
};
