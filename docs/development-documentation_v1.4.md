# Fimonaa Commerce Hub
## Development Documentation — Version 1.4

**Status:** Authentication lifecycle, business authorization, and business-scoped inventory API implemented and tested; not production-ready<br>
**Updated:** 11 November 2026<br>
**Repository:** `fimonaa/fimonaa-commerce-hub`<br>
**Documentation branch:** `docs/development-documentation-v1.4`<br>
**Implementation reference:** `d1c25be`<br>
**Implementation milestone:** Authentication and invitation lifecycle, PR #7<br>
**Delivery state:** Authentication implementation merged into `main`; documentation v1.4 in progress<br>
**Previous documentation:** v1.3 — Business-scoped inventory authorization<br>

> **Critical database safety notice**
>
> The protected `fimonaa_commerce` database contains historical Fimonaa India inventory. Do not run migrations, imports, seed scripts, destructive SQL, integration tests, or other database writes against it without explicit authorization.
>
> The Excel SKU workbook remains the inventory source of truth until an approved cutover.
>
> Automated integration tests must use the isolated `fimonaa_commerce_import_test` database.

---

# 1. Executive Summary

Version 1.4 documents the completed initial authentication and invitation lifecycle for Fimonaa Commerce Hub.

This milestone builds on the multi-business architecture, tenant-scoped SKU identifiers, JWT verification, role-based authorization, and business-scoped inventory APIs established in earlier versions.

The backend now supports credential-based login, short-lived JWT access tokens, invitation-based account activation, and business-specific authorization.

Authentication responsibilities are separated into dedicated services for credential verification, password hashing, access-token issuance, invitation generation, invitation persistence, and invitation acceptance.

## 1.1 Completed Implementation

The following functionality is implemented:

1. Credential-based login for active users.
2. Argon2id password hashing and verification.
3. JWT access-token issuance with a 15-minute lifetime.
4. Generic authentication errors for invalid credentials.
5. Cryptographically secure invitation token generation.
6. SHA256 hashing of invitation tokens before database storage.
7. Invitation creation restricted to business owners and administrators.
8. Invitation expiration after 24 hours.
9. Transactional account activation and single-use invitation consumption.
10. Global authentication and role-based authorization guards.
11. Database-backed business membership and role resolution.
12. Business-scoped inventory listing with search, filtering, and pagination.
13. Protected opening-balance import functionality.
14. Isolated PostgreSQL integration-test infrastructure.
15. Automated authentication, authorization, and tenant-isolation tests.

The invitation workflow currently activates invited users who already have a membership in the selected business. It does not provision new memberships for existing active users.

## 1.2 Verification Summary

The authentication milestone completed the following automated verification:

| Verification | Result |
|---|---|
| Unit tests | 151 passed |
| Integration tests | 83 passed |
| Total automated tests | 234 passed |
| TypeScript compilation | Passed |
| NestJS production build | Passed |
| Authentication pull request | #7 |
| Main branch implementation reference | `d1c25be` |

These results describe the completed authentication milestone. They do not constitute production certification.

## 1.3 Current Git Status

**Implementation:** Authentication and invitation lifecycle merged into `main`.

**Main branch reference:** `d1c25be`

**Documentation branch:** `docs/development-documentation-v1.4`

**Documentation status:** In progress.

Business Membership Management is being developed separately on `feature/business-membership-management`.

Its initial read-only service was preserved in checkpoint commit `47acd8e`. This unfinished work is not included in the v1.4 implementation baseline.

## 1.4 Production Readiness

**Fimonaa Commerce Hub is not production ready.**

Outstanding requirements include:

- Refresh-token and session-management strategy.
- Logout and access-token revocation.
- Password recovery.
- Login and public-endpoint rate limiting.
- Secure invitation delivery.
- Business membership administration.
- Business onboarding and provisioning.
- Endpoint authorization and tenant-isolation audit.
- Production authentication secret management.
- Deployment, migration, backup, and recovery validation.
- Inventory reconciliation and controlled source-of-truth cutover.
- Shopify and marketplace integrations.

The protected Fimonaa India inventory database must not be modified without explicit authorization.

The Fimonaa India Master SKU workbook remains the authoritative inventory source until an approved cutover.

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

The repository is a modular monolith with separate API, web, and worker applications. The following is a representative structure rather than an exhaustive file inventory.

```text
fimonaa-commerce-hub/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   ├── migrations/ (six TypeORM migrations)
│   │   │   │   └── data-source.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/ (login, JWT, invitations, guards, entities)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── health/
│   │   │   │   ├── imports/
│   │   │   │   └── inventory/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/ (fixtures, helpers, integration tests)
│   │   ├── jest.integration.config.ts
│   │   └── tsconfig.test.json
│   ├── web/
│   └── worker/
├── docs/
│   ├── architecture/decisions/ (ADR-001, ADR-002, ADR-003)
│   ├── development-documentation_v1.0.md
│   ├── development-documentation_v1.1.md
│   ├── development-documentation_v1.2.md
│   ├── development-documentation_v1.3.md
│   └── development-documentation_v1.4.md
└── README.md
```

The separate `feature/business-membership-management` branch contains unfinished membership administration work. It is not part of the `d1c25be` implementation baseline.

---

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

## 4.8 User Invitations

The `user_invitations` table supports initial account activation.

| Column | Purpose |
|---|---|
| `id` | Invitation UUID |
| `user_id` | References the invited user |
| `token_hash` | Unique SHA256 hash of the invitation token |
| `expires_at` | Invitation expiration timestamp |
| `consumed_at` | Timestamp recorded after successful acceptance |
| `created_at` | Invitation creation timestamp |

The `user_id` foreign key references `users(id)` with `ON DELETE RESTRICT`.

The table includes indexes on `user_id` and `expires_at`.

Database constraints require expiration to occur after creation and consumption, when present, not to precede creation.

Plaintext invitation tokens are not persisted.

Business ownership is validated through the invited user's existing business membership. The invitation record itself does not contain a `business_id`.

The invitation creation service uses a transaction and locks the invited user row to coordinate concurrent invitation requests. The database does not independently enforce one active invitation per user.

---

# 5. Database Migration Inventory

Six TypeORM migrations are implemented.

| Order | Migration | Purpose |
|---|---|---|
| 1 | `1761070000000-CreateBusinessWorkspace.ts` | Creates business, user, and membership tables |
| 2 | `1761080000000-CreateFoundationalInventoryTables.ts` | Creates foundational inventory tables |
| 3 | `1792600000000-AddBusinessOwnershipToInventory.ts` | Adds business ownership to inventory and movements |
| 4 | `1792700000000-AddBusinessOwnershipToOpeningBalanceImports.ts` | Adds business ownership and scoped import uniqueness |
| 5 | `1792800000000-AddTenantScopedSkuIdentifiers.ts` | Adds UUID inventory identifiers and removes global SKU uniqueness |
| 6 | `1792900000000-CreateUserInvitations.ts` | Creates the invitation token persistence table and supporting constraints |

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

## 5.6 Migration 6: User Invitations

Migration `1792900000000-CreateUserInvitations.ts` introduces the `user_invitations` table.

It creates:

1. A UUID primary key.
2. A restricted foreign key to `users`.
3. A unique SHA256 token-hash column.
4. Invitation expiration and consumption timestamps.
5. Timestamp validation constraints.
6. Indexes supporting user lookup and expiration queries.

The migration's `down()` method intentionally throws an error.

Automatic rollback is disabled because removing invitation records requires a reviewed, data-preserving recovery plan.

## 5.7 Migration 6 Deployment Status

Migration 6 exists in the repository and is included in the authentication implementation merged through PR #7.

Its execution against the protected `fimonaa_commerce` database has not been verified in this documentation review.

Do not interpret migration availability, successful compilation, or isolated integration tests as confirmation of protected-database deployment.

No protected-database migration should be executed without explicit authorization.

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

Version 1.3 introduced JWT verification and business-context authorization. Version 1.4 completes the initial login and invitation-based account activation workflow.

The authentication module is located at `apps/api/src/modules/auth/`. Authentication identifies the user; authorization separately checks active business membership and role on each protected request.

## 7.2 Authentication Module

The implementation includes an authentication controller and service, JWT verification and issuance, credential and password services, invitation creation and acceptance services, persistence entities, DTOs, public and role decorators, and global authentication and roles guards. Unit tests are maintained alongside the corresponding implementation.

The precise file inventory should be verified against the repository when updating this document in a later milestone.

---

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

## 7.10 Authentication Lifecycle Status

The initial authentication lifecycle is implemented.

The API supports credential-based login, JWT access-token issuance,
invitation creation, and invitation-based account activation.

Protected requests use JWT verification and database-backed business
membership resolution to establish the authenticated business context.

Authentication responsibilities are separated into dedicated services,
described in Sections 7.11 through 7.14.

Remaining authentication and invitation limitations are documented
in Section 7.15.

## 7.11 Credential-Based Login

The API exposes `POST /api/auth/login` as a public endpoint.

The login workflow:

1. Validates the email and password.
2. Normalizes the email address.
3. Retrieves the user's password hash.
4. Requires an active user account.
5. Verifies the password using Argon2id.
6. Issues a JWT access token.

Invalid credentials produce a generic unauthorized response. A dummy password hash is used for missing or ineligible accounts to reduce timing differences.

Successful login returns an access token, the `Bearer` token type, and an expiration value of 900 seconds.

## 7.12 Password Security

Passwords are hashed using Argon2id.

| Parameter | Value |
|---|---|
| Algorithm | Argon2id |
| Memory cost | 19456 KiB |
| Time cost | 2 |
| Parallelism | 1 |

Password hashes are excluded from default user entity selections.

Plaintext passwords must never be stored or logged.

## 7.13 Invitation Creation

The API exposes `POST /api/auth/invitations`.

Access requires an authenticated user with the `owner` or `admin` role in the selected business.

The service verifies that the target user:

1. Exists with `invited` status.
2. Has a membership in the authenticated business.
3. Has no existing unexpired, unconsumed invitation.

Invitation creation runs in a database transaction and locks the invited user row.

Tokens are generated from 32 cryptographically secure random bytes and encoded using Base64URL.

Only the SHA256 token hash is stored in the database.

Invitations expire after 24 hours.

The plaintext token is returned in the API response for the current internal workflow. The response includes `Cache-Control: no-store`.

Invitation tokens must not be logged or included in monitoring and analytics payloads.

## 7.14 Invitation Acceptance

The API exposes `POST /api/auth/accept-invitation` as a public endpoint.

The request contains an invitation token and a password.

Passwords must contain between 12 and 1024 characters.

The acceptance service:

1. Validates the invitation token format.
2. Calculates its SHA256 hash.
3. Locks and validates the invitation record.
4. Rejects expired or consumed invitations.
5. Locks the associated invited user.
6. Hashes the new password.
7. Changes the user status to `active`.
8. Records invitation consumption.

These operations run within a single database transaction.

Successful acceptance returns HTTP 204.

Consumed invitation tokens cannot be reused successfully.

## 7.15 Current Limitations

The current invitation workflow activates users who already exist with `invited` status and have an existing business membership.

It does not create new users or memberships.

The following capabilities remain pending:

1. Automated invitation email delivery.
2. Invitations for existing active users joining additional businesses.
3. Business membership administration.
4. Invitation cancellation and revocation endpoints.
5. Password recovery.
6. Refresh tokens and session management.
7. Logout and access-token revocation.
8. Login and public-endpoint rate limiting.

These requirements will be addressed in subsequent development milestones.

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

Version 1.3 established the isolated PostgreSQL integration-test strategy. Version 1.4 expands coverage for login, invitation issuance, invitation acceptance, and authentication security.

The test suite includes:

- Unit tests.
- PostgreSQL integration tests.
- HTTP authorization tests.
- Cross-business isolation tests.
- Opening-balance import tests.
- Database environment safety tests.

## 11.2 Unit Tests

**Version 1.4 milestone result: 151 passing unit tests.**

The previous v1.3 milestone recorded 75 unit tests across 11 suites. Suite counts for v1.4 are not asserted here.

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

**Version 1.4 milestone result: 83 passing integration tests.**

The previous v1.3 milestone recorded 37 integration tests across 5 suites. Suite counts for v1.4 are not asserted here.

The integration suite includes tests for:

- Login, invitation creation and invitation acceptance.
- Database connection.
- Test environment configuration.
- Opening-balance import behavior.
- Business-scoped inventory isolation.
- HTTP authentication and authorization.

## 11.4 HTTP Authorization Tests

The v1.3 HTTP authorization integration suite recorded **23 passing tests**. This is a historical suite-level count, not the total for v1.4.

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

The v1.3 inventory business-isolation suite recorded **6 passing tests**.

These tests verify that inventory operations respect business ownership.

## 11.6 Opening-Balance Import Tests

The v1.3 opening-balance integration suite recorded **5 passing tests**.

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

This is the recorded state from the earlier isolated test run. It does not independently establish the database state after subsequent runs.

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

Both completed successfully during the recorded authentication milestone.

The milestone also recorded 151 passing unit tests and 83 passing integration tests. These are historical verification results, not a new test execution performed during this documentation update.

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
| User invitations | Automatic rollback refused |

## 12.3 Migration 5 and 6 Rollback

Migration 5 intentionally refuses automatic rollback because restoring a global SKU primary key could be unsafe once multiple businesses use identical SKU strings.

Migration 6 also refuses automatic rollback because dropping invitation records could destroy activation history. Both require a reviewed recovery plan.

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

## 13.4 Merged Inventory Authorization Milestone

The business-scoped inventory authorization milestone was merged into `main` through pull request #6.

**Main branch commit:** `d4e5296`

The original feature commit `9f424e1` remains part of the historical development record.

## 13.5 Authentication and Invitation Lifecycle Milestone

The initial authentication lifecycle was merged into `main` through pull request #7.

**Main branch commit:** `d1c25be`

This milestone introduced:

1. Credential-based login.
2. Argon2id password hashing.
3. JWT access-token issuance.
4. Invitation creation and persistence.
5. Transactional invitation acceptance.
6. Single-use invitation tokens.
7. Migration 6.
8. Expanded authentication unit and integration tests.

## 13.6 Business Membership Management

Business membership administration is under development.

**Branch:** `feature/business-membership-management`
**Checkpoint commit:** `47acd8e`
**Status:** Incomplete, not merged.

The checkpoint contains an initial read-only membership service. Controllers, module integration, and associated tests remain unfinished.

This work is not part of the v1.4 implementation baseline.

## 13.7 Documentation Milestone

**Document:** `docs/development-documentation_v1.4.md`
**Branch:** `docs/development-documentation-v1.4`
**Status:** In progress
**Commit:** Pending
**Pull request:** Pending

The documentation milestone also includes ADR-003 and an update to the repository README.

## 13.8 Delivery Checklist

Before merging the documentation branch:

1. Complete and review development documentation v1.4.
2. Verify implementation claims against the repository.
3. Remove outdated milestone status statements.
4. Complete ADR-003.
5. Update the root README.
6. Verify no credentials or database backups are staged.
7. Review the Git diff and validate whitespace.
8. Commit and push the documentation branch.
9. Create and review the documentation pull request.
10. Merge after review and verify `main`.

No production deployment or protected-database migration is authorized by this documentation milestone.

---

# 14. Open Issues and Production Blockers

The initial authentication milestone is complete, but production security and operational readiness remain outstanding.

| Priority | Item | Status | Required Outcome |
|---|---|---|---|
| P0 | JWT verification | Implemented | Production security review |
| P0 | Login and token issuance | Implemented | Rate limiting, monitoring and security review |
| P0 | Initial invitation activation | Implemented | Secure delivery and provisioning workflow |
| P0 | Refresh tokens, logout and session invalidation | Pending | Define and implement session lifecycle |
| P0 | Password recovery | Pending | Secure recovery and credential reset |
| P0 | Business membership authorization | Implemented | Broader operational review |
| P0 | Business membership administration | In development | Complete controllers, tests and owner safeguards |
| P0 | Role-based authorization | Implemented | Endpoint permission matrix |
| P0 | Business-scoped inventory listing | Implemented | Extend to future inventory operations |
| P0 | Dashboard tenant isolation | Review required | Verify every dashboard query |
| P0 | Opening-balance import authorization | Implemented | Production workflow remains disabled |
| P0 | Production opening-balance import | Disabled | Approved import architecture |
| P0 | Protected India inventory migration | Not authorized | Explicit approval and migration plan |
| P1 | Automated PostgreSQL integration tests | Implemented | Expand failure and migration coverage |
| P1 | Login and public-endpoint rate limiting | Pending | Abuse and brute-force protection |
| P1 | Invitation email delivery and revocation | Pending | Secure token transport and cancellation |
| P1 | Invitations for existing active users | Pending | Membership provisioning and invitation redesign |
| P1 | Compiled migration execution | Pending | Verify production migration discovery |
| P1 | Full restored-inventory compatibility | Pending | Test against approved restored copy |
| P1 | Deployment security and secrets management | Pending | Harden production configuration |
| P1 | Recovery procedures | Pending | Tested backup and restore |
| P1 | Endpoint authorization audit | Pending | Review all protected routes |
| P1 | Validation endpoint security | Review required | Prevent unauthorized data and path exposure |
| P2 | Business onboarding | Pending | Tenant creation and selection |
| P2 | Inventory ledger and warehouse management | Pending | Auditable multi-location inventory |
| P2 | Stock reservations | Pending | Reservation and release logic |
| P2 | Orders and returns | Pending | Business-scoped operational workflows |
| P2 | Shopify and marketplace integration | Future milestone | Approved read-only connectors first |
| P2 | Inventory reconciliation and source-of-truth cutover | Not started | Follow ADR-001 |

## 14.1 Critical Security Boundary

A signed JWT does not automatically grant access to every business. A client-supplied business UUID must be verified against an active membership. Database ownership constraints and application authorization must work together.

## 14.2 Critical Inventory Boundary

The import service is not authorization to run production imports. The feature flag remains disabled by default and the service currently restricts execution to the isolated test database.

## 14.3 Critical Deployment Boundary

Passing automated tests does not authorize production deployment. Deployment requires additional verification, security review, and explicit operational approval.

---

# 15. Recommended Next Development Sequence

## Milestone A: Complete v1.4 Documentation Delivery

**Status:** In progress on `docs/development-documentation-v1.4`.

Finalize this document, ADR-003 and the root README. Review claims against the repository, check the Git diff for credentials and unrelated changes, then commit, push, open a pull request and merge after review. Do not change any database as part of documentation delivery.

## Milestone B: Business Membership Management

**Status:** Incomplete on `feature/business-membership-management`; checkpoint `47acd8e`.

Complete the read-only membership controller, module integration and tests first. Planned routes are `GET /api/businesses/current/members` and `GET /api/businesses/current/members/:id`, restricted to owners and administrators. Follow with carefully designed role changes and membership removal. Prevent removing or demoting the last active owner, including under concurrent requests. Enforce tenant isolation and do not expose password hashes or other sensitive user fields.

## Milestone C: Membership Provisioning and Invitations

Design user and business creation, initial membership provisioning, invitations for existing active users, invitation cancellation and secure delivery. The existing invitation record is tied to a user, not directly to a business. Any change to its semantics or schema requires a separate reviewed migration and tests. Do not present these capabilities as implemented.

## Milestone D: Authentication Hardening

Design refresh-token rotation, session persistence, logout and revocation, password recovery, rate limiting, audit logging and secret rotation. Keep credential errors generic and invitation tokens out of logs. Review public endpoints for abuse and information disclosure.

## Milestone E: Authorization and Tenant-Isolation Audit

Document the endpoint permission matrix. Review inventory, dashboard, import, validation and future write endpoints. Every business-specific query must use verified membership context. Test cross-business access and role changes.

## Milestone F: Migration and Deployment Hardening

Verify compiled JavaScript migration discovery, migration failure handling, backup integrity and restore procedures. Test against an approved restored inventory copy. Confirm the database target before any operation that could write data. Never modify the protected `fimonaa_commerce` database without explicit authorization.

## Milestone G: Controlled Opening-Balance Import

Design validation-only preview, dry run, operator confirmation, business authorization, audit logging, duplicate detection, rollback and reconciliation. The existing test-database restriction must not be removed casually. The Excel workbook remains authoritative until approved cutover.

## Milestone H: Inventory Operations

Implement auditable inventory adjustments, movement ledger, warehouse locations, reservations, releases and reconciliation with transactional consistency and business isolation.

## Milestone I: Orders and Returns

Implement business-scoped orders, order items, fulfillment, returns, restocking and corresponding inventory movements. Preserve auditability and transactional consistency.

## Milestone J: Commerce Integrations

Consider Shopify, Myntra, AJIO/AJIOGRAM and Nykaa Fashion. Start with controlled read-only integrations. Live inventory writes require separate approval.

## Milestone K: Inventory Source-of-Truth Cutover

Follow ADR-001. Reconcile Excel, Shopify and marketplace stock; validate SKU mappings and movement history; establish operational ownership and rollback procedures; and obtain explicit authorization. No cutover has occurred.

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
| v1.1 | Business workspaces and inventory ownership | Historical completed milestone |
| v1.2 | Tenant-scoped SKU identifiers, migration 5 and ADR-002 | Merged |
| v1.3 | JWT verification, business authorization, inventory API and isolated integration tests | Implementation merged through PR #6 (`d4e5296`) |
| **v1.4** | Login, Argon2id, invitation lifecycle, migration 6 and expanded tests | **Implementation merged through PR #7 (`d1c25be`); documentation in progress** |

## 17.2 Acceptance Basis

The v1.4 milestone records credential-based login, Argon2id password verification, 15-minute JWT issuance, business-context authorization, owner/admin invitation issuance, hashed single-use invitation tokens, transactional account activation, migration 6 and expanded automated tests.

The milestone also records successful TypeScript compilation and NestJS build. These are recorded results from the implementation milestone, not checks rerun while preparing this document.

## 17.3 Recorded Verification Totals

| Milestone | Unit Tests | Integration Tests | Total |
|---|---:|---:|---:|
| v1.3 | 75 | 37 | 112 |
| **v1.4** | **151** | **83** | **234** |

The totals describe their respective historical milestones. They do not include unfinished membership-management work.

## 17.4 Database Safety Acceptance

The development work was designed and tested using an isolated PostgreSQL test database. No documentation change authorizes a write to the protected India inventory database. The status of migration 6 on that protected database has not been verified as part of this review.

## 17.5 Current Acceptance State

**Authentication implementation:** Merged into `main` at `d1c25be`.

**Recorded automated verification:** Passed, 234 tests.

**Documentation v1.4, ADR-003 and README:** Prepared for review; not yet committed or merged.

**Business membership administration:** Incomplete on a separate feature branch.

**Production deployment:** Not approved.

**Protected inventory migration:** Not approved.

**Inventory source-of-truth cutover:** Not started.

---

# 18. Architecture Decision Records

## ADR-001: Inventory Source of Truth and Controlled Cutover

`docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`

Defines Excel as the current inventory authority, business-specific inventory ownership, reconciliation and explicit approval before cutover.

## ADR-002: Tenant-Scoped SKU Identifiers

`docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`

Defines UUID inventory identity, business-scoped SKU uniqueness, composite movement relationships, migration validation and rollback restrictions.

## ADR-003: Authentication and Business Authorization

`docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`

Documents the implemented JWT and Argon2id decisions, database-backed membership resolution, global guards, invitation security, transactional acceptance and known limitations. The record describes the implemented design; it does not approve production deployment.

## 18.1 Future Architecture Decisions

Further ADRs should cover session and refresh-token management, membership provisioning and invitation redesign, endpoint permission policy, production import architecture, inventory ledger, warehouses, marketplace synchronization, deployment and recovery. These remain future decisions.

---

# 19. Development Checkpoint Summary

Fimonaa Commerce Hub v1.4 completes the initial credential-based authentication and invitation activation milestone on top of the business-scoped inventory authorization introduced in v1.3.

The implemented baseline includes login for active users, Argon2id password hashing, 15-minute HS256 JWT access tokens, database-backed business membership and role resolution, protected inventory listing, owner/admin invitation creation, hashed 24-hour invitation tokens, and transactional single-use acceptance.

The recorded verification totals are **151 passing unit tests and 83 passing integration tests, 234 tests in total**. The implementation was merged through PR #7 as `d1c25be`. These results are not production certification.

The next immediate delivery task is reviewing and merging documentation v1.4, ADR-003 and the README. The next engineering priority is completing the separate business membership management feature, then addressing invitation provisioning and authentication hardening.

The protected Fimonaa India database must remain unchanged without explicit approval. The Excel SKU workbook remains authoritative until a controlled and separately approved cutover.

---

**Fimonaa Commerce Hub**<br>
**Development Documentation — Version 1.4**<br>
**11 November 2026**

*End of document.*
