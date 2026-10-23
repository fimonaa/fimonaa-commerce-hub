# Fimonaa Commerce Hub
## Development Documentation - Version 1.2

**Status:** Tenant-scoped SKU implementation validated in isolated test databases / not production-ready<br>
**Updated:** 23 October 2026<br>
**Repository:** `fimonaa/fimonaa-commerce-hub`<br>
**Feature branch:** `feature/tenant-scoped-skus`<br>
**Delivery state:** Implementation tested locally; documentation and Git commit pending<br>
**Previous milestone:** `c1047c7` - Business workspaces and inventory ownership migrations

> **Safety notice:** Do not run migrations, imports, seed scripts, or destructive SQL against the main development database or the original Fimonaa India inventory without explicit review and authorization. All experiments must use appropriately isolated test databases or controlled restored copies.

---

## 1. Executive Summary

Version 1.2 documents the implementation and validation of **tenant-scoped SKU identifiers**, extending the business-workspace and inventory-ownership foundation established in version 1.1.

The fifth TypeORM migration introduces an internal UUID primary key for `inventory_skus`, replacing the original globally unique SKU primary key.

Human-readable SKU codes are now unique within each business through:

```sql
UNIQUE (business_id, sku)
```

This allows Fimonaa India, Fimonaa Finland, and future SaaS tenants to use identical SKU codes independently.

The opening-balance import service has also been updated to remove its obsolete global SKU collision check while preserving business-specific duplicate-import protection.

### Completed Implementation

- Introduced UUID-based inventory identifiers.
- Replaced the global SKU primary key.
- Preserved business-scoped SKU uniqueness.
- Preserved composite inventory movement relationships.
- Removed the obsolete global SKU foreign key.
- Updated opening-balance import behavior.
- Updated the corresponding unit tests.
- Created ADR-002 documenting the architectural decision.

### Verification Summary

The implementation was validated through:

- Successful migration execution against isolated empty and populated databases.
- Preservation of existing sample inventory and historical movements.
- Successful cross-business SKU coexistence testing.
- Verification of PostgreSQL primary-key, unique, and foreign-key constraints.
- 31 passing API tests across five suites.
- Successful ESLint and NestJS build checks.
- Successful Git whitespace validation.

### Current Delivery Status

The implementation is being developed on:

`feature/tenant-scoped-skus`

The changes have not yet been committed as this milestone.

**The protected `fimonaa_commerce` database has not been migrated.**

### Production Readiness

The platform remains under development.

Authentication, membership authorization, business-scoped inventory APIs, automated PostgreSQL integration tests, and deployment safeguards remain outstanding.

The SKU Excel workbook continues to be the inventory source of truth under ADR-001.

No live inventory synchronization or source-of-truth cutover has occurred.

---

## 2. Product Direction and Scope

Fimonaa Commerce Hub is an **inventory-first, multi-business commerce operations platform** designed to support Fimonaa India and Fimonaa Finland initially, with the potential to serve additional SaaS tenants.

The platform must support independently created businesses, their users and memberships, inventory, opening balances, and future order, return, warehouse, and marketplace integrations.

Fimonaa India and Fimonaa Finland are initial business examples under one owner.

They are **not hardcoded tenants or mandatory records in every installation**.

### Core Design Principles

1. Every business owns its operational records.
2. Users may have different roles across different businesses.
3. Inventory must be isolated at both database and application levels.
4. Database constraints complement authentication and authorization.
5. Historical inventory must be preserved through controlled migrations.
6. Stock movements and opening balances must remain auditable.
7. Inventory operations must be transactionally consistent.
8. Human-readable SKU codes must be unique within businesses, not globally.
9. The platform must remain extensible for future SaaS tenants.
10. The Excel SKU workbook remains authoritative until an approved cutover.

### Architecture References

- ADR-001: Inventory Source of Truth and Controlled Cutover
- ADR-002: Tenant-Scoped SKU Identifiers

---

## 3. Technical Stack and Repository

| Layer | Technology / Detail |
|---|---|
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3.31 |
| Frontend | React 19 |
| Frontend tooling | Vite 8 |
| Styling | Tailwind CSS 4 |
| Supporting service | Redis 7 |
| Testing | Jest unit tests and manual PostgreSQL integration checks |
| API documentation | Swagger / OpenAPI outside production at `/api/docs` |
| Working branch | `feature/tenant-scoped-skus` |
| Migration tracking | `typeorm_migrations` |
| Architecture | Modular monolith |
| Multi-tenancy | Business ownership through `business_id` |

### Relevant Repository Paths

```text
apps/
├── api/
│   └── src/
│       ├── database/
│       │   ├── data-source.ts
│       │   ├── migrations/
│       │   └── seed-businesses.ts
│       └── modules/
│           └── imports/
│               ├── inventory-import.controller.ts
│               ├── inventory-opening-balance.service.ts
│               └── __tests__/
├── web/
└── worker/

docs/
├── architecture/
│   └── decisions/
│       ├── ADR-001-inventory-source-of-truth.md
│       └── ADR-002-tenant-scoped-sku-identifiers.md
├── development-documentation_v1.0.md
├── development-documentation_v1.1.md
├── development-documentation_v1.2.md
└── IMPLEMENTATION_PLAN.md
```

### Migration Configuration

The standalone TypeORM data source:

`apps/api/src/database/data-source.ts`

uses the following settings:

```typescript
synchronize: false
migrationsRun: false
migrationsTableName: 'typeorm_migrations'
migrations: ['src/database/migrations/*.ts']
```

Migrations must be executed explicitly against a verified database target.

Compiled JavaScript migration discovery and deployment remain to be validated before production use.

---

## 4. Data Model and Tenancy

### 4.1 Business Identity and Membership

The foundational schema includes:

**businesses**

Represents individual business workspaces.

**users**

Represents platform users.

**business_memberships**

Associates users with businesses and defines their business-specific roles.

Supported role concepts include:

- owner
- admin
- inventory_manager
- operator
- viewer

Business membership records provide the foundation for future authorization.

**Important:** The presence of membership tables does not mean authentication or authorization is implemented.

### 4.2 Inventory Ownership

The inventory schema contains:

| Table | Responsibility |
|---|---|
| `inventory_skus` | SKU records and stock quantities |
| `inventory_movements` | Inventory movement history |
| `inventory_opening_balance_imports` | Opening-balance import audit records |

Each table contains `business_id` to identify the owning business.

Inventory opening-balance import keys are unique within a business:

```sql
UNIQUE (business_id, import_key)
```

### 4.3 Tenant-Scoped SKU Identity

Migration 5 introduces a separate internal identifier for inventory records.

The relevant inventory identity fields are:

| Field | Purpose |
|---|---|
| `id` | Internal UUID inventory identifier |
| `business_id` | Owning business |
| `sku` | Human-readable product variant code |

The primary key is:

```sql
PRIMARY KEY (id)
```

SKU uniqueness is enforced through:

```sql
UNIQUE (business_id, sku)
```

This means two businesses can use the same SKU string.

For example:

| Business | SKU | Available Stock |
|---|---|---:|
| Fimonaa India | FIM-TEST-001 | 10 |
| Fimonaa Finland | FIM-TEST-001 | 5 |

The records have different internal UUID identifiers.

These values are from a controlled migration test, not live business inventory.

### 4.4 Inventory Movement Relationships

Inventory movements continue referencing inventory records through:

```sql
FOREIGN KEY (business_id, sku)
REFERENCES inventory_skus(business_id, sku)
ON DELETE RESTRICT
```

This prevents an inventory movement belonging to one business from referencing another business's inventory record.

The previous global SKU-only foreign key has been removed.

Historical movements do not require rewriting to reference the new UUID during this migration.

### 4.5 Application-Level Tenant Isolation

The database schema now supports tenant-scoped SKU identity in migrated environments.

However, the application must also enforce tenant isolation.

Inventory queries must use an authorized business context.

For example:

```sql
SELECT *
FROM inventory_skus
WHERE business_id = $1
  AND sku = $2;
```

A human-readable SKU string alone is no longer sufficient to identify an inventory record globally.

**Current limitation:** Existing inventory and dashboard services require additional tenant-scoping work.

Authentication and membership authorization must be implemented before protected multi-business APIs are enabled.

---

## 5. Migration Inventory

Five TypeORM migrations are implemented.

| Order | Migration File | Purpose |
|---|---|---|
| 1 | `1761070000000-CreateBusinessWorkspace.ts` | Creates businesses, users, and memberships |
| 2 | `1761080000000-CreateFoundationalInventoryTables.ts` | Creates foundational inventory tables while preserving existing tables |
| 3 | `1792600000000-AddBusinessOwnershipToInventory.ts` | Adds and backfills business ownership for inventory and movements |
| 4 | `1792700000000-AddBusinessOwnershipToOpeningBalanceImports.ts` | Adds business ownership and scoped uniqueness for opening-balance imports |
| 5 | `1792800000000-AddTenantScopedSkuIdentifiers.ts` | Introduces UUID inventory identifiers and removes global SKU uniqueness |

### 5.1 Fresh Installation Behavior

The migration sequence supports initialization of an empty database.

A fresh installation does not automatically create Fimonaa India or Fimonaa Finland.

The optional business seed script is not part of mandatory SaaS initialization.

This avoids hardcoding specific business tenants into the platform.

### 5.2 Legacy Inventory Behavior

The earlier ownership migrations support controlled migration of existing inventory.

The historical Fimonaa India development baseline was:

| Metric | Historical Baseline |
|---|---:|
| SKUs | 318 |
| Available units | 2,027 |
| Inventory movements | 318 |
| Opening-balance imports | 1 |

These are historical development figures, not verified current live inventory totals.

The protected main database containing this inventory must not be modified without explicit approval.

### 5.3 Migration 5 Implementation

Migration:

`1792800000000-AddTenantScopedSkuIdentifiers.ts`

#### Step 1: Add UUID Inventory Identifier

```sql
ALTER TABLE inventory_skus
ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();
```

Existing inventory records receive UUID identifiers.

Future records receive UUIDs through the database default.

#### Step 2: Remove Global SKU Foreign Key

```sql
ALTER TABLE inventory_movements
DROP CONSTRAINT inventory_movements_sku_fkey;
```

The composite business/SKU foreign key remains intact.

#### Step 3: Replace the Global SKU Primary Key

```sql
ALTER TABLE inventory_skus
DROP CONSTRAINT inventory_skus_pkey;
```

The replacement primary key is:

```sql
ALTER TABLE inventory_skus
ADD CONSTRAINT inventory_skus_pkey PRIMARY KEY (id);
```

The existing business-scoped unique constraint remains unchanged.

### 5.4 Migration Design Principles

The fifth migration:

- Does not rewrite previously committed migrations.
- Preserves existing SKU strings.
- Preserves existing stock quantities.
- Preserves historical movement relationships.
- Supports identical SKU codes across businesses.
- Uses PostgreSQL transactional migration execution.
- Disables automatic rollback to prevent unsafe schema reversal.

### 5.5 Migration Deployment Status

Migration 5 has been executed successfully against isolated test databases.

It has **not** been executed against the protected main database.

The populated migration test contained controlled sample inventory and movement data.

Successful testing with sample records does not establish that migration 5 has been applied to the complete historical India inventory.

---

## 6. Database Environments and Safety Boundaries

The following PostgreSQL databases have been used during development.

| Database | Purpose | Safety Rule |
|---|---|---|
| `fimonaa_commerce` | Protected main development database containing historical India inventory | Do not modify without explicit approval |
| `fimonaa_commerce_workspace_test` | Restored copy of historical India inventory | Preserve for reference |
| `fimonaa_commerce_migration_test` | Earlier migration test environment | Leave unchanged unless explicitly needed |
| `fimonaa_commerce_import_test` | Isolated clean-install and constraint test database | Verify target before testing |
| `fimonaa_commerce_populated_migration_test` | Isolated populated-database migration validation | Disposable test environment |

### 6.1 Protected Main Database

Database:

`fimonaa_commerce`

This database contains the original Fimonaa India inventory baseline.

It must not be migrated, seeded, truncated, or otherwise modified without explicit authorization.

The application's normal `.env` configuration may point to this database.

Therefore, developers must not assume that a migration command targets a test environment.

### 6.2 Populated Migration Test Database

Database:

`fimonaa_commerce_populated_migration_test`

This database was created specifically to validate migration 5 against pre-existing inventory.

The test procedure:

1. Created an isolated database.
2. Applied migrations 1–4.
3. Created a synthetic India business.
4. Inserted a sample SKU with available stock.
5. Inserted a historical opening-balance movement.
6. Verified the pre-migration inventory relationship.
7. Applied migration 5.
8. Verified preservation of the sample inventory and movement.
9. Tested identical SKU codes across two businesses.
10. Verified the final PostgreSQL constraints.

The temporary Finland test records were rolled back.

### 6.3 Temporary Migration Configuration

A temporary TypeORM data-source file was used to apply only migrations 1–4 to the populated test database.

File:

`apps/api/src/database/populated-migration-test-data-source.ts`

This file was removed after testing.

It must not be committed as part of the application.

### 6.4 Database Backup

A pre-migration backup was previously created:

```text
backups/fimonaa_pre_migrations_20261021_195919.dump
```

The backup was restore-tested during the earlier development milestone.

The `backups/` directory is excluded from Git.

Backups may contain business-sensitive information and must not be committed.

A historical backup does not replace the need for a fresh, verified backup immediately before any approved main-database migration.

### 6.5 Database Safety Requirements

Before any migration operation:

1. Identify the intended database.
2. Verify the connection target.
3. Confirm the database is approved for the operation.
4. Review pending migrations.
5. Ensure backups and recovery procedures are appropriate.
6. Avoid running migrations through the default environment without verifying its configuration.
7. Never perform destructive operations against protected databases without explicit authorization.

---

## 7. Opening-Balance Import Behavior

### 7.1 HTTP Endpoint

Endpoint:

`POST /api/inventory-import/import-opening-balance`

Current behavior:

The endpoint throws `ForbiddenException`.

Opening-balance importing remains disabled until authentication, business membership validation, and permission checks are implemented.

### 7.2 Import Service

The underlying service accepts an explicit `businessId`.

Its workflow includes:

1. Validating the business ID format.
2. Validating the configured workbook path.
3. Reading the `SKU Generator` worksheet.
4. Validating populated SKU rows.
5. Calculating a SHA-256 workbook import key.
6. Calculating inventory totals.
7. Starting a PostgreSQL transaction.
8. Obtaining a business-scoped advisory transaction lock.
9. Verifying that the business exists and is active.
10. Rejecting duplicate opening-balance imports for the target business.
11. Rejecting imports when the target business already contains inventory.
12. Recording business-owned import history.
13. Inserting inventory SKU records.
14. Inserting opening-balance inventory movements.
15. Returning the import summary after successful transactional execution.

### 7.3 Removed Global SKU Collision Check

The previous implementation executed a global SKU lookup:

```sql
SELECT sku
FROM inventory_skus
WHERE sku = ANY($1::text[])
LIMIT 10;
```

This prevented one business from importing SKU codes already used by another business.

The check was removed because migration 5 supports business-scoped SKU uniqueness.

### 7.4 Preserved Duplicate Protection

The import service continues checking for existing inventory within the target business.

The relevant query is business-scoped:

```sql
WHERE business_id = $1
```

The service also checks existing opening-balance import history for that business.

This prevents accidental repeated opening-balance imports.

### 7.5 Inventory Quantity Semantics

The workbook's Current Available Stock becomes the opening quantity.

Initial Stock is retained as metadata.

The service does not reconstruct historical orders or returns.

It does not update Shopify inventory.

### 7.6 Security Requirements

A valid business UUID does not prove that the caller is authorized to access that business.

Before enabling imports:

- Authentication must identify the caller.
- Business membership must be verified.
- Appropriate role permissions must be enforced.
- Import operations must be auditable.
- Validation-only endpoints must be secured.
- Local filesystem paths must not be exposed unnecessarily.

---

## 8. Verification Results

### 8.1 Automated API Checks

The following checks passed during the tenant-scoped SKU implementation.

| Check | Result |
|---|---|
| Opening-balance service unit tests | 11 passed |
| Complete API test suite | 31 passed |
| Jest test suites | 5 passed |
| ESLint | Passed |
| NestJS build | Passed |
| Git whitespace check | Passed |

The complete test suite includes tests for:

- Opening-balance imports
- Import controller
- Inventory service
- Inventory controller
- Inventory query DTO

### 8.2 Opening-Balance Test Changes

The previous test expecting rejection of a SKU already owned by another business was replaced.

The updated test verifies that a business can import a SKU code already used by another business.

The test also confirms:

- The import completes successfully.
- The returned business ID is correct.
- Inventory queries include business ownership filtering.
- The global SKU collision query is absent.
- The successful import executes seven mocked queries instead of eight.

These are mocked service tests.

They do not independently verify PostgreSQL behavior.

Database-level behavior was tested separately.

### 8.3 Empty-Database Migration Testing

The five-migration sequence was tested against an isolated empty database.

The migration sequence completed successfully.

The tests confirmed that the database schema supports tenant-scoped inventory identifiers.

The earlier clean-install milestone also confirmed that database initialization does not require hardcoded Fimonaa business records.

### 8.4 Populated-Database Migration Testing

Migration 5 was tested against:

`fimonaa_commerce_populated_migration_test`

The test database initially contained:

**Business:** Fimonaa India Migration Test

**SKU:** `FIM-TEST-001`

**Product:** Migration Test Dress

**Initial stock:** 10

**Available stock:** 10

**Historical movement:**

- Type: `OPENING_BALANCE`
- Quantity delta: 10
- Quantity after: 10
- Reference: `MIGRATION-TEST-001`

After migration 5:

- The SKU remained unchanged.
- The product name remained unchanged.
- Initial stock remained 10.
- Available stock remained 10.
- The historical movement remained linked.
- The movement quantity remained unchanged.
- The movement reference remained unchanged.
- The inventory record received a UUID identifier.

The observed UUID was:

`2a5b6ec9-c259-429c-b015-e0cd08d00262`

### 8.5 Cross-Business SKU Coexistence Test

A second synthetic business was created inside a PostgreSQL transaction.

Both businesses successfully used:

`FIM-TEST-001`

Observed results:

| Business | SKU | Available Stock |
|---|---|---:|
| Fimonaa Finland Migration Test | FIM-TEST-001 | 5 |
| Fimonaa India Migration Test | FIM-TEST-001 | 10 |

The records received different UUID identifiers.

The test transaction ended with:

```sql
ROLLBACK;
```

The temporary Finland business and inventory record were therefore not retained.

### 8.6 PostgreSQL Constraint Verification

The following constraints were confirmed after migration 5.

| Table | Constraint | Verified Definition |
|---|---|---|
| inventory_skus | inventory_skus_pkey | PRIMARY KEY (id) |
| inventory_skus | inventory_skus_business_sku_unique | UNIQUE (business_id, sku) |
| inventory_skus | inventory_skus_business_id_fkey | FOREIGN KEY (business_id) |
| inventory_skus | inventory_skus_available_stock_check | available_stock >= 0 |
| inventory_movements | inventory_movements_pkey | PRIMARY KEY (id) |
| inventory_movements | inventory_movements_business_id_fkey | FOREIGN KEY (business_id) |
| inventory_movements | inventory_movements_business_sku_fkey | FOREIGN KEY (business_id, sku) |

The obsolete global constraint:

`inventory_movements_sku_fkey`

was confirmed absent.

### 8.7 Earlier PostgreSQL Integrity Checks

The previous development milestone also verified:

1. Business ownership of inventory records.
2. Rejection of cross-business inventory movement references.
3. Rejection of negative available stock.
4. Business-scoped opening-balance import-key uniqueness.
5. Transactional rollback of synthetic test records.

These tests were performed in isolated environments.

### 8.8 Verification Limitations

The completed checks establish confidence in the selected schema changes and application behavior.

They do not establish complete production readiness.

Outstanding validation includes:

- Automated PostgreSQL integration regression tests.
- Full restored-inventory migration testing for migration 5.
- Authentication and authorization tests.
- Cross-tenant API access tests.
- Compiled JavaScript migration execution tests.
- Deployment and recovery procedure validation.

**Important:** The populated migration test used controlled sample records. It was not a migration of all 318 historical India SKUs.

---

## 9. Rollback Review and Restrictions

### 9.1 Existing Migration Rollback Behavior

| Migration | Rollback Behavior | Risk |
|---|---|---|
| Business workspace | Drops memberships, users, and businesses | Destructive if populated |
| Foundational inventory | Refuses automatic rollback | Protects potentially pre-existing tables |
| Inventory ownership | Removes business ownership constraints and columns | May lose ownership information |
| Opening-balance import ownership | Conditional rollback with global uniqueness restrictions | May lose ownership information |
| Tenant-scoped SKU identifiers | Refuses automatic rollback | Protects UUID identity and cross-business SKU support |

### 9.2 Migration 5 Rollback Restriction

The fifth migration intentionally throws an error in its `down()` method.

Reason:

Once multiple businesses use identical SKU strings, restoring:

```sql
PRIMARY KEY (sku)
```

may no longer be possible.

An automatic rollback could therefore fail or require destructive data changes.

The migration must not automatically remove UUID identifiers.

### 9.3 Recovery Requirements

Any future rollback or recovery operation requires:

1. A reviewed recovery plan.
2. An explicitly verified database target.
3. A recent and validated backup.
4. Business-data preservation checks.
5. Assessment of cross-business duplicate SKU codes.
6. Review of dependent foreign keys.
7. Explicit authorization.

PostgreSQL transactional DDL reduces partial-change risk but does not guarantee that reversing a migration is safe for business data.

### 9.4 Protected Database Restriction

Do not execute:

```text
migration:revert
```

against the protected main database or restored India inventory copy without explicit approval.

---

## 10. Git Milestone and Delivery State

### 10.1 Previous Development Milestone

```text
Branch: feature/business-workspaces-migrations
Commit: c1047c7
Message: feat(api): add business workspaces and inventory ownership migrations
Files committed: 14
Remote push: successful
Main branch merge: not performed
```

This milestone introduced the foundational business-workspace and inventory-ownership architecture.

### 10.2 Current Development Milestone

```text
Branch: feature/tenant-scoped-skus
Status: Implementation validated locally
Commit: Pending
Push: Pending
Merge: Not performed
```

The implementation changes include:

```text
apps/api/src/database/migrations/
  1792800000000-AddTenantScopedSkuIdentifiers.ts

apps/api/src/modules/imports/
  inventory-opening-balance.service.ts

apps/api/src/modules/imports/__tests__/
  inventory-opening-balance.service.spec.ts
```

Documentation changes include:

```text
docs/architecture/decisions/
  ADR-002-tenant-scoped-sku-identifiers.md

docs/
  development-documentation_v1.2.md
```

The temporary populated-migration test data source was removed before preparing the commit.

### 10.3 Delivery Requirements

Before committing:

1. Review the final implementation diff.
2. Verify documentation consistency.
3. Run the final application checks.
4. Confirm no temporary files remain.
5. Confirm no credentials or database backups are staged.
6. Commit the implementation and documentation.
7. Record the resulting commit hash.
8. Push the feature branch when approved.

No commit or push is claimed for this milestone at the time of writing.

---

## 11. Open Issues and Production Blockers

| Priority | Item | Current Status | Required Outcome |
|---|---|---|---|
| P0 | Authentication | Pending | Establish verified user identity |
| P0 | Membership authorization | Pending | Enforce business membership and roles |
| P0 | Business-scoped inventory APIs | Pending | Scope all reads and writes to authorized businesses |
| P0 | Import endpoint security | Disabled pending authorization | Enable only after access controls |
| P0 | Validation endpoint security | Review required | Prevent unauthorized access and path exposure |
| P1 | Tenant-scoped SKU identity | Implemented and tested in isolation | Controlled deployment after approval |
| P1 | Automated PostgreSQL integration tests | Pending | Repeatable migration and tenant-isolation tests |
| P1 | Compiled migration execution | Pending | Validate JavaScript migration discovery and deployment |
| P1 | Rollback and recovery hardening | Pending | Data-preserving recovery procedures |
| P1 | Full legacy inventory compatibility | Partially validated | Test migration 5 against an approved restored copy |
| P1 | Global SKU assumptions in services | Review required | Remove or scope unsafe SKU-only lookups |
| P2 | Business onboarding | Pending | Tenant creation and selection workflow |
| P2 | Inventory ledger expansion | Pending | Warehouses, reservations, and reconciliation |
| P2 | Shopify integration | Future milestone | Controlled read-only integration |
| P2 | Marketplace integration | Future milestone | Approved connector architecture |
| P2 | Inventory source-of-truth cutover | Not started | Follow ADR-001 acceptance criteria |

### Critical Security Boundary

Database-level tenant-scoped uniqueness is not equivalent to application-level tenant security.

Even though the schema allows businesses to maintain independent inventory records, the application must prevent unauthorized users from reading or modifying another business's data.

No protected inventory endpoint should be considered multi-tenant safe until authentication, membership authorization, and business-scoped queries are implemented and tested.

---

## 12. Recommended Next Development Sequence

### Milestone A — Complete Tenant-Scoped SKU Delivery

**Status:** Implementation and isolated validation completed; Git delivery pending.<br>

Remaining tasks:

1. Finalize documentation.
2. Review implementation changes.
3. Run final tests.
4. Commit the feature.
5. Record the commit hash.
6. Push the feature branch when approved.

The protected main database remains unchanged.

### Milestone B — Authentication and Business Authorization

**Next recommended engineering milestone.**

Implement:

1. User authentication.
2. Business membership resolution.
3. Business selection and context.
4. Role-based authorization.
5. Guards for protected API endpoints.
6. Unauthorized-access tests.

Users must not gain access to another business merely by knowing its UUID or SKU code.

### Milestone C — Business-Scoped Inventory APIs

Update inventory and dashboard services to enforce business ownership.

Review all queries for assumptions that SKU codes are globally unique.

Every inventory read or write must use the authorized business context.

Add negative tests for cross-business access.

### Milestone D — Automated Database Integration Testing

Create repeatable PostgreSQL integration tests for:

- Fresh database migrations.
- Populated database migrations.
- UUID identifier generation.
- Business-scoped SKU uniqueness.
- Composite movement foreign keys.
- Negative stock constraints.
- Opening-balance import protection.
- Cross-business access restrictions.
- Migration failure handling.

Also validate compiled JavaScript migration execution.

### Milestone E — Controlled Opening-Balance Import Enablement

After authorization and tenant-scoped API protections are complete:

1. Design a reviewed import workflow.
2. Add dry-run validation.
3. Add operator confirmation.
4. Add import audit logging.
5. Verify duplicate-import protection.
6. Test transaction rollback.
7. Confirm business-specific permissions.

Do not enable imports merely because the underlying service tests pass.

### Milestone F — Inventory Reconciliation and Integrations

Follow ADR-001.

Future work includes:

- Inventory ledger improvements.
- Warehouse support.
- Stock reservations.
- Order and return processing.
- Shopify read-only integration.
- Marketplace connector planning.
- Inventory reconciliation.
- Controlled source-of-truth cutover.

No live stock synchronization should be enabled without explicit approval.

---

## 13. Safe Developer Command Reference

The following commands are illustrative.

Always verify the working directory and environment before executing commands.

### 13.1 Non-Destructive Application Checks

From the repository root:

```bash
npm --workspace apps/api run build
npm --workspace apps/api run lint
npm --workspace apps/api run test -- --runInBand
```

### 13.2 Git Inspection

```bash
git status --short
git diff --check
git diff
git log -1 --oneline
```

These commands inspect repository state without modifying tracked files.

### 13.3 Migration Safety

The application's `.env` file may point to the protected main database.

Do not execute migration commands without explicitly verifying the database target.

In particular, do not casually run:

```text
npm run migration:run
npm run migration:revert
npm run seed:businesses
```

against the main database.

For isolated migration testing, use an explicitly verified test database connection.

Never expose database credentials in terminal output, documentation, or Git commits.

### 13.4 Database Inspection

Read-only PostgreSQL inspection commands may be used after confirming the intended database.

Examples include:

```sql
SELECT *
FROM typeorm_migrations
ORDER BY timestamp;
```

and:

```sql
SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
    'inventory_skus'::regclass,
    'inventory_movements'::regclass
)
ORDER BY table_name, constraint_name;
```

Database inspection is not a substitute for verifying the connection target.

---

## 14. Version History and Acceptance Record

| Version | Milestone | State |
|---|---|---|
| v1.0 | Earlier project development documentation | Historical reference |
| v1.1 | Business workspaces, inventory ownership, four migrations, protected import service, database integrity tests, and Git checkpoint | Completed development checkpoint |
| **v1.2** | Tenant-scoped SKU identifiers, fifth migration, updated import service, populated-database validation, ADR-002 | **Implementation validated locally; Git delivery pending** |

### Acceptance Basis

This development record is based on:

- Reviewed application source-code differences.
- Reviewed migration 5 source code.
- Successful Jest test execution.
- Successful ESLint and NestJS build checks.
- Successful isolated PostgreSQL migration execution.
- Populated-database preservation checks.
- Cross-business SKU coexistence testing.
- PostgreSQL constraint inspection.
- Git whitespace validation.
- Documentation review.

These results establish a development checkpoint.

They are not an independent production audit or authorization to migrate protected inventory.

### Next Acceptance Checkpoint

The next checkpoint should record:

1. Final code and documentation review.
2. Successful final test execution.
3. Git commit hash.
4. Feature branch push status.
5. Confirmation that the protected main database remains unchanged.
6. Approval to begin authentication and tenant-scoped API development.

---

## 15. Architecture Decision Records

### ADR-001 — Inventory Source of Truth and Controlled Cutover

Location:

`docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`

Defines:

- Excel as the current inventory authority.
- Commerce Hub as the future inventory authority.
- Business-specific inventory ownership.
- Reconciliation requirements.
- Controlled source-of-truth transition.
- Explicit approval requirements.

### ADR-002 — Tenant-Scoped SKU Identifiers

Location:

`docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`

Defines:

- UUID-based inventory identity.
- Business-scoped SKU uniqueness.
- Composite inventory movement relationships.
- Opening-balance import behavior.
- Migration validation.
- Automatic rollback restrictions.
- Protected database safety requirements.

Both decisions must be considered when designing future inventory functionality.

---

*Fimonaa Commerce Hub — Development Documentation v1.2 | 23 October 2026*
