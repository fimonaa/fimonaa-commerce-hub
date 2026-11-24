const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const {
  validateLocalDevDatabase,
} = require("./validate-local-dev-database.cjs");
const apiDirectory = path.resolve(__dirname, "..");
const environmentFile = path.join(apiDirectory, ".env.development.local");

const commands = {
  api: ["nest", "start", "--watch"],

  "migration:show": [
    "typeorm-ts-node-commonjs",
    "-d",
    "src/database/data-source.ts",
    "migration:show",
  ],

  "migration:run": [
    "typeorm-ts-node-commonjs",
    "-d",
    "src/database/data-source.ts",
    "migration:run",
  ],

  "seed:dev-auth": ["ts-node", "src/database/seed-development-auth.ts"],
};

function fail(message) {
  console.error(`Development safety check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(environmentFile)) {
  fail("Development environment file is missing.");
}

const commandName = process.argv[2];

if (!Object.hasOwn(commands, commandName)) {
  fail("Unsupported command.");
}

const environmentContent = fs.readFileSync(environmentFile, "utf8");

/**
 * Preserve the normal process environment while removing inherited
 * PostgreSQL connection settings.
 *
 * The approved development database must be selected explicitly
 * through .env.development.local, never through shell defaults.
 */
const environment = {
  ...process.env,
};

for (const key of Object.keys(environment)) {
  if (key.startsWith("PG") || key === "DATABASE_URL") {
    delete environment[key];
  }
}

for (const line of environmentContent.split(/\r?\n/)) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    continue;
  }

  const match = trimmed.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);

  if (!match) {
    fail("Invalid development environment entry.");
  }

  const [, key, rawValue] = match;

  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  environment[key] = value;
}

/**
 * Validate the database before launching any development command.
 * The shared validator is independently tested and never connects
 * to PostgreSQL.
 */
let databaseName;

try {
  const validated = validateLocalDevDatabase(environment.DATABASE_URL);
  databaseName = validated.databaseName;
} catch (error) {
  fail(
    error instanceof Error ? error.message : "Invalid database configuration.",
  );
}

console.log("Development database safety check passed.");
console.log(`Database: ${databaseName}`);
console.log(`Command: ${commandName}`);

const [executable, ...argumentsList] = commands[commandName];

const child = spawn(
  path.resolve(apiDirectory, "../../node_modules/.bin", executable),
  argumentsList,
  {
    cwd: apiDirectory,
    env: environment,
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  console.error(`Development command failed: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
