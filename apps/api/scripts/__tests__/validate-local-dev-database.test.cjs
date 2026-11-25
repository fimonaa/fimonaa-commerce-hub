const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateLocalDevDatabase,
} = require("../validate-local-dev-database.cjs");

const approvedUrl = "postgresql://localhost:5432/fimonaa_commerce_dev";

test("accepts the approved local development database", () => {
  const result = validateLocalDevDatabase(approvedUrl);

  assert.deepEqual(result, {
    databaseName: "fimonaa_commerce_dev",
  });
});

test("rejects the protected Fimonaa database", () => {
  assert.throws(
    () =>
      validateLocalDevDatabase("postgresql://localhost:5432/fimonaa_commerce"),
    /not the approved local development database/,
  );
});

test("rejects remote database hosts", () => {
  assert.throws(
    () =>
      validateLocalDevDatabase(
        "postgresql://database.example.com:5432/fimonaa_commerce_dev",
      ),
    /not the approved local development database/,
  );
});

test("rejects missing DATABASE_URL", () => {
  assert.throws(
    () => validateLocalDevDatabase(undefined),
    /DATABASE_URL is missing/,
  );
});

test("rejects invalid database URLs", () => {
  assert.throws(
    () => validateLocalDevDatabase("not-a-database-url"),
    /DATABASE_URL is invalid/,
  );
});

test("rejects database URLs containing query parameters", () => {
  assert.throws(
    () => validateLocalDevDatabase(`${approvedUrl}?sslmode=require`),
    /not the approved local development database/,
  );
});

test("rejects database URLs containing fragments", () => {
  assert.throws(
    () => validateLocalDevDatabase(`${approvedUrl}#unsafe`),
    /not the approved local development database/,
  );
});

test("accepts approved loopback addresses", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const result = validateLocalDevDatabase(
      `postgresql://${host}:5432/fimonaa_commerce_dev`,
    );

    assert.equal(result.databaseName, "fimonaa_commerce_dev");
  }
});
