const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const scriptsDirectory = path.resolve(__dirname, "..");

/**
 * Execute an isolated copy of the development launcher.
 *
 * The temporary directory contains only the launcher, validator,
 * and test environment configuration. No real project environment
 * files are read or modified.
 *
 * An unsupported command prevents all child command execution.
 */
function runIsolatedLauncher(
  environmentContent,
  inheritedEnvironment = {},
  commandName = "unsupported-test-command",
) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "fimonaa-launcher-test-"),
  );

  const temporaryScriptsDirectory = path.join(temporaryDirectory, "scripts");

  fs.mkdirSync(temporaryScriptsDirectory);

  try {
    for (const filename of [
      "run-local-dev.cjs",
      "validate-local-dev-database.cjs",
    ]) {
      fs.copyFileSync(
        path.join(scriptsDirectory, filename),
        path.join(temporaryScriptsDirectory, filename),
      );
    }

    if (environmentContent !== null) {
      fs.writeFileSync(
        path.join(temporaryDirectory, ".env.development.local"),
        environmentContent,
      );
    }

    return spawnSync(
      process.execPath,
      [path.join(temporaryScriptsDirectory, "run-local-dev.cjs"), commandName],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          ...inheritedEnvironment,
        },
      },
    );
  } finally {
    fs.rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  }
}


test("inventory seed rejects the protected database", () => {
  const result = runIsolatedLauncher(
    "DATABASE_URL=postgresql://localhost:5432/fimonaa_commerce",
    {},
    "seed:dev-inventory",
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Database connection is not the approved local development database/,
  );
  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("inventory seed rejects remote databases", () => {
  const result = runIsolatedLauncher(
    "DATABASE_URL=postgresql://remote.example.com:5432/fimonaa_commerce_dev",
    {},
    "seed:dev-inventory",
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Database connection is not the approved local development database/,
  );
  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("inventory seed rejects missing database configuration", () => {
  const result = runIsolatedLauncher(
    "NODE_ENV=development",
    {},
    "seed:dev-inventory",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is missing/);
  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("rejects missing development environment file", () => {
  const result = runIsolatedLauncher(null);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Development environment file is missing/);
});

test("rejects unsupported commands before execution", () => {
  const result = runIsolatedLauncher(
    "DATABASE_URL=postgresql://localhost:5432/fimonaa_commerce_dev",
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported command/);
  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("inherited DATABASE_URL cannot override launcher configuration", () => {
  const result = runIsolatedLauncher(
    "DATABASE_URL=postgresql://localhost:5432/fimonaa_commerce_dev",
    {
      DATABASE_URL: "postgresql://localhost:5432/fimonaa_commerce",
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported command/);
  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("rejects protected database before command execution", () => {
  const result = runIsolatedLauncher(
    "DATABASE_URL=postgresql://localhost:5432/fimonaa_commerce",
    {},
    "migration:run",
  );

  assert.equal(result.status, 1);

  assert.match(
    result.stderr,
    /Database connection is not the approved local development database/,
  );

  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("rejects remote database before command execution", () => {
  const result = runIsolatedLauncher(
    "DATABASE_URL=postgresql://remote.example.com:5432/fimonaa_commerce_dev",
    {},
    "migration:run",
  );

  assert.equal(result.status, 1);

  assert.match(
    result.stderr,
    /Database connection is not the approved local development database/,
  );

  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});

test("rejects missing DATABASE_URL before command execution", () => {
  const result = runIsolatedLauncher(
    "NODE_ENV=development",
    {},
    "migration:run",
  );

  assert.equal(result.status, 1);

  assert.match(result.stderr, /DATABASE_URL is missing/);

  assert.doesNotMatch(
    result.stdout,
    /Development database safety check passed/,
  );
});
