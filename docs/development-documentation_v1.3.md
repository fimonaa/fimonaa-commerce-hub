# Fimonaa Commerce Hub
## Development Documentation — Version 1.3

**Status:** Authentication, business authorization, and business-scoped inventory API implemented and tested; not production-ready<br>
**Updated:** 26 October 2026<br>
**Repository:** `fimonaa/fimonaa-commerce-hub`<br>
**Feature branch:** `feature/business-scoped-inventory-api`<br>
**Implementation commit:** `9f424e1`<br>
**Delivery state:** Implementation committed locally; documentation commit and GitHub push pending<br>
**Previous milestone:** v1.2 — Tenant-scoped SKU identifiers and migration 5<br>

> **Critical database safety notice**
>
> The protected `fimonaa_commerce` database contains historical Fimonaa India inventory. Do not run migrations, imports, seed scripts, destructive SQL, integration tests, or other database writes against it without explicit authorization.
>
> The Excel SKU workbook remains the inventory source of truth until an approved cutover.
>
> Automated integration tests must use the isolated `fimonaa_commerce_import_test` database.

---

# 1. Executive Summary

Version 1.3 documents the implementation and verification of **JWT authentication, business membership authorization, role-based access control, and business-scoped inventory APIs**.

This milestone builds on the multi-business database architecture and tenant-scoped SKU identifiers established in versions 1.1 and 1.2.

The application now has an authentication and authorization layer that:

- Verifies signed JWT access tokens.
- Identifies authenticated users.
- Resolves active business membership.
- Enforces business-specific roles.
- Prevents unauthorized access to another business's inventory.
- Restricts inventory queries to the authenticated business context.
- Protects the opening-balance import endpoint.
- Enforces additional database restrictions on opening-balance imports.

The implementation has been validated through automated unit and PostgreSQL integration tests.

## 1.1 Completed Implementation

The following functionality has been implemented:

1. JWT access-token verification.
2. Global authentication guard.
3. Global role-based authorization guard.
4. Business membership resolution.
5. Authenticated business context.
6. Public-route decorator.
7. Role-restriction decorator.
8. Business-scoped inventory listing.
9. Inventory search, filtering, and pagination validation.
10. Protected opening-balance import endpoint.
11. Opening-balance import feature flag.
12. Database-level import execution restriction.
13. Isolated PostgreSQL integration-test configuration.
14. Automated HTTP authorization tests.
15. Cross-business inventory isolation tests.
16. Opening-balance import integration tests.
17. Database safety assertions for test execution.

## 1.2 Verification Summary

| Verification | Result |
|---|---|
| Unit tests | 75 passed |
| Unit test suites | 11 passed |
| Integration tests | 37 passed |
| Integration test suites | 5 passed |
| TypeScript test compilation | Passed |
| NestJS production build | Passed |
| Git whitespace validation | Passed |
| Implementation Git commit | `9f424e1` |
| Working tree after implementation commit | Clean |

**Total automated tests passed: 112.**

These results establish a successful development checkpoint, not production certification.

## 1.3 Current Git Status

**Branch:** `feature/business-scoped-inventory-api`

**Implementation commit:**

`9f424e1`

**Commit message:**

`feat(api): add business-scoped inventory authorization and integration tests`

The implementation commit contains:

- 46 changed files.
- 3,648 insertions.
- 58 deletions.

The implementation is committed locally.

At the time of this documentation update:

- Documentation v1.3 is being finalized.
- The feature branch has not yet been pushed for this milestone.
- No merge into `main` has been performed for this milestone.

## 1.4 Production Readiness

**Fimonaa Commerce Hub is not yet production-ready.**

Although JWT verification and business authorization are implemented, several requirements remain outstanding.

These include:

- User login and token issuance.
- Complete authentication lifecycle.
- Production authentication configuration.
- Business onboarding.
- Broader endpoint authorization review.
- Dashboard tenant-scoping review.
- Production opening-balance import workflow.
- Compiled migration execution verification.
- Deployment and recovery procedures.
- Inventory reconciliation.
- Shopify and marketplace integrations.
- Controlled inventory source-of-truth cutover.

The protected India inventory has not been migrated or modified as part of this milestone.

---

# 2. Product Direction and Scope

Fimonaa Commerce Hub is an **inventory-first, multi-business commerce operations platform**.

It is designed initially for:

- Fimonaa India.
- Fimonaa Finland.

The architecture must also support additional businesses and potential future SaaS tenants.

The platform is intended to provide a centralized operational system for inventory, orders, returns, warehouses, and commerce integrations.

## 2.1 Multi-Business Architecture

Each business must maintain independent:

- Inventory records.
- Stock movements.
- Opening-balance imports.
- Operational data.
- User memberships.
- Role permissions.

A user may belong to multiple businesses with different roles.

For example, a user may be an administrator for Fimonaa India and an inventory manager for Fimonaa Finland.

The user's permissions must be evaluated within the selected business context.

## 2.2 Core Architecture Principles

1. Every business owns its operational records.
2. Users may belong to multiple businesses.
3. Roles are specific to business memberships.
4. Inventory records are isolated by `business_id`.
5. SKU codes are unique within businesses, not globally.
6. Authentication must establish verified user identity.
7. Authorization must establish valid business membership.
8. Inventory queries must use authenticated business context.
9. Database constraints complement application authorization.
10. Stock movements must remain auditable.
11. Inventory writes must be transactionally consistent.
12. Historical business data must be preserved.
13. Production imports must require explicit authorization.
14. The system must remain extensible for future SaaS tenants.
15. The Excel SKU workbook remains authoritative until an approved cutover.

## 2.3 Business Initialization

Fimonaa India and Fimonaa Finland are initial business examples.

They are not mandatory records in every installation.

A fresh installation must support creating businesses independently.

The optional business seed script is not part of mandatory SaaS initialization.

---

# 3. Technical Stack and Repository

## 3.1 Technology Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11 |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3.31 |
| Authentication | JWT |
| JWT library | `@nestjs/jwt` |
| Frontend | React 19 |
| Frontend tooling | Vite 8 |
| Styling | Tailwind CSS 4 |
| Supporting service | Redis 7 |
| Unit testing | Jest 30 |
| Integration testing | Jest, Supertest, PostgreSQL |
| API documentation | Swagger / OpenAPI |
| Architecture | Modular monolith |
| Multi-tenancy | Business-scoped ownership |
| Version control | Git / GitHub |

## 3.2 Repository Structure

```text
fimonaa-commerce-hub/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   └── data-source.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── health/
│   │   │   │   ├── imports/
│   │   │   │   └── inventory/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   │   ├── fixtures/
│   │   │   ├── helpers/
│   │   │   └── *.integration-spec.ts
│   │   ├── jest.integration.config.ts
│   │   └── tsconfig.test.json
│   ├── web/
│   └── worker/
├── docs/
│   ├── architecture/
│   │   └── decisions/
│   ├── development-documentation_v1.0.md
│   ├── development-documentation_v1.1.md
│   ├── development-documentation_v1.2.md
│   └── development-documentation_v1.3.md
└── package.json
```

## 3.3 API Configuration

The NestJS application uses a global configuration module.

The database connection is configured through `DATABASE_URL`.

TypeORM automatic schema synchronization is disabled:

```typescript
synchronize: false
```

Database migrations must be executed explicitly against a verified target.

## 3.4 API Prefix

The application uses:

```text
/api
```

as its global API prefix.

## 3.5 Request Validation

The application uses a global NestJS `ValidationPipe`.

Configuration includes:

```typescript
{
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true
}
```

This provides:

- Request transformation.
- DTO-based validation.
- Removal of properties not defined by validation decorators.
- Rejection of unexpected request properties.

Validation does not replace authentication or authorization.

## 3.6 API Documentation

Swagger/OpenAPI documentation is available outside production at:

```text
/api/docs
```

Production documentation exposure must remain subject to deployment security requirements.

---

# 4. Data Model and Multi-Tenancy

## 4.1 Business Identity

The foundational schema includes three primary business-identity tables.

### businesses

Represents business workspaces.

### users

Represents platform users.

### business_memberships

Associates users with businesses and defines business-specific roles.

## 4.2 Supported Roles

The current role model includes:

| Role | Intended Responsibility |
|---|---|
| `owner` | Business ownership and highest business-level authority |
| `admin` | Business administration |
| `inventory_manager` | Inventory management |
| `operator` | Operational workflows |
| `viewer` | Read-oriented access |

Role names establish the authorization model.

Individual endpoint permissions must still be explicitly defined and tested.

## 4.3 Inventory Tables

| Table | Responsibility |
|---|---|
| `inventory_skus` | SKU records and stock quantities |
| `inventory_movements` | Inventory movement history |
| `inventory_opening_balance_imports` | Opening-balance import history |

Inventory records contain `business_id`.

## 4.4 Tenant-Scoped SKU Identity

Migration 5 introduced UUID-based inventory identifiers.

The inventory identity fields are:

| Field | Purpose |
|---|---|
| `id` | Internal UUID identifier |
| `business_id` | Owning business |
| `sku` | Human-readable SKU code |

The primary key is:

```sql
PRIMARY KEY (id)
```

Business-scoped SKU uniqueness is enforced through:

```sql
UNIQUE (business_id, sku)
```

Consequently, two businesses may use the same SKU string independently.

## 4.5 Inventory Movement Relationships

Inventory movements use a composite business/SKU relationship:

```sql
FOREIGN KEY (business_id, sku)
REFERENCES inventory_skus(business_id, sku)
ON DELETE RESTRICT
```

This prevents an inventory movement from referencing an SKU belonging to another business.

## 4.6 Opening-Balance Import Uniqueness

Import keys are unique within a business:

```sql
UNIQUE (business_id, import_key)
```

This supports business-specific duplicate-import protection.

## 4.7 Application-Level Tenant Isolation

Database-level business ownership is not sufficient by itself.

Application queries must also enforce the authenticated business context.

For example:

```sql
SELECT *
FROM inventory_skus
WHERE business_id = $1;
```

The business ID must originate from a verified authentication and membership context.

It must not be trusted merely because it appears in a client-supplied request.

---

# 5. Database Migration Inventory

Five TypeORM migrations are implemented.

| Order | Migration | Purpose |
|---|---|---|
| 1 | `1761070000000-CreateBusinessWorkspace.ts` | Creates business, user, and membership tables |
| 2 | `1761080000000-CreateFoundationalInventoryTables.ts` | Creates foundational inventory tables |
| 3 | `1792600000000-AddBusinessOwnershipToInventory.ts` | Adds business ownership to inventory and movements |
| 4 | `1792700000000-AddBusinessOwnershipToOpeningBalanceImports.ts` | Adds business ownership and scoped import uniqueness |
| 5 | `1792800000000-AddTenantScopedSkuIdentifiers.ts` | Adds UUID inventory identifiers and removes global SKU uniqueness |

## 5.1 Migration Principles

Migrations must:

- Preserve existing business data.
- Maintain inventory relationships.
- Avoid accidental destructive changes.
- Support transactional execution where appropriate.
- Be tested against isolated databases.
- Be reviewed before deployment.

## 5.2 Migration 5

Migration 5 replaces the global SKU primary key with a UUID identifier.

It also preserves business-scoped uniqueness.

The resulting model supports identical human-readable SKU codes across different businesses.

## 5.3 Legacy Inventory Compatibility

Migration 5 was tested against an isolated populated database containing synthetic inventory and historical movement records.

The test verified that:

- SKU strings remained unchanged.
- Stock quantities remained unchanged.
- Historical movement relationships remained valid.
- UUID identifiers were assigned.
- Different businesses could use identical SKU strings.

The test did not migrate the complete historical India inventory.

## 5.4 Protected Database Deployment Status

The fifth migration has not been applied to the protected main database as part of this development work.

Any future deployment requires explicit authorization and a reviewed migration procedure.

## 5.5 Compiled Migration Verification

Compiled JavaScript migration discovery and execution remain outstanding deployment checks.

A successful TypeScript build alone does not establish that production migration discovery is correctly configured.

---

# 6. Database Environments and Safety

## 6.1 Database Inventory

| Database | Purpose | Safety Classification |
|---|---|---|
| `fimonaa_commerce` | Protected India inventory database | Protected |
| `fimonaa_commerce_workspace_test` | Restored India inventory copy | Preserve |
| `fimonaa_commerce_migration_test` | Earlier migration testing | Restricted |
| `fimonaa_commerce_import_test` | Automated integration testing | Isolated test target |
| `fimonaa_commerce_populated_migration_test` | Populated migration validation | Synthetic test environment |

## 6.2 Protected Main Database

Database:

`fimonaa_commerce`

Historical development baseline:

| Metric | Historical Value |
|---|---:|
| SKUs | 318 |
| Available units | 2,027 |
| Inventory movements | 318 |
| Opening-balance imports | 1 |

These figures are historical development records.

They must not be presented as independently verified current live inventory totals.

The database must not be modified without explicit approval.

## 6.3 Protected Operations

The following operations are prohibited against the protected main database without explicit authorization:

- Migration execution.
- Migration rollback.
- Database seeding.
- Opening-balance imports.
- Test-data insertion.
- Inventory modifications.
- Table truncation.
- Destructive SQL.
- Integration-test cleanup.
- Inventory reconciliation writes.

## 6.4 Environment Configuration Risk

The application's normal `.env` configuration may point to:

`fimonaa_commerce`

Developers must not assume that commands automatically use a test database.

The database target must be verified before executing any operation capable of modifying data.

## 6.5 Backup History

A historical pre-migration backup was created:

```text
backups/fimonaa_pre_migrations_20261021_195919.dump
```

It was restore-tested during an earlier development milestone.

The backup directory is excluded from Git.

A historical backup does not replace the requirement for a fresh, verified backup before any future approved production migration.

## 6.6 Integration-Test Database

The automated integration-test environment uses:

`fimonaa_commerce_import_test`

This database is specifically isolated from the protected India inventory.

Automated test helpers enforce restrictions on the database target.

Tests must not be redirected to another database without reviewing those safeguards.

---

# 7. Authentication Architecture

## 7.1 Overview

Version 1.3 introduces an authentication module responsible for verifying user identity and establishing authorized business context.

The module is located at:

```text
apps/api/src/modules/auth/
```

The authentication system uses JWT access tokens.

## 7.2 Authentication Module

The module includes:

```text
auth/
├── auth.module.ts
├── authentication-context.service.ts
├── jwt-verification.service.ts
├── decorators/
│   ├── public.decorator.ts
│   └── roles.decorator.ts
├── entities/
│   ├── business.entity.ts
│   ├── business-membership.entity.ts
│   └── user.entity.ts
├── guards/
│   ├── authentication.guard.ts
│   └── roles.guard.ts
└── types/
    ├── authenticated-user.type.ts
    └── jwt-payload.type.ts
```

Unit tests are maintained alongside the relevant implementation files.

## 7.3 JWT Verification

JWT verification uses signed access tokens.

The implementation validates:

- Token signature.
- Expected signing algorithm.
- Token expiration.
- User identifier format.

The expected algorithm is:

```text
HS256
```

The access-token lifetime configured for this development milestone is:

```text
15 minutes
```

The JWT payload includes a user identifier in:

```text
sub
```

The subject must be a valid UUID.

The expiration claim must be valid.

## 7.4 Authorization Header

Protected API requests use:

```http
Authorization: Bearer <access-token>
```

Requests without a valid bearer token are rejected.

## 7.5 Business Selection Header

The current implementation uses:

```http
X-Business-Id: <business-uuid>
```

to identify the requested business context.

**Important:** The header is not proof of authorization.

The backend must verify that the authenticated user has an active membership in the requested business.

## 7.6 Authentication Context Resolution

The authentication context service resolves:

1. The authenticated user.
2. The requested business.
3. The user's membership in that business.
4. The membership's role.
5. The relevant active-status requirements.

The resolved context is attached to the request.

## 7.7 Authenticated Request Context

The authenticated user context contains:

```typescript
{
  userId: string;
  businessId: string;
  role: string;
}
```

This context is used by protected application services.

The business ID must be derived from verified membership resolution.

## 7.8 Global Authentication Guard

The authentication guard is registered globally.

Protected endpoints require successful authentication unless explicitly marked public.

## 7.9 Public Routes

The `@Public()` decorator allows explicitly designated routes to bypass authentication.

The health endpoint is an example of a public route.

Public routes must be reviewed carefully to avoid exposing protected business data.

## 7.10 Authentication Limitations

The current milestone implements token verification and request authentication.

It does not yet provide a complete user authentication lifecycle.

Outstanding functionality includes:

- Login.
- Credential verification.
- Access-token issuance.
- Refresh-token strategy.
- Logout and session invalidation.
- Password recovery.
- Account provisioning.
- Production authentication secret management.

These capabilities require separate design and implementation.

---

# 8. Role-Based Authorization

## 8.1 Authorization Guard

The roles guard is registered globally.

It evaluates role requirements declared on protected routes.

## 8.2 Role Decorator

The application provides:

```typescript
@Roles(...)
```

for declaring allowed roles.

## 8.3 Business-Specific Roles

Roles are resolved from the authenticated user's membership in the selected business.

A user's role in one business must not automatically grant access to another business.

## 8.4 Opening-Balance Import Permissions

The opening-balance import controller restricts access to:

```typescript
@Roles(
  'owner',
  'admin',
  'inventory_manager'
)
```

Users without an allowed role cannot execute the protected import endpoint.

## 8.5 Authorization Principles

1. Authenticate the user.
2. Validate the requested business.
3. Resolve active membership.
4. Determine the business-specific role.
5. Evaluate endpoint permissions.
6. Pass only verified business context to application services.

A valid JWT alone does not authorize access to every business.

## 8.6 Cross-Business Access Protection

Knowing another business's UUID must not allow access to its inventory.

The authorization layer must reject requests where the authenticated user lacks valid membership.

Cross-business authorization behavior is covered by automated tests.

---

# 9. Business-Scoped Inventory API

## 9.1 Overview

Version 1.3 implements business-scoped inventory retrieval.

Inventory data is selected using the authenticated business context.

## 9.2 Business Ownership Filtering

Inventory queries include a business predicate.

For example:

```sql
WHERE business_id = $1
```

The inventory service applies business filtering to both:

- Inventory record retrieval.
- Inventory record counting.

This prevents pagination metadata from revealing another business's inventory totals.

## 9.3 Search

The inventory API supports search parameters.

Search input is validated and normalized.

The search string is trimmed and limited to a maximum of 100 characters.

## 9.4 Stock Status Filtering

Supported stock-status values include:

```text
all
in_stock
low_stock
out_of_stock
```

Stock-status filtering must remain scoped to the authenticated business.

## 9.5 Pagination

Supported pagination parameters include:

```text
page
limit
```

Validation requirements:

| Parameter | Rule |
|---|---|
| `page` | Integer greater than or equal to 1 |
| `limit` | Integer between 1 and 100 |

Invalid values are rejected through DTO validation.

## 9.6 Query Safety

Inventory queries use parameterized SQL.

Business IDs and search values must not be concatenated directly into SQL strings.

## 9.7 Tenant Isolation

The inventory service must not return records belonging to another business.

This requirement applies even when two businesses use identical SKU codes.

## 9.8 Current Scope

The completed milestone establishes business-scoped inventory listing and associated authorization behavior.

It does not establish that every future inventory write operation is implemented.

Future inventory operations must follow the same business-isolation requirements.

## 9.9 Dashboard Review

Dashboard services require a separate tenant-scoping and authorization review.

The completion of the inventory API does not automatically establish that all dashboard queries are multi-tenant safe.

---

# 10. Opening-Balance Import Security

## 10.1 Endpoint

```http
POST /api/inventory-import/import-opening-balance
```

## 10.2 Updated Behavior

In v1.2, the controller rejected import requests while authorization was pending.

In v1.3, the controller is connected to the opening-balance import service and protected by:

- Global authentication.
- Business membership resolution.
- Role-based authorization.
- An explicit feature flag.
- A database-name restriction in the import service.

## 10.3 Feature Flag

The import endpoint uses:

```text
ENABLE_OPENING_BALANCE_IMPORT
```

Importing is disabled by default.

The feature flag must be explicitly enabled for an authorized import attempt.

**Enabling the feature flag does not remove the database-name restriction.**

## 10.4 Database Restriction

The import service verifies the active PostgreSQL database using:

```sql
SELECT current_database() AS database_name;
```

The current implementation permits import execution only when the database name is:

```text
fimonaa_commerce_import_test
```

Requests targeting other databases are rejected.

This is a temporary development safeguard, not the final production import architecture.

## 10.5 Protected Main Database

The protected database:

```text
fimonaa_commerce
```

is not an allowed opening-balance import target.

The current service restriction prevents import execution against that database.

This safeguard must not be removed without a reviewed production import design and explicit authorization.

## 10.6 Import Workflow

The underlying service:

1. Verifies the allowed database.
2. Validates the business identifier.
3. Validates the workbook path.
4. Reads the `SKU Generator` worksheet.
5. Validates populated SKU rows.
6. Calculates the workbook import key.
7. Calculates inventory quantities.
8. Begins a PostgreSQL transaction.
9. Acquires a business-scoped advisory lock.
10. Verifies that the business exists and is active.
11. Checks for an existing opening-balance import.
12. Checks for existing inventory in the target business.
13. Records import history.
14. Inserts inventory SKU records.
15. Inserts opening-balance inventory movements.
16. Commits the transaction after successful completion.

## 10.7 Duplicate Import Protection

The service prevents repeated opening-balance imports for the same business.

It also rejects opening-balance imports when the business already contains inventory.

## 10.8 Cross-Business SKU Support

The import service does not enforce global SKU uniqueness.

Two businesses may use the same SKU code because inventory uniqueness is business-scoped.

## 10.9 Transaction Safety

Opening-balance imports use PostgreSQL transactions.

If an import fails, the transaction must roll back its changes.

Transaction rollback behavior is covered by integration tests.

## 10.10 Inventory Quantity Semantics

The workbook's Current Available Stock becomes the opening quantity.

Initial Stock is retained as metadata.

The service does not reconstruct historical orders and returns.

It does not synchronize inventory with Shopify.

## 10.11 Production Import Requirements

Before allowing production imports:

1. Design an approved production import workflow.
2. Remove or replace the temporary database restriction only after review.
3. Preserve business authorization.
4. Implement dry-run validation.
5. Add operator confirmation.
6. Review import audit logging.
7. Verify duplicate protection.
8. Verify transaction rollback.
9. Review file handling and path exposure.
10. Validate recovery procedures.
11. Obtain explicit authorization.

The current feature flag must remain disabled in normal development and production configurations unless specifically approved.

---

# 11. Automated Testing Architecture

## 11.1 Testing Strategy

Version 1.3 introduces a more comprehensive automated testing strategy.

The test suite includes:

- Unit tests.
- PostgreSQL integration tests.
- HTTP authorization tests.
- Cross-business isolation tests.
- Opening-balance import tests.
- Database environment safety tests.

## 11.2 Unit Tests

**Result: 75 passing tests across 11 suites.**

Unit tests cover functionality including:

- JWT verification.
- Authentication context resolution.
- Authentication guard.
- Roles guard.
- Inventory service.
- Inventory controller.
- Inventory query DTO.
- Opening-balance import service.
- Import controller.
- Database safety helpers.

## 11.3 Integration Tests

**Result: 37 passing tests across 5 suites.**

The integration suite includes tests for:

- Database connection.
- Test environment configuration.
- Opening-balance import behavior.
- Business-scoped inventory isolation.
- HTTP authentication and authorization.

## 11.4 HTTP Authorization Tests

The HTTP authorization integration suite contains:

**23 passing tests.**

The tests exercise behavior including:

- Missing authentication.
- Invalid authentication.
- Business membership validation.
- Role restrictions.
- Cross-business inventory access.
- Import feature-flag behavior.
- Authorized opening-balance imports.
- Duplicate-import protection.
- Cross-business import independence.

## 11.5 Inventory Business-Isolation Tests

The inventory business-isolation suite contains:

**6 passing tests.**

These tests verify that inventory operations respect business ownership.

## 11.6 Opening-Balance Import Tests

The opening-balance integration suite contains:

**5 passing tests.**

These tests cover:

1. Successful opening-balance import.
2. Duplicate-import rejection.
3. Cross-business behavior.
4. Transaction rollback.
5. Database execution restrictions.

## 11.7 Isolated Test Environment

Integration tests use:

```text
apps/api/.env.test
```

The file contains isolated test configuration.

It must not be committed.

## 11.8 Test Database Variable

The integration-test environment uses:

```text
TEST_DATABASE_URL
```

The test setup maps the verified test database URL into the application's database configuration.

## 11.9 Database Safety Assertions

The test helpers reject unsafe database targets.

The expected database name is:

```text
fimonaa_commerce_import_test
```

The safety checks also restrict database host configuration to local development targets.

Unexpected database names, unsupported connection targets, and unsafe URL configurations are rejected.

## 11.10 Synthetic Workbook Fixture

Integration tests use a synthetic workbook:

```text
apps/api/test/fixtures/opening-balance-test.xlsx
```

The fixture contains:

- Two synthetic SKUs.
- 10 units for one SKU.
- 5 units for the second SKU.
- 15 total available units.

The fixture is not the production Fimonaa SKU workbook.

## 11.11 Test Data Cleanup

The HTTP integration suite includes cleanup helpers.

Cleanup is restricted to the isolated test database.

The cleanup process removes synthetic test records created by the tests.

## 11.12 Test Database Final State

After the completed integration-test run, the isolated import-test database was verified to contain:

| Record Type | Remaining Count |
|---|---:|
| Businesses | 0 |
| Users | 0 |
| Memberships | 0 |
| Inventory SKUs | 0 |
| Inventory movements | 0 |
| Opening-balance imports | 0 |

This confirms the recorded test run left no synthetic records behind.

## 11.13 Test Configuration

The integration suite uses:

```text
apps/api/jest.integration.config.ts
```

Test TypeScript configuration is maintained in:

```text
apps/api/tsconfig.test.json
```

Integration tests are identified by:

```text
*.integration-spec.ts
```

## 11.14 Verification Commands

From `apps/api`, the following non-destructive application checks were completed:

```bash
npx tsc --project tsconfig.test.json --noEmit
```

```bash
npm run build
```

Both completed successfully.

Unit and integration suites also completed successfully during the milestone.

## 11.15 Remaining Testing Requirements

Although automated coverage has improved substantially, the following remain outstanding:

- Full restored-inventory migration testing.
- Compiled JavaScript migration execution tests.
- Production authentication lifecycle tests.
- Broader dashboard authorization tests.
- Deployment recovery tests.
- Additional operational and failure-mode testing.

---

# 12. Database Safety and Recovery

## 12.1 Protected Database Policy

The protected India database must remain unchanged unless an operation is explicitly approved.

No test helper should ever use the protected database.

## 12.2 Migration Rollback Restrictions

| Migration | Rollback Behavior |
|---|---|
| Business workspace | Potentially destructive |
| Foundational inventory | Automatic rollback refused |
| Inventory ownership | May remove ownership information |
| Opening-balance ownership | Conditional and potentially unsafe |
| Tenant-scoped SKU identifiers | Automatic rollback refused |

## 12.3 Migration 5 Rollback

Migration 5 intentionally refuses automatic rollback.

Restoring a global SKU primary key could be unsafe once multiple businesses use identical SKU strings.

## 12.4 Recovery Requirements

Before a production migration or rollback:

1. Verify the database target.
2. Obtain explicit authorization.
3. Review the migration plan.
4. Create a fresh backup.
5. Verify backup integrity.
6. Establish a recovery procedure.
7. Validate data-preservation requirements.
8. Review dependent constraints.
9. Confirm business continuity requirements.

## 12.5 Inventory Preservation

Future migration and recovery procedures must preserve:

- SKU identifiers.
- Business ownership.
- Available stock.
- Initial stock metadata.
- Inventory movements.
- Import history.
- Referential integrity.

## 12.6 Excel Source-of-Truth Policy

Under ADR-001, the Excel SKU workbook remains authoritative.

Commerce Hub must not become the live inventory authority until a controlled cutover is approved.

---

# 13. Git Milestones and Delivery History

## 13.1 Business Workspace Milestone

```text
Branch: feature/business-workspaces-migrations
Commit: c1047c7
Message: feat(api): add business workspaces and inventory ownership migrations
```

This milestone established the foundational multi-business database architecture.

## 13.2 Tenant-Scoped SKU Milestone

```text
Branch: feature/tenant-scoped-skus
Status: Implemented and merged into main
Main branch reference: 228b2ab
```

This milestone introduced:

- UUID inventory identifiers.
- Business-scoped SKU uniqueness.
- Migration 5.
- Updated opening-balance import behavior.
- ADR-002.

## 13.3 Authentication and Inventory API Milestone

```text
Branch: feature/business-scoped-inventory-api
Commit: 9f424e1
Message: feat(api): add business-scoped inventory authorization and integration tests
Files changed: 46
Insertions: 3648
Deletions: 58
```

This milestone introduces:

- JWT verification.
- Authentication context resolution.
- Global authentication guard.
- Global roles guard.
- Business-scoped inventory API.
- Protected opening-balance import endpoint.
- Isolated integration-test infrastructure.
- HTTP authorization tests.
- Cross-business isolation tests.

## 13.4 Documentation Milestone

```text
Document: docs/development-documentation_v1.3.md
Status: Being finalized
Commit: Pending
Push: Pending
```

The documentation update must be committed separately or through a reviewed follow-up commit.

## 13.5 Delivery Checklist

Before pushing the feature branch:

1. Finalize development documentation v1.3.
2. Review documentation consistency.
3. Confirm no outdated v1.2 implementation-status claims remain.
4. Verify no credentials are included.
5. Verify no database backups are staged.
6. Review Git changes.
7. Validate whitespace.
8. Commit documentation.
9. Confirm a clean working tree.
10. Push the feature branch.
11. Verify the remote branch.

A push does not automatically merge the branch into `main`.

---

# 14. Open Issues and Production Blockers

| Priority | Item | Status | Required Outcome |
|---|---|---|---|
| P0 | JWT verification | Implemented | Production security review |
| P0 | Login and token issuance | Pending | Complete authentication entry point |
| P0 | Authentication lifecycle | Pending | Refresh, logout, recovery, session management |
| P0 | Business membership authorization | Implemented | Broader operational review |
| P0 | Role-based authorization | Implemented | Finalize endpoint permission matrix |
| P0 | Business-scoped inventory listing | Implemented | Expand to future inventory operations |
| P0 | Dashboard tenant isolation | Review required | Verify every dashboard query |
| P0 | Opening-balance import authorization | Implemented | Production workflow still disabled |
| P0 | Production opening-balance import | Disabled | Approved import architecture |
| P0 | Protected India inventory migration | Not authorized | Explicit approval and migration plan |
| P1 | Automated PostgreSQL integration tests | Implemented | Expand migration and failure coverage |
| P1 | Compiled migration execution | Pending | Verify production migration discovery |
| P1 | Full restored-inventory compatibility | Pending | Test against approved restored copy |
| P1 | Deployment security | Pending | Harden production configuration |
| P1 | Secrets management | Pending | Production-grade secret handling |
| P1 | Recovery procedures | Pending | Tested backup and restore process |
| P1 | Endpoint authorization audit | Pending | Review all protected routes |
| P1 | Validation endpoint security | Review required | Prevent unauthorized data and path exposure |
| P2 | Business onboarding | Pending | Tenant creation and selection |
| P2 | Inventory ledger expansion | Pending | Full movement and adjustment workflows |
| P2 | Warehouse management | Pending | Multi-location inventory |
| P2 | Stock reservations | Pending | Reservation and release logic |
| P2 | Order management | Pending | Business-scoped order lifecycle |
| P2 | Returns management | Pending | Returns and restocking |
| P2 | Shopify integration | Future milestone | Controlled read-only integration |
| P2 | Marketplace integration | Future milestone | Approved marketplace connectors |
| P2 | Inventory reconciliation | Pending | Compare external and internal inventory |
| P2 | Inventory source-of-truth cutover | Not started | Follow ADR-001 |

## 14.1 Critical Security Boundary

A signed JWT does not automatically grant access to every business.

A client-supplied business UUID must be verified against active membership.

Business-scoped database constraints and application authorization must work together.

## 14.2 Critical Inventory Boundary

The existence of an import service does not authorize production imports.

The import feature flag remains disabled by default.

The current service also restricts imports to the isolated test database.

## 14.3 Critical Deployment Boundary

Passing unit and integration tests does not authorize production deployment.

Production deployment requires additional verification, security review, and explicit operational approval.

---

# 15. Recommended Next Development Sequence

## Milestone A — Complete v1.3 Documentation and Git Delivery

**Status:** In progress.

Remaining work:

1. Finalize this document.
2. Review the complete Markdown file.
3. Verify documentation consistency.
4. Commit the documentation.
5. Push the feature branch.
6. Verify the remote branch.

The protected main database must remain unchanged.

## Milestone B — Complete Authentication Lifecycle

Implement:

1. User login.
2. Credential verification.
3. Access-token issuance.
4. Refresh-token strategy.
5. Logout and session invalidation.
6. Password recovery.
7. Account activation.
8. Secure credential storage.
9. Authentication audit logging.

Preserve the existing JWT verification and membership authorization architecture.

## Milestone C — Authorization and Tenant-Isolation Audit

Review:

- Inventory endpoints.
- Dashboard endpoints.
- Import endpoints.
- Validation endpoints.
- Future write endpoints.

Create a documented endpoint permission matrix.

Ensure all business data access is scoped to verified membership context.

## Milestone D — Business Onboarding

Implement:

1. Business creation.
2. Business membership assignment.
3. User invitation.
4. Business selection.
5. Role management.
6. Membership activation and deactivation.

Avoid hardcoding Fimonaa India or Fimonaa Finland into mandatory initialization.

## Milestone E — Database Migration and Deployment Hardening

Complete:

1. Compiled JavaScript migration verification.
2. Full restored-inventory migration testing.
3. Backup and recovery validation.
4. Production database target verification.
5. Deployment configuration review.
6. Migration failure testing.

Do not modify the protected main database without explicit approval.

## Milestone F — Controlled Opening-Balance Import

Design and implement:

1. Validation-only import preview.
2. Dry-run mode.
3. Operator confirmation.
4. Business-specific authorization.
5. Import audit logging.
6. Duplicate detection.
7. Transaction rollback.
8. Production database safeguards.
9. Reconciliation reporting.

The temporary database restriction must not be removed casually.

## Milestone G — Inventory Operations

Extend inventory functionality with:

- Inventory adjustments.
- Stock movement ledger.
- Warehouse locations.
- Stock reservations.
- Stock release.
- Stock reconciliation.
- Business-scoped audit history.

All operations must preserve business isolation.

## Milestone H — Orders and Returns

Implement business-scoped:

- Orders.
- Order items.
- Fulfillment.
- Returns.
- Restocking.
- Inventory movement generation.

Inventory quantity changes must be auditable and transactionally consistent.

## Milestone I — Commerce Integrations

Future integrations may include:

- Shopify.
- Myntra.
- AJIO/AJIOGRAM.
- Nykaa Fashion.

Initial integrations should favor controlled read-only access.

Live inventory writes require explicit approval.

## Milestone J — Inventory Source-of-Truth Cutover

Follow ADR-001.

Before cutover:

1. Reconcile Excel inventory.
2. Reconcile Shopify inventory.
3. Validate marketplace inventory.
4. Confirm SKU mappings.
5. Validate movement history.
6. Establish operational ownership.
7. Approve rollback procedures.
8. Obtain explicit authorization.

No automatic cutover has occurred.

---

# 16. Safe Developer Command Reference

## 16.1 Application Build

From `apps/api`:

```bash
npm run build
```

This compiles the NestJS application.

## 16.2 TypeScript Test Compilation

```bash
npx tsc --project tsconfig.test.json --noEmit
```

This validates test TypeScript without emitting compiled files.

## 16.3 Git Inspection

```bash
git status --short --branch
```

```bash
git diff --check
```

```bash
git log -1 --oneline
```

These commands inspect Git state.

## 16.4 Integration-Test Safety

Before running integration tests:

- Confirm `.env.test` exists.
- Confirm `TEST_DATABASE_URL` targets the isolated local test database.
- Confirm the database name is `fimonaa_commerce_import_test`.
- Confirm the protected main database is not the target.
- Preserve test database safety assertions.

Never run integration tests against the protected main database.

## 16.5 Migration Safety

Do not casually execute:

```text
migration:run
migration:revert
seed:businesses
```

The application's normal environment may point to the protected database.

Migration execution requires explicit target verification and authorization.

## 16.6 Database Inspection

Read-only database inspection may be performed after verifying the connection target.

Example:

```sql
SELECT current_database();
```

Example migration inspection:

```sql
SELECT *
FROM typeorm_migrations
ORDER BY timestamp;
```

Read-only inspection must not be confused with permission to modify the database.

## 16.7 Credential Safety

Never commit:

- `.env`
- `.env.test`
- Database passwords.
- JWT secrets.
- Private keys.
- Production credentials.
- Database backups.
- Business-sensitive exports.

---

# 17. Version History and Acceptance Record

## 17.1 Version History

| Version | Milestone | Status |
|---|---|---|
| v1.0 | Initial development documentation | Historical reference |
| v1.1 | Business workspaces, inventory ownership, foundational migrations | Completed |
| v1.2 | Tenant-scoped SKU identifiers, migration 5, ADR-002 | Implemented and merged |
| **v1.3** | JWT authentication, business authorization, business-scoped inventory API, automated integration tests | **Implemented and locally committed; documentation and push pending** |

## 17.2 Acceptance Basis

Version 1.3 is based on:

- Implemented authentication module.
- Implemented JWT verification.
- Implemented membership resolution.
- Implemented role authorization.
- Implemented business-scoped inventory queries.
- Protected opening-balance import behavior.
- Isolated integration-test configuration.
- Successful unit-test execution.
- Successful integration-test execution.
- Successful TypeScript compilation.
- Successful NestJS build.
- Git whitespace validation.
- Implementation commit verification.
- Clean Git working tree following the implementation commit.

## 17.3 Verified Test Totals

| Test Category | Passed |
|---|---:|
| Unit tests | 75 |
| Integration tests | 37 |
| **Total** | **112** |

## 17.4 Database Safety Acceptance

The development milestone preserved the established database safety policy.

The protected main database was not used for integration-test writes or opening-balance imports.

The isolated test database was verified clean after test execution.

## 17.5 Current Acceptance State

**Development implementation: Completed.**

**Automated verification: Passed.**

**Implementation Git commit: Completed.**

**Documentation v1.3: Pending final review and commit.**

**GitHub push: Pending.**

**Production deployment: Not approved.**

**Protected inventory migration: Not approved.**

**Inventory source-of-truth cutover: Not started.**

---

# 18. Architecture Decision Records

## ADR-001 — Inventory Source of Truth and Controlled Cutover

Location:

```text
docs/architecture/decisions/ADR-001-inventory-source-of-truth.md
```

Defines:

- Excel as the current inventory authority.
- Commerce Hub as the future inventory authority.
- Business-specific inventory ownership.
- Inventory reconciliation.
- Controlled cutover.
- Explicit approval requirements.

## ADR-002 — Tenant-Scoped SKU Identifiers

Location:

```text
docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md
```

Defines:

- UUID-based inventory identity.
- Business-scoped SKU uniqueness.
- Composite movement relationships.
- Opening-balance import behavior.
- Migration validation.
- Rollback restrictions.
- Protected database safety.

## 18.1 Future Architecture Decisions

Additional ADRs should be considered for:

- Authentication and token lifecycle.
- Business membership authorization.
- Endpoint permission model.
- Production import architecture.
- Inventory ledger design.
- Warehouse management.
- Marketplace synchronization.
- Deployment and recovery strategy.

These are proposed future decisions, not existing approved ADRs.

---

# 19. Development Checkpoint Summary

Fimonaa Commerce Hub v1.3 establishes the first tested application-level authorization layer for the multi-business inventory architecture.

The milestone introduces:

- Verified JWT access-token handling.
- Authenticated user context.
- Business membership resolution.
- Role-based authorization.
- Business-scoped inventory retrieval.
- Protected opening-balance imports.
- Isolated database integration testing.
- Automated cross-business access verification.

The completed verification includes:

**75 passing unit tests.**

**37 passing integration tests.**

**112 passing automated tests in total.**

The implementation has been committed locally as:

```text
9f424e1
```

The next immediate task is to finalize and commit this documentation, then push the feature branch to GitHub.

The next engineering priority is completing the authentication lifecycle and reviewing remaining endpoints for tenant isolation.

The protected Fimonaa India inventory must remain unchanged until a separately approved migration and cutover process is completed.

---

**Fimonaa Commerce Hub**<br>
**Development Documentation — Version 1.3**<br>
**26 October 2026**

*End of document.*
