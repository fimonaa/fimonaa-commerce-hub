# Fimonaa Commerce Hub

## Development Documentation: Version 1.6

**Status:** Business Membership Management Phase 2B implemented, tested and merged; not production ready
**Updated:** 22 November 2026
**Repository:** `fimonaa/fimonaa-commerce-hub`
**Documentation branch:** `docs/development-documentation-v1.6`
**Implementation reference:** `c852d35`
**Implementation milestone:** Business Membership Management Phase 2B, PR #11
**Delivery state:** Implementation merged into `main`; documentation v1.6 in progress
**Previous documentation:** v1.5, Read-only Business Membership Management

> **Critical database safety notice**
>
> The protected `fimonaa_commerce` database contains historical Fimonaa India inventory. Do not run migrations, imports, seed scripts, destructive SQL, integration tests or other database writes against it without explicit authorization.
>
> The Excel SKU workbook remains the inventory source of truth until an approved cutover.
>
> Automated integration tests must use the isolated `fimonaa_commerce_import_test` database.

---

# 1. Executive Summary

Version 1.6 documents the completed Business Membership Management Phase 2B implementation for Fimonaa Commerce Hub.

The milestone extends the existing multi-business architecture, authentication system, invitation lifecycle, business-scoped authorization, inventory APIs and read-only membership management.

Phase 2B introduces business membership invitation workflows and membership lifecycle administration, allowing authorized users to manage access to individual business workspaces.

The implementation was completed and merged into `main` through pull request #11, with merge commit `c852d35`.

The backend now supports membership listing, retrieval, role updates, suspension, reactivation and removal. It also provides dedicated business membership invitation endpoints for issuance, acceptance, listing, retrieval and revocation.

Membership operations use verified business context, role-based authorization, transactional consistency and tenant isolation.

Two additional TypeORM migrations introduce membership lifecycle attributes and a dedicated business membership invitation table.

The implementation does not authorize production deployment, database migration against protected environments or inventory source-of-truth cutover.

## 1.1 Completed Implementation

The development baseline includes:

1. Credential-based authentication for active users.
2. Argon2id password hashing and verification.
3. JWT access-token issuance.
4. Global authentication and role-based authorization guards.
5. Database-backed business membership resolution.
6. Business-scoped inventory listing, searching, filtering and pagination.
7. Protected opening-balance import functionality.
8. Isolated PostgreSQL integration-test infrastructure.
9. Business membership listing and individual retrieval.
10. Business membership invitation issuance.
11. Business membership invitation acceptance.
12. Business membership invitation listing and retrieval.
13. Business membership invitation revocation.
14. Business membership role updates.
15. Business membership suspension.
16. Business membership reactivation.
17. Business membership removal.
18. Business-scoped authorization and cross-business isolation.
19. Transactional membership lifecycle operations.
20. PostgreSQL row-level locking for membership mutations.
21. Membership lifecycle status tracking.
22. Dedicated business membership invitation persistence.
23. Database constraints supporting invitation integrity.
24. Automated unit tests for membership lifecycle functionality.
25. HTTP integration tests for authentication, authorization and business isolation.
26. Automated verification of membership and invitation workflows.

The membership lifecycle supports four statuses:

| Status      | Meaning                                      |
| ----------- | -------------------------------------------- |
| `pending`   | Membership awaiting activation               |
| `active`    | Membership currently active                  |
| `suspended` | Membership temporarily disabled              |
| `removed`   | Membership removed from active participation |

Membership removal uses lifecycle state rather than immediate deletion of the membership record.

The invitation schema stores hashed invitation tokens and records expiration, acceptance and revocation.

The business membership invitation workflow is separate from the earlier account activation invitation workflow.

## 1.2 Verification Summary

The completed Phase 2B milestone recorded:

| Verification                         | Result                      |
| ------------------------------------ | --------------------------- |
| Unit tests                           | 348 passed across 31 suites |
| Integration tests                    | 376 passed across 19 suites |
| Total automated tests                | 724 passed                  |
| Total test suites                    | 50                          |
| TypeScript compilation               | Passed                      |
| ESLint                               | Passed                      |
| NestJS production build              | Passed                      |
| GitHub CI                            | 2 successful checks         |
| Implementation pull request          | #11                         |
| Main branch implementation reference | `c852d35`                   |

These results were recorded during the Phase 2B implementation milestone. They have not been independently rerun during this documentation update.

Successful automated verification does not establish production readiness.

## 1.3 Current Git Status

**Implementation:** Business Membership Management Phase 2B completed and merged into `main`.

**Main branch reference:** `c852d35`

**Final feature commit:** `a84c273`

**Implementation pull request:** #11

**Documentation branch:** `docs/development-documentation-v1.6`

**Documentation status:** In progress.

**Working baseline:** The documentation branch was created from the updated `main` branch at commit `c852d35`.

The completed implementation includes backend membership lifecycle administration and invitation management.

A dedicated frontend interface for these operations remains a proposed future milestone.

## 1.4 Production Readiness

**Fimonaa Commerce Hub is not production ready.**

The following requirements remain outstanding or require additional verification:

- Refresh-token rotation and session persistence.
- Logout and session revocation.
- Password recovery and secure credential reset.
- Login and public-endpoint rate limiting.
- Secure invitation delivery.
- Comprehensive membership and invitation audit logging.
- Production security review of membership lifecycle operations.
- Verification of last-active-owner safeguards across all relevant operations.
- Business onboarding and initial provisioning.
- Business Membership Administration frontend.
- Endpoint authorization and tenant-isolation audit.
- Dashboard tenant-isolation review.
- Production authentication secret management.
- Deployment and migration verification.
- Database backup and recovery validation.
- Controlled production opening-balance import architecture.
- Inventory reconciliation and source-of-truth cutover.
- Shopify and marketplace integrations.

The protected Fimonaa India inventory database must not be modified without explicit authorization.

The Excel SKU workbook remains the authoritative inventory source until a separately approved cutover.

---

# 2. Product Direction and Scope

Fimonaa Commerce Hub is an **inventory-first, multi-business commerce operations platform**.

It is designed initially for:

- Fimonaa India.
- Fimonaa Finland.

The architecture must also support additional businesses and potential future SaaS tenants.

The platform is intended to provide a centralized operational system for inventory, orders, returns, warehouses and commerce integrations.

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

Phase 2B extends this principle to membership administration. A user authorized to manage memberships in one business must not automatically receive equivalent privileges in another business.

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
16. Membership lifecycle changes must respect verified business ownership.
17. Membership mutations must preserve transactional consistency.
18. Invitation tokens must not be stored in plaintext.
19. Suspended and removed memberships must not authorize protected business operations.
20. Production deployment and database changes require separate operational approval.

## 2.3 Business Initialization

Fimonaa India and Fimonaa Finland are initial business examples.

They are not mandatory records in every installation.

A fresh installation must support creating businesses independently.

The optional business seed script is not part of mandatory SaaS initialization.

Business onboarding and initial owner provisioning remain separate development requirements.

---

# 3. Technical Stack and Repository

## 3.1 Technology Stack

| Layer               | Technology                  |
| ------------------- | --------------------------- |
| Backend             | NestJS 11                   |
| Language            | TypeScript                  |
| Database            | PostgreSQL 16               |
| ORM                 | TypeORM 0.3.31              |
| Authentication      | JWT                         |
| JWT library         | `@nestjs/jwt`               |
| Frontend            | React 19                    |
| Frontend tooling    | Vite 8                      |
| Styling             | Tailwind CSS 4              |
| Supporting service  | Redis 7                     |
| Unit testing        | Jest 30                     |
| Integration testing | Jest, Supertest, PostgreSQL |
| API documentation   | Swagger / OpenAPI           |
| Architecture        | Modular monolith            |
| Multi-tenancy       | Business-scoped ownership   |
| Version control     | Git / GitHub                |

## 3.2 Repository Structure

The repository is a modular monolith with separate API, web and worker applications.

The following is a representative structure rather than an exhaustive file inventory.

```text
fimonaa-commerce-hub/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   ├── migrations/ (eight documented TypeORM migrations)
│   │   │   │   └── data-source.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── business-memberships/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── health/
│   │   │   │   ├── imports/
│   │   │   │   └── inventory/
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── jest.integration.config.ts
│   │   └── tsconfig.test.json
│   ├── web/
│   └── worker/
├── docs/
│   ├── architecture/decisions/
│   ├── IMPLEMENTATION_PLAN.md
│   ├── development-documentation_v1.0.md
│   ├── development-documentation_v1.1.md
│   ├── development-documentation_v1.2.md
│   ├── development-documentation_v1.3.md
│   ├── development-documentation_v1.4.md
│   ├── development-documentation_v1.5.md
│   └── development-documentation_v1.6.md
└── README.md
```

Business Membership Management Phase 1 was merged through PR #9 (`5de2992`).

Phase 2B expanded the implementation with invitation management and membership lifecycle operations, merged through PR #11 (`c852d35`).

Frontend membership administration and production operational hardening remain outstanding.

## 3.3 API Configuration

The NestJS application uses a global configuration module.

The database connection is configured through `DATABASE_URL`.

TypeORM automatic schema synchronization is disabled:

```typescript
synchronize: false;
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

The foundational schema includes three primary business identity tables.

### businesses

Represents business workspaces.

### users

Represents platform users.

### business_memberships

Associates users with businesses and defines business-specific roles.

Phase 2B extends business membership records with lifecycle status and timestamps.

## 4.2 Supported Roles

The current role model includes:

| Role                | Intended Responsibility                                 |
| ------------------- | ------------------------------------------------------- |
| `owner`             | Business ownership and highest business-level authority |
| `admin`             | Business administration                                 |
| `inventory_manager` | Inventory management                                    |
| `operator`          | Operational workflows                                   |
| `viewer`            | Read-oriented access                                    |

Role names establish the authorization model.

Individual endpoint permissions must still be explicitly defined and tested.

## 4.3 Inventory Tables

| Table                               | Responsibility                   |
| ----------------------------------- | -------------------------------- |
| `inventory_skus`                    | SKU records and stock quantities |
| `inventory_movements`               | Inventory movement history       |
| `inventory_opening_balance_imports` | Opening-balance import history   |

Inventory records contain `business_id`.

## 4.4 Tenant-Scoped SKU Identity

Migration 5 introduced UUID-based inventory identifiers.

The inventory identity fields are:

| Field         | Purpose                  |
| ------------- | ------------------------ |
| `id`          | Internal UUID identifier |
| `business_id` | Owning business          |
| `sku`         | Human-readable SKU code  |

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

The same principle applies to membership records and membership invitations.

## 4.8 User Invitations

The `user_invitations` table supports initial account activation.

| Column        | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `id`          | Invitation UUID                                |
| `user_id`     | References the invited user                    |
| `token_hash`  | Unique SHA256 hash of the invitation token     |
| `expires_at`  | Invitation expiration timestamp                |
| `consumed_at` | Timestamp recorded after successful acceptance |
| `created_at`  | Invitation creation timestamp                  |

The `user_id` foreign key references `users(id)` with `ON DELETE RESTRICT`.

The table includes indexes on `user_id` and `expires_at`.

Database constraints require expiration to occur after creation and consumption, when present, not to precede creation.

Plaintext invitation tokens are not persisted.

Business ownership is validated through the invited user's existing business membership. The invitation record itself does not contain a `business_id`.

The invitation creation service uses a transaction and locks the invited user row to coordinate concurrent invitation requests.

The database does not independently enforce one active invitation per user.

This original account activation workflow remains distinct from the Phase 2B business membership invitation workflow.

## 4.9 Business Membership Lifecycle

Phase 2B extends the existing `business_memberships` table to support membership lifecycle management.

Migration `1793000000000-AddBusinessMembershipLifecycle.ts` introduces three columns:

| Column       | Type                    | Description                         |
| ------------ | ----------------------- | ----------------------------------- |
| `status`     | `VARCHAR(20)`           | Current membership lifecycle status |
| `updated_at` | `TIMESTAMPTZ`           | Membership update timestamp         |
| `removed_at` | `TIMESTAMPTZ`, nullable | Membership removal timestamp        |

The `status` column is required and defaults to `active`.

Supported membership statuses are:

| Status      | Meaning                                      |
| ----------- | -------------------------------------------- |
| `pending`   | Membership awaiting activation               |
| `active`    | Membership currently active                  |
| `suspended` | Membership temporarily disabled              |
| `removed`   | Membership removed from active participation |

A database check constraint restricts status values to these four states.

The migration also creates an index on `(business_id, status)` to support business-scoped membership queries.

Membership removal uses lifecycle state rather than immediately deleting the membership record.

The implementation must continue to enforce business ownership and authorization independently of the database status constraint.

## 4.10 Business Membership Invitations

Phase 2B introduces the `business_membership_invitations` table.

Unlike the earlier `user_invitations` table, the new invitation records are associated directly with a business.

### Invitation Schema

| Column               | Type                    | Description                           |
| -------------------- | ----------------------- | ------------------------------------- |
| `id`                 | UUID                    | Invitation identifier                 |
| `business_id`        | UUID                    | Business receiving the invited member |
| `invited_email`      | `VARCHAR(320)`          | Normalized invited email              |
| `role`               | `VARCHAR(30)`           | Proposed membership role              |
| `token_hash`         | `VARCHAR(64)`           | Unique invitation token hash          |
| `invited_by_user_id` | UUID                    | User who issued the invitation        |
| `expires_at`         | `TIMESTAMPTZ`           | Invitation expiration                 |
| `accepted_at`        | `TIMESTAMPTZ`, nullable | Acceptance timestamp                  |
| `revoked_at`         | `TIMESTAMPTZ`, nullable | Revocation timestamp                  |
| `created_at`         | `TIMESTAMPTZ`           | Creation timestamp                    |

The invitation table references the existing `businesses` and `users` tables.

Both foreign keys use `ON DELETE RESTRICT`.

### Role Constraints

The database permits invitations for:

- `admin`
- `inventory_manager`
- `operator`
- `viewer`

The invitation schema does not permit inviting a new `owner` through this role field.

### Email Constraints

The database requires invited email addresses to be lowercase and trimmed.

Empty email addresses are rejected.

### Invitation Integrity

The schema enforces:

1. Invitation expiration must occur after creation.
2. Acceptance cannot precede creation.
3. Revocation cannot precede creation.
4. An invitation cannot simultaneously be accepted and revoked.
5. Invitation token hashes must be unique.

A partial unique index prevents multiple unresolved invitations for the same normalized email within the same business.

The index applies when both `accepted_at` and `revoked_at` are null.

This uniqueness constraint does not independently exclude expired invitations.

Application logic must account for expiration when issuing replacement invitations.

### Database Indexes

The invitation table includes indexes supporting:

- Business-scoped invitation retrieval.
- Expiration queries.
- Inviting-user relationships.
- Unresolved invitation uniqueness.

The database constraints complement application-level authorization, transaction handling and invitation validation.

They do not replace those requirements.

---

# 5. Database Migration Inventory

Eight TypeORM migrations are documented in the current implementation.

Migrations 1 through 6 established the business workspace, inventory ownership, tenant-scoped SKU identity and initial user invitation infrastructure.

Business Membership Management Phase 1, merged through PR #9, introduced no schema changes.

Phase 2B, merged through PR #11, introduced two additional migrations for membership lifecycle management and business membership invitations.

| Order | Migration                                                      | Purpose                                                                     |
| ----- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1     | `1761070000000-CreateBusinessWorkspace.ts`                     | Creates business, user and membership tables                                |
| 2     | `1761080000000-CreateFoundationalInventoryTables.ts`           | Creates foundational inventory tables                                       |
| 3     | `1792600000000-AddBusinessOwnershipToInventory.ts`             | Adds business ownership to inventory and movements                          |
| 4     | `1792700000000-AddBusinessOwnershipToOpeningBalanceImports.ts` | Adds business ownership and scoped import uniqueness                        |
| 5     | `1792800000000-AddTenantScopedSkuIdentifiers.ts`               | Adds UUID inventory identifiers and removes global SKU uniqueness           |
| 6     | `1792900000000-CreateUserInvitations.ts`                       | Creates the original user invitation persistence table                      |
| 7     | `1793000000000-AddBusinessMembershipLifecycle.ts`              | Adds membership lifecycle status, timestamps and supporting index           |
| 8     | `1793100000000-CreateBusinessMembershipInvitations.ts`         | Creates business membership invitation persistence, constraints and indexes |

Migration availability in source control does not establish successful execution against any particular database.

The protected `fimonaa_commerce` database must not be migrated without explicit authorization and a reviewed deployment procedure.

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

The fifth migration has not been applied to the protected main database as part of the recorded development work.

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

Do not interpret migration availability, successful compilation or isolated integration tests as confirmation of protected-database deployment.

No protected-database migration should be executed without explicit authorization.

## 5.8 Migration 7: Business Membership Lifecycle

Migration `1793000000000-AddBusinessMembershipLifecycle.ts` extends the existing `business_memberships` table.

It introduces:

1. A required `status` column with a default value of `active`.
2. A database constraint restricting membership status to `pending`, `active`, `suspended` or `removed`.
3. A required `updated_at` timestamp with a default value of the current timestamp.
4. A nullable `removed_at` timestamp.
5. An index on `(business_id, status)`.

The migration supports membership suspension, reactivation and soft removal without immediately deleting membership records.

The default `active` status provides compatibility for existing membership rows when the migration is applied.

The migration's `down()` method intentionally throws an error.

Automatic rollback is prohibited because removing lifecycle columns could destroy membership status and removal history.

A reviewed, data-preserving recovery procedure is required before any rollback.

## 5.9 Migration 8: Business Membership Invitations

Migration `1793100000000-CreateBusinessMembershipInvitations.ts` creates the `business_membership_invitations` table.

The migration introduces:

1. A UUID invitation identifier.
2. A business foreign key with restricted deletion.
3. A normalized invited email address.
4. A constrained invitation role.
5. A unique invitation token hash.
6. An inviting-user foreign key with restricted deletion.
7. Invitation creation and expiration timestamps.
8. Nullable acceptance and revocation timestamps.
9. Database constraints protecting invitation integrity.
10. Supporting indexes for business queries, expiration and inviting-user relationships.
11. A partial unique index preventing multiple unresolved invitations for the same email within a business.

The permitted invitation roles are `admin`, `inventory_manager`, `operator` and `viewer`.

The database does not permit the `owner` role in this invitation table.

The partial unique index applies to invitations where both `accepted_at` and `revoked_at` are null.

An expired invitation may therefore continue to occupy the uniqueness constraint until its lifecycle is resolved.

The application must handle this condition when issuing replacement invitations.

The migration's `down()` method intentionally throws an error.

Automatic rollback is prohibited because dropping the invitation table could destroy invitation history.

A reviewed, data-preserving recovery procedure is required before any rollback.

## 5.10 Phase 2B Migration Deployment Status

Migrations 7 and 8 were introduced as part of Business Membership Management Phase 2B, merged through PR #11.

Their presence in the repository does not confirm deployment to the protected `fimonaa_commerce` database.

The documentation milestone does not authorize executing these migrations.

Before any future production deployment, the project must:

1. Verify the target database and environment configuration.
2. Confirm the current migration history.
3. Review schema compatibility with existing data.
4. Verify compiled migration discovery.
5. Test migrations against an approved isolated or restored database.
6. Review backup integrity and recovery procedures.
7. Obtain explicit authorization before modifying protected data.

Migrations 7 and 8 must not be automatically reverted.

Any recovery operation must preserve existing membership and invitation records.

The Excel SKU workbook remains the inventory source of truth until an independently approved cutover.

---

# 6. Database Environments and Safety

## 6.1 Database Inventory

| Database                                    | Purpose                            | Safety Classification      |
| ------------------------------------------- | ---------------------------------- | -------------------------- |
| `fimonaa_commerce`                          | Protected India inventory database | Protected                  |
| `fimonaa_commerce_workspace_test`           | Restored India inventory copy      | Preserve                   |
| `fimonaa_commerce_migration_test`           | Earlier migration testing          | Restricted                 |
| `fimonaa_commerce_import_test`              | Automated integration testing      | Isolated test target       |
| `fimonaa_commerce_populated_migration_test` | Populated migration validation     | Synthetic test environment |

## 6.2 Protected Main Database

Database:

`fimonaa_commerce`

Historical development baseline:

| Metric                  | Historical Value |
| ----------------------- | ---------------: |
| SKUs                    |              318 |
| Available units         |            2,027 |
| Inventory movements     |              318 |
| Opening-balance imports |                1 |

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

Version 1.3 introduced JWT verification and business-context authorization.

Version 1.4 completed the initial login and invitation-based account activation workflow.

Version 1.6 records the additional business membership invitation workflow implemented during Phase 2B.

The authentication module is located at:

```text
apps/api/src/modules/auth/
```

Authentication identifies the user.

Authorization separately checks business membership status and role on protected requests.

Business membership invitation acceptance is a distinct workflow from initial account activation.

## 7.2 Authentication Module

The implementation includes an authentication controller and service, JWT verification and issuance, credential and password services, invitation creation and acceptance services, persistence entities, DTOs, public and role decorators, and global authentication and roles guards.

Phase 2B adds business membership invitation issuance, acceptance, listing, retrieval and revocation.

Unit tests are maintained alongside the corresponding implementation.

The exact file inventory should be verified against the repository before using it as a deployment manifest.

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

The access-token lifetime configured for the recorded development milestone is:

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

The implementation uses:

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

Phase 2B membership status enforcement means suspended and removed memberships must not continue authorizing protected operations in that business.

A user may retain access to another business where they have a separate active membership.

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

Invitation acceptance endpoints have different authentication requirements from authenticated membership administration endpoints.

Their exact guard and decorator behavior must be verified against the controller implementation during the final endpoint security audit.

## 7.10 Authentication Lifecycle Status

The implemented authentication lifecycle supports:

1. Credential-based login.
2. JWT access-token issuance.
3. Initial user invitation creation.
4. Initial account activation through invitation acceptance.
5. Database-backed business membership resolution.
6. Business membership invitation issuance.
7. Business membership invitation acceptance.
8. Business membership invitation listing.
9. Individual business membership invitation retrieval.
10. Business membership invitation revocation.

The original account activation workflow and the new business membership invitation workflow must not be treated as interchangeable.

Remaining authentication and invitation limitations are documented in Section 7.16.

## 7.11 Credential-Based Login

The API exposes:

```http
POST /api/auth/login
```

as a public endpoint.

The login workflow:

1. Validates the email and password.
2. Normalizes the email address.
3. Retrieves the user's password hash.
4. Requires an active user account.
5. Verifies the password using Argon2id.
6. Issues a JWT access token.

Invalid credentials produce a generic unauthorized response.

A dummy password hash is used for missing or ineligible accounts to reduce timing differences.

Successful login returns an access token, the `Bearer` token type and an expiration value of 900 seconds.

## 7.12 Password Security

Passwords are hashed using Argon2id.

| Parameter   | Value     |
| ----------- | --------- |
| Algorithm   | Argon2id  |
| Memory cost | 19456 KiB |
| Time cost   | 2         |
| Parallelism | 1         |

Password hashes are excluded from default user entity selections.

Plaintext passwords must never be stored or logged.

## 7.13 Initial User Invitation Creation

The API exposes:

```http
POST /api/auth/invitations
```

Access requires an authenticated user with the `owner` or `admin` role in the selected business.

The service verifies that the target user:

1. Exists with `invited` status.
2. Has a membership in the authenticated business.
3. Has no existing unexpired, unconsumed invitation.

Invitation creation runs in a database transaction and locks the invited user row.

Tokens are generated from 32 cryptographically secure random bytes and encoded using Base64URL.

Only the SHA256 token hash is stored in the database.

Invitations expire after 24 hours.

The plaintext token is returned in the API response for the current internal workflow.

The response includes:

```http
Cache-Control: no-store
```

Invitation tokens must not be logged or included in monitoring and analytics payloads.

## 7.14 Initial User Invitation Acceptance

The API exposes:

```http
POST /api/auth/accept-invitation
```

as a public endpoint.

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

This workflow activates an existing invited user.

It is not the same as joining an additional business through a Phase 2B membership invitation.

## 7.15 Business Membership Invitations

Phase 2B introduces dedicated endpoints for business membership invitations.

### 7.15.1 Endpoint Inventory

| Method | Endpoint                                                         | Purpose             |
| ------ | ---------------------------------------------------------------- | ------------------- |
| `POST` | `/api/auth/business-membership-invitations`                      | Issue invitation    |
| `POST` | `/api/auth/business-membership-invitations/accept`               | Accept invitation   |
| `GET`  | `/api/auth/business-membership-invitations`                      | List invitations    |
| `GET`  | `/api/auth/business-membership-invitations/:invitationId`        | Retrieve invitation |
| `POST` | `/api/auth/business-membership-invitations/:invitationId/revoke` | Revoke invitation   |

These endpoints are separate from:

```http
POST /api/auth/invitations
POST /api/auth/accept-invitation
```

### 7.15.2 Invitation Issuance

The issuance workflow creates a business-specific invitation.

The invitation identifies:

- The target business.
- The invited email address.
- The proposed role.
- The inviting user.
- The expiration timestamp.
- A hashed invitation token.

The invitation role is restricted to:

```text
admin
inventory_manager
operator
viewer
```

The database does not permit the `owner` role through this invitation mechanism.

Invitation issuance must respect verified business authorization.

The exact controller role decorators and response contract should be confirmed from the implementation before publishing an exhaustive endpoint permission matrix.

### 7.15.3 Token Security

Business membership invitation tokens are represented in persistence through their hashes.

The `token_hash` column is unique.

Plaintext invitation tokens must not be stored in the invitation table.

Invitation tokens must not be written to application logs, analytics payloads or monitoring events.

Secure invitation delivery remains outstanding.

### 7.15.4 Invitation Acceptance

The Phase 2B acceptance endpoint processes a business membership invitation.

The implementation uses transactional acceptance and invitation lifecycle validation.

Acceptance must ensure that the invitation is valid, unexpired and not previously accepted or revoked.

The workflow must prevent unauthorized creation or activation of a membership in another business.

The completed implementation includes membership invitation acceptance.

The exact public-route authentication contract, DTO fields and HTTP response schema should be confirmed against the controller and service source before integration by the frontend.

### 7.15.5 Invitation Listing and Retrieval

The API supports listing invitations and retrieving an individual invitation.

Invitation records are associated with a business.

Business-scoped queries must not disclose invitation records belonging to another business.

Invitation responses must not expose token hashes or other internal security-sensitive fields.

### 7.15.6 Invitation Revocation

The API supports invitation revocation.

The invitation schema records revocation through:

```text
revoked_at
```

A revoked invitation must not subsequently be accepted.

Revocation is a lifecycle operation and must preserve the invitation record rather than silently deleting its history.

### 7.15.7 Expired Invitation Uniqueness

The partial unique index for unresolved invitations applies when:

```sql
accepted_at IS NULL
AND revoked_at IS NULL
```

Expiration alone does not remove an invitation from this index.

The issuance service must therefore account for unresolved expired invitations before attempting to create replacements.

The precise replacement behavior should be verified against the issuance service and its tests.

## 7.16 Current Authentication Limitations

The following capabilities remain outstanding or require further verification:

1. Automated secure invitation email delivery.
2. Refresh-token rotation.
3. Session persistence.
4. Logout and token revocation.
5. Password recovery.
6. Login and public-endpoint rate limiting.
7. Comprehensive authentication audit logging.
8. Production secret rotation and management.
9. Full public-endpoint security audit.
10. Frontend invitation acceptance experience.
11. Production verification of invitation abuse protections.

The original account activation workflow still has its original provisioning limitations.

Phase 2B adds a separate business membership invitation workflow, but does not complete general business onboarding or all account provisioning requirements.

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

Phase 2B introduces role updates for existing memberships.

The role change workflow must continue to respect business-specific authorization.

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

The feature flag and database restriction remain additional safeguards.

## 8.5 Authorization Principles

1. Authenticate the user.
2. Validate the requested business.
3. Resolve active membership.
4. Determine the business-specific role.
5. Evaluate endpoint permissions.
6. Pass only verified business context to application services.
7. Recheck relevant authorization inside sensitive membership mutations.
8. Preserve business predicates in database queries.
9. Prevent suspended or removed memberships from authorizing protected operations.
10. Maintain transactional consistency for membership lifecycle changes.

A valid JWT alone does not authorize access to every business.

## 8.6 Cross-Business Access Protection

Knowing another business's UUID must not allow access to its inventory or membership records.

The authorization layer must reject requests where the authenticated user lacks valid membership.

Cross-business authorization behavior is covered by automated tests.

Phase 2B extends this protection to membership administration and business membership invitations.

## 8.7 Membership Lifecycle Authorization

Membership lifecycle operations use business-scoped authorization.

The recorded Phase 2B implementation includes:

- Owner-only role updates.
- Owner and administrator suspension and reactivation, subject to hierarchy rules.
- Owner-only membership removal.

Role updates permit the target roles:

```text
admin
inventory_manager
operator
viewer
```

The role update endpoint does not implement owner transfer.

Self role changes are not permitted through the recorded role update workflow.

Membership suspension, reactivation and removal must be evaluated against the selected business and relevant membership status.

The exact hierarchy edge cases and last-active-owner safeguards require final source-level verification before production approval.

---

# 8A. Business Membership Management

## 8A.1 Scope and Delivery

Business Membership Management was delivered in two stages.

**Phase 1:** Read-only business membership management, merged through PR #9 (`5de2992`).

**Phase 2B:** Membership lifecycle administration and business membership invitations, merged through PR #11 (`c852d35`).

Phase 1 introduced business-scoped membership listing and individual retrieval.

Phase 2B introduced:

1. Membership role updates.
2. Membership suspension.
3. Membership reactivation.
4. Membership removal.
5. Business membership invitation issuance.
6. Business membership invitation acceptance.
7. Invitation listing and retrieval.
8. Invitation revocation.
9. Membership lifecycle database fields.
10. Dedicated invitation persistence.

The completed milestone provides backend functionality.

A dedicated frontend administration interface remains outstanding.

## 8A.2 Module Architecture

The business membership implementation is located at:

```text
apps/api/src/modules/business-memberships/
```

The Phase 1 module includes:

```text
business-memberships/
├── __tests__/
│   ├── business-memberships.controller.spec.ts
│   └── business-memberships.service.spec.ts
├── types/
│   └── business-membership.types.ts
├── business-memberships.controller.ts
├── business-memberships.module.ts
└── business-memberships.service.ts
```

This represents the documented Phase 1 baseline rather than an exhaustive Phase 2B file listing.

The module is registered in the application and uses TypeORM persistence for business memberships and associated users.

The controller handles HTTP access.

The service handles business-scoped operations and response mapping.

Phase 2B extends the membership service with lifecycle mutations.

Business membership invitation endpoints are exposed through the authentication controller, with supporting services and persistence.

The exact Phase 2B file inventory should be verified against the repository before being used as an implementation manifest.

## 8A.3 Membership API Endpoints

The membership API uses the global `/api` prefix.

Protected membership administration requests require:

```http
Authorization: Bearer <access-token>
X-Business-Id: <business-uuid>
```

The backend must verify the selected business context.

| Method  | Route                                                | Purpose                |
| ------- | ---------------------------------------------------- | ---------------------- |
| `GET`   | `/api/business-memberships`                          | List memberships       |
| `GET`   | `/api/business-memberships/:membershipId`            | Retrieve membership    |
| `PATCH` | `/api/business-memberships/:membershipId/role`       | Update membership role |
| `POST`  | `/api/business-memberships/:membershipId/suspend`    | Suspend membership     |
| `POST`  | `/api/business-memberships/:membershipId/reactivate` | Reactivate membership  |
| `POST`  | `/api/business-memberships/:membershipId/remove`     | Remove membership      |

The `membershipId` path parameter identifies a membership record, not a user ID.

## 8A.4 Membership Authorization Matrix

The recorded implementation establishes the following permissions:

| Operation              | Owner   | Admin                         | Other roles |
| ---------------------- | ------- | ----------------------------- | ----------- |
| List memberships       | Allowed | Allowed                       | Not allowed |
| Retrieve membership    | Allowed | Allowed                       | Not allowed |
| Update membership role | Allowed | Not allowed                   | Not allowed |
| Suspend membership     | Allowed | Allowed, subject to hierarchy | Not allowed |
| Reactivate membership  | Allowed | Allowed, subject to hierarchy | Not allowed |
| Remove membership      | Allowed | Not allowed                   | Not allowed |

All permissions are evaluated within the verified business context.

This matrix describes the recorded membership controller behavior.

The business membership invitation controller requires a separate decorator-level review to confirm its complete permission matrix.

## 8A.5 Response Contract

The Phase 1 membership response exposes selected fields:

```typescript
interface BusinessMember {
  id: string;
  userId: string;
  email: string;
  status: UserStatus;
  role: BusinessRole;
  createdAt: Date;
}
```

`id` is the membership identifier.

`userId` identifies the associated user.

The original response contract includes user status, membership role, email and membership creation time.

It does not return password hashes or full user entity records.

Phase 2B introduces membership lifecycle status as a separate database field.

**Important distinction:** The original `status: UserStatus` response field must not automatically be interpreted as the new membership lifecycle status.

The current response DTO and serialization behavior should be verified before documenting any additional Phase 2B response fields.

## 8A.6 Business Isolation and Query Behavior

The authenticated request context supplies the verified `businessId`.

The Phase 1 listing service filters memberships by that business ID and orders them by `createdAt` ascending, then `id` ascending.

It resolves associated user records and maps them into the response contract.

The original implementation omits membership rows if their associated user cannot be resolved.

This is documented behavior, not an approved data-repair policy.

Individual retrieval applies both the membership ID and verified business ID to the lookup.

A membership belonging to another business must not be returned, even if its UUID is known to the caller.

The service returns not found for a membership outside the authenticated business.

Phase 2B mutation operations must preserve these business-scoping requirements.

## 8A.7 Membership Role Updates

The endpoint:

```http
PATCH /api/business-memberships/:membershipId/role
```

supports role updates for an existing membership.

The recorded implementation restricts this operation to business owners.

Supported target roles are:

```text
admin
inventory_manager
operator
viewer
```

The endpoint does not support transferring ownership.

Self role changes are rejected.

The service uses transactional database operations and row-level locking to coordinate sensitive membership changes.

Role changes must not allow a caller to modify a membership belonging to another business.

## 8A.8 Membership Suspension

The endpoint:

```http
POST /api/business-memberships/:membershipId/suspend
```

supports membership suspension.

The operation is available to owners and administrators, subject to hierarchy rules.

Suspension changes the membership lifecycle state to:

```text
suspended
```

A suspended membership must not continue authorizing protected operations in that business.

Suspension does not imply deletion of the user account.

A user may retain access to another business where they hold a separate active membership.

## 8A.9 Membership Reactivation

The endpoint:

```http
POST /api/business-memberships/:membershipId/reactivate
```

supports reactivation of a suspended membership.

The operation is available to owners and administrators, subject to hierarchy rules.

Successful reactivation restores the membership lifecycle state to:

```text
active
```

Reactivation restores eligibility for business access according to the membership's current role and the application's authentication rules.

It does not grant additional permissions beyond that role.

## 8A.10 Membership Removal

The endpoint:

```http
POST /api/business-memberships/:membershipId/remove
```

supports membership removal.

The recorded implementation restricts removal to business owners.

Removal is represented by:

```text
status = removed
```

and the corresponding removal timestamp.

The membership record is preserved rather than immediately deleted.

A removed membership must not continue authorizing protected operations in that business.

Removal does not automatically delete the associated user account or unrelated memberships in other businesses.

## 8A.11 Transactional Consistency and Concurrency

Phase 2B membership lifecycle operations use TypeORM transactions.

PostgreSQL row-level locking is used for sensitive membership mutations.

The purpose is to coordinate concurrent requests and prevent conflicting membership state changes.

Transactional operations must preserve:

- Membership ownership.
- Business-specific authorization.
- Valid lifecycle transitions.
- Role restrictions.
- Membership history.
- Consistent state after failure.

The exact lock acquisition order, concurrency edge cases and last-active-owner protections require verification against the implementation and tests before production certification.

## 8A.12 Business Membership Invitation Management

Business membership invitation endpoints are exposed through the authentication controller.

| Method | Route                                                            | Purpose             |
| ------ | ---------------------------------------------------------------- | ------------------- |
| `POST` | `/api/auth/business-membership-invitations`                      | Issue invitation    |
| `POST` | `/api/auth/business-membership-invitations/accept`               | Accept invitation   |
| `GET`  | `/api/auth/business-membership-invitations`                      | List invitations    |
| `GET`  | `/api/auth/business-membership-invitations/:invitationId`        | Retrieve invitation |
| `POST` | `/api/auth/business-membership-invitations/:invitationId/revoke` | Revoke invitation   |

The invitation schema is business-specific.

Invitation roles exclude `owner`.

The invitation record contains a hashed token, expiration timestamp, acceptance timestamp and revocation timestamp.

The implementation supports invitation lifecycle management without modifying the original account activation invitation table.

The exact HTTP request and response contracts should be verified against the controller DTOs and services before frontend integration.

## 8A.13 Authorization and Error Behavior

The Phase 1 read-only endpoints established the following behavior:

| Condition                                  | HTTP status |
| ------------------------------------------ | ----------: |
| Missing or invalid bearer token            |       `401` |
| Authenticated user without an allowed role |       `403` |
| Invalid `membershipId` UUID                |       `400` |
| Membership not found in selected business  |       `404` |

Phase 2B adds further validation and lifecycle error conditions.

These include invalid transitions, unauthorized role changes, invitation expiration, invitation revocation and business-scoping failures.

The exact HTTP status for each Phase 2B failure condition must be confirmed from the controller, service and integration tests before publishing a definitive error matrix.

The business-selection header remains untrusted until the authentication layer verifies active membership and business context.

Controller role restrictions are not a substitute for business predicates in service queries.

## 8A.14 Automated Verification

Phase 1 added two unit-test suites with 12 tests and an HTTP integration suite with 13 tests.

The Phase 1 recorded totals were:

- 163 unit tests.
- 96 integration tests.
- 259 total tests.

Phase 2B substantially expanded coverage for membership lifecycle and invitation workflows.

The completed Phase 2B milestone recorded:

- 348 unit tests across 31 suites.
- 376 integration tests across 19 suites.
- 724 total tests across 50 suites.

The recorded verification also included TypeScript compilation, ESLint, NestJS build and two successful GitHub checks.

These results were obtained during the implementation milestone.

They have not been independently rerun as part of the documentation update.

Integration tests must continue to use only the isolated test database.

## 8A.15 Remaining Membership Work

The following work remains outstanding or requires further verification:

1. Business Membership Administration frontend.
2. General business onboarding.
3. Initial owner and membership provisioning.
4. Secure invitation delivery.
5. Comprehensive membership audit logging.
6. Production verification of last-active-owner safeguards.
7. Full endpoint permission matrix review.
8. Complete invitation request and response contract documentation.
9. Production security review of membership mutations.
10. Deployment and migration verification.
11. Operational recovery and support procedures.

Role updates, suspension, reactivation, removal and invitation revocation must no longer be described as entirely unimplemented.

---

# 9. Business-Scoped Inventory API

## 9.1 Overview

Version 1.3 implemented business-scoped inventory retrieval.

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

| Parameter | Rule                               |
| --------- | ---------------------------------- |
| `page`    | Integer greater than or equal to 1 |
| `limit`   | Integer between 1 and 100          |

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

In v1.3, the controller was connected to the opening-balance import service and protected by:

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

The recorded implementation permits import execution only when the database name is:

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

Version 1.3 established isolated PostgreSQL integration testing.

Version 1.4 expanded authentication and invitation coverage.

Version 1.5 added membership controller, service and HTTP isolation tests.

Version 1.6 records the expanded Phase 2B membership lifecycle and invitation verification.

The test suite includes:

- Unit tests.
- PostgreSQL integration tests.
- HTTP authorization tests.
- Cross-business isolation tests.
- Opening-balance import tests.
- Database environment safety tests.
- Membership lifecycle tests.
- Business membership invitation tests.

## 11.2 Unit Tests

**Version 1.6 milestone result: 348 passing unit tests across 31 suites.**

Historical milestones recorded:

| Version | Unit Tests |
| ------- | ---------: |
| v1.3    |         75 |
| v1.4    |        151 |
| v1.5    |        163 |
| v1.6    |        348 |

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
- Business membership controller and service.
- Business membership invitation workflows.
- Membership lifecycle operations.

The exact number of tests attributed to each individual Phase 2B service should be obtained from the repository's test runner rather than inferred from the aggregate totals.

## 11.3 Integration Tests

**Version 1.6 milestone result: 376 passing integration tests across 19 suites.**

Historical milestones recorded:

| Version | Integration Tests |
| ------- | ----------------: |
| v1.3    |                37 |
| v1.4    |                83 |
| v1.5    |                96 |
| v1.6    |               376 |

The integration suite includes tests for:

- Login.
- Initial invitation creation and acceptance.
- Business membership invitation workflows.
- Database connection.
- Test environment configuration.
- Opening-balance import behavior.
- Business-scoped inventory isolation.
- HTTP authentication and authorization.
- Membership retrieval and role restrictions.
- Membership lifecycle mutations.
- Business isolation.
- Validation and failure handling.

## 11.4 HTTP Authorization Tests

The v1.3 HTTP authorization integration suite recorded 23 passing tests.

This is a historical suite-level count.

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

Phase 2B expands the authorization surface to membership mutations and business membership invitations.

## 11.5 Inventory Business-Isolation Tests

The v1.3 inventory business-isolation suite recorded 6 passing tests.

These tests verify that inventory operations respect business ownership.

## 11.6 Opening-Balance Import Tests

The v1.3 opening-balance integration suite recorded 5 passing tests.

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

Unexpected database names, unsupported connection targets and unsafe URL configurations are rejected.

These protections must remain intact as the test suite expands.

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

After an earlier completed integration-test run, the isolated import-test database was verified to contain:

| Record Type             | Remaining Count |
| ----------------------- | --------------: |
| Businesses              |               0 |
| Users                   |               0 |
| Memberships             |               0 |
| Inventory SKUs          |               0 |
| Inventory movements     |               0 |
| Opening-balance imports |               0 |

This is the recorded state from the earlier isolated test run.

It does not independently establish the database state after subsequent runs.

Phase 2B introduces an additional invitation table, so future cleanup verification should also account for business membership invitation records.

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

From `apps/api`, the following application checks are available:

```bash
npx tsc --project tsconfig.test.json --noEmit
```

```bash
npm run build
```

The Phase 2B milestone recorded successful TypeScript compilation, ESLint, NestJS build, 348 unit tests, 376 integration tests and two successful GitHub CI checks.

These are historical implementation verification results.

They have not been rerun during the v1.6 documentation update.

Integration tests must only run after confirming the isolated database target and safety assertions.

## 11.15 Remaining Testing Requirements

Although automated coverage has improved substantially, the following remain outstanding:

- Full restored-inventory migration testing.
- Compiled JavaScript migration execution tests.
- Production authentication lifecycle tests.
- Broader dashboard authorization tests.
- Deployment recovery tests.
- Production security testing of membership administration.
- Verification of all last-active-owner concurrency scenarios.
- Frontend integration and end-to-end tests.
- Additional operational and failure-mode testing.

---

# 12. Database Safety and Recovery

## 12.1 Protected Database Policy

The protected India database must remain unchanged unless an operation is explicitly approved.

No test helper should ever use the protected database.

The Phase 2B milestone does not change this policy.

## 12.2 Migration Rollback Restrictions

| Migration                       | Rollback Behavior                  |
| ------------------------------- | ---------------------------------- |
| Business workspace              | Potentially destructive            |
| Foundational inventory          | Automatic rollback refused         |
| Inventory ownership             | May remove ownership information   |
| Opening-balance ownership       | Conditional and potentially unsafe |
| Tenant-scoped SKU identifiers   | Automatic rollback refused         |
| User invitations                | Automatic rollback refused         |
| Business membership lifecycle   | Automatic rollback refused         |
| Business membership invitations | Automatic rollback refused         |

## 12.3 Migration 5 Through 8 Rollback

Migration 5 intentionally refuses automatic rollback because restoring a global SKU primary key could be unsafe once multiple businesses use identical SKU strings.

Migration 6 refuses automatic rollback because dropping invitation records could destroy activation history.

Migration 7 refuses automatic rollback because removing lifecycle columns could destroy membership status and removal history.

Migration 8 refuses automatic rollback because dropping the invitation table could destroy invitation history.

These migrations require reviewed, data-preserving recovery procedures.

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

Phase 2B also introduces membership and invitation history that must be considered during recovery.

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

This milestone introduced:

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

## 13.6 Business Membership Management Phase 1

Business Membership Management Phase 1 was completed and merged into `main` through pull request #9.

**Feature branch:** `feature/business-membership-management`

**Feature commit:** `4c961d1`

**Main branch merge reference:** `5de2992`

**Status:** Implemented, tested and merged.

The milestone introduced:

1. Read-only business membership listing.
2. Individual membership retrieval.
3. Owner and administrator authorization.
4. Business-scoped membership queries.
5. Sensitive user-field exclusion.
6. Controller and service unit tests.
7. HTTP authentication, authorization and tenant-isolation tests.

No database migrations or schema changes were introduced.

Membership mutations were outside the scope of Phase 1.

They were subsequently addressed in Phase 2B.

## 13.7 Documentation v1.5 Milestone

**Document:** `docs/development-documentation_v1.5.md`

**Documentation pull request:** #10

**Main branch merge reference:** `f757124`

**Status:** Merged.

The milestone preserved the historical documentation and recorded the Phase 1 membership implementation.

Version 1.6 supersedes v1.5 as the current development documentation without modifying the historical document.

## 13.8 Business Membership Management Phase 2B

Business Membership Management Phase 2B was merged into `main` through pull request #11.

**Main branch merge reference:** `c852d35`

**Final feature commit:** `a84c273`

**Status:** Implemented, tested and merged.

The milestone introduced:

1. Membership lifecycle schema.
2. Business membership invitation schema.
3. Identity-only authentication support for invitation workflows.
4. Business membership invitation issuance.
5. Secure invitation acceptance.
6. Invitation listing and retrieval.
7. Invitation revocation.
8. Membership role updates.
9. Membership suspension.
10. Membership reactivation.
11. Membership removal.
12. Transactional membership operations.
13. Expanded unit and integration testing.

### Phase 2B Commit History

| Commit    | Description                                        |
| --------- | -------------------------------------------------- |
| `ab3a64b` | Membership lifecycle foundation                    |
| `d965897` | Identity-only authentication for invitations       |
| `903f30e` | Membership invitation schema and tests             |
| `eaf369f` | Membership invitation issuance                     |
| `ce40301` | Secure invitation acceptance                       |
| `0da47b3` | Invitation management and revocation               |
| `a84c273` | Role updates, suspension, reactivation and removal |

The merged implementation changed 53 files, with 12,732 insertions and 416 deletions relative to the prior main branch baseline.

The milestone recorded 724 passing automated tests.

No production deployment or protected-database migration is established by this merge.

## 13.9 Documentation v1.6 Milestone

**Document:** `docs/development-documentation_v1.6.md`

**Branch:** `docs/development-documentation-v1.6`

**Status:** In progress.

**Implementation baseline:** `c852d35`

The documentation milestone updates:

- Development documentation v1.6.
- Implementation plan.
- Related README or module documentation where required.

Historical documentation and existing ADRs should be preserved.

The documentation milestone must not modify application code or database contents.

## 13.10 Delivery Checklist

Before merging the documentation branch:

1. Complete and review development documentation v1.6.
2. Verify implementation claims against the repository.
3. Remove outdated Phase 1 status statements.
4. Confirm historical documentation remains unchanged.
5. Confirm ADR-001, ADR-002 and ADR-003 remain consistent with the recorded architecture.
6. Review the root README and module overview for outdated status references.
7. Verify no credentials or database backups are staged.
8. Review the Git diff and validate whitespace.
9. Commit and push the documentation branch.
10. Create and review the documentation pull request.
11. Merge after review and verify `main`.

No production deployment or protected-database migration is authorized by this documentation milestone.

---

# 14. Open Issues and Production Blockers

Authentication, invitations, business membership lifecycle administration and business-scoped inventory retrieval are implemented.

Production security and operational readiness remain outstanding.

| Priority | Item                                                 | Status                | Required Outcome                               |
| -------- | ---------------------------------------------------- | --------------------- | ---------------------------------------------- |
| P0       | JWT verification                                     | Implemented           | Production security review                     |
| P0       | Login and token issuance                             | Implemented           | Rate limiting, monitoring and security review  |
| P0       | Initial invitation activation                        | Implemented           | Secure delivery and provisioning workflow      |
| P0       | Business membership invitations                      | Implemented           | Secure delivery and production review          |
| P0       | Invitation revocation                                | Implemented           | Verify operational and security edge cases     |
| P0       | Membership role updates                              | Implemented           | Production security review                     |
| P0       | Membership suspension and reactivation               | Implemented           | Verify hierarchy and concurrency behavior      |
| P0       | Membership removal                                   | Implemented           | Verify safeguards and audit requirements       |
| P0       | Last-active-owner safeguards                         | Verification required | Confirm all mutation and concurrency scenarios |
| P0       | Refresh tokens, logout and session invalidation      | Pending               | Define and implement session lifecycle         |
| P0       | Password recovery                                    | Pending               | Secure recovery and credential reset           |
| P0       | Business membership authorization                    | Implemented           | Broader operational review                     |
| P0       | Role-based authorization                             | Implemented           | Complete endpoint permission matrix            |
| P0       | Business-scoped inventory listing                    | Implemented           | Extend to future inventory operations          |
| P0       | Dashboard tenant isolation                           | Review required       | Verify every dashboard query                   |
| P0       | Opening-balance import authorization                 | Implemented           | Production workflow remains disabled           |
| P0       | Production opening-balance import                    | Disabled              | Approved import architecture                   |
| P0       | Protected India inventory migration                  | Not authorized        | Explicit approval and migration plan           |
| P1       | Automated PostgreSQL integration tests               | Implemented           | Expand failure and migration coverage          |
| P1       | Login and public-endpoint rate limiting              | Pending               | Abuse and brute-force protection               |
| P1       | Secure invitation email delivery                     | Pending               | Secure token transport                         |
| P1       | Membership audit logging                             | Pending               | Durable audit trail                            |
| P1       | Business Membership Administration UI                | Pending               | Frontend membership management                 |
| P1       | Compiled migration execution                         | Pending               | Verify production migration discovery          |
| P1       | Full restored-inventory compatibility                | Pending               | Test against approved restored copy            |
| P1       | Deployment security and secrets management           | Pending               | Harden production configuration                |
| P1       | Recovery procedures                                  | Pending               | Tested backup and restore                      |
| P1       | Endpoint authorization audit                         | Pending               | Review all protected routes                    |
| P1       | Validation endpoint security                         | Review required       | Prevent unauthorized data and path exposure    |
| P2       | Business onboarding                                  | Pending               | Tenant creation and initial ownership          |
| P2       | Inventory ledger and warehouse management            | Pending               | Auditable multi-location inventory             |
| P2       | Stock reservations                                   | Pending               | Reservation and release logic                  |
| P2       | Orders and returns                                   | Pending               | Business-scoped operational workflows          |
| P2       | Shopify and marketplace integration                  | Future milestone      | Approved read-only connectors first            |
| P2       | Inventory reconciliation and source-of-truth cutover | Not started           | Follow ADR-001                                 |

## 14.1 Critical Security Boundary

A signed JWT does not automatically grant access to every business.

A client-supplied business UUID must be verified against an active membership.

Database ownership constraints and application authorization must work together.

Suspended and removed memberships must not authorize protected business operations.

## 14.2 Critical Inventory Boundary

The import service is not authorization to run production imports.

The feature flag remains disabled by default.

The service currently restricts execution to the isolated test database.

## 14.3 Critical Deployment Boundary

Passing automated tests does not authorize production deployment.

Deployment requires additional verification, security review and explicit operational approval.

The presence of eight migration files in source control does not establish that the protected database has been migrated.

---

# 15. Recommended Next Development Sequence

The next engineering phase should build on the completed Phase 2B backend rather than repeat implemented membership functionality.

The six operational workstreams in `docs/IMPLEMENTATION_PLAN.md` remain planning milestones.

Completion of backend membership administration does not mark those workstreams complete.

## Milestone A: Complete v1.6 Documentation Delivery

**Status:** In progress on `docs/development-documentation-v1.6`.

Finalize v1.6 and the implementation plan.

Review related README and module documentation for outdated implementation status.

Preserve historical documentation and existing ADRs.

Review the Git diff for credentials and unrelated changes.

Commit, push and review a documentation pull request.

Do not change any database as part of documentation delivery.

## Milestone B: Business Membership Administration UI, Phase 2C

**Status:** Proposed next engineering milestone.

Build the frontend administration experience using the completed Phase 2B backend.

The planned interface should support:

1. Business member listing.
2. Individual membership details.
3. Role updates for authorized users.
4. Membership suspension.
5. Membership reactivation.
6. Membership removal.
7. Invitation creation.
8. Invitation listing and status display.
9. Invitation revocation.
10. Invitation acceptance experience.

The UI must reflect verified business-specific permissions.

It must not rely solely on client-side role checks for security.

The backend remains the authorization authority.

Sensitive actions should use clear confirmation flows.

The UI should handle loading, empty, error and success states.

The exact API request and response contracts must be verified before implementation.

## Milestone C: Business Onboarding and Provisioning

**Status:** Pending.

Design:

- Business creation.
- Initial owner provisioning.
- User creation where required.
- Initial membership creation.
- Business selection.
- Secure invitation delivery.
- Operational support procedures.

The Phase 2B invitation system should be reused where appropriate.

The original user activation workflow must remain distinct.

Any new schema or authentication behavior requires reviewed implementation and tests.

## Milestone D: Authentication Hardening

**Status:** Pending.

Design:

- Refresh-token rotation.
- Session persistence.
- Logout and revocation.
- Password recovery.
- Rate limiting.
- Audit logging.
- Secret rotation.

Keep credential errors generic.

Keep invitation tokens out of logs.

Review public endpoints for abuse and information disclosure.

## Milestone E: Authorization and Tenant-Isolation Audit

**Status:** Pending.

Document the complete endpoint permission matrix.

Review inventory, dashboard, import, validation, membership and invitation endpoints.

Every business-specific query must use verified membership context.

Test cross-business access, role changes and membership lifecycle transitions.

Verify last-active-owner safeguards under concurrent requests.

## Milestone F: Migration and Deployment Hardening

**Status:** Pending.

Verify compiled JavaScript migration discovery, migration failure handling, backup integrity and restore procedures.

Test against an approved restored inventory copy.

Confirm the database target before any operation capable of writing data.

Never modify the protected `fimonaa_commerce` database without explicit authorization.

## Milestone G: Controlled Opening-Balance Import

**Status:** Pending.

Design validation-only preview, dry run, operator confirmation, business authorization, audit logging, duplicate detection, rollback and reconciliation.

The existing test-database restriction must not be removed casually.

The Excel workbook remains authoritative until approved cutover.

## Milestone H: Inventory Operations

**Status:** Pending.

Implement auditable inventory adjustments, movement ledger, warehouse locations, reservations, releases and reconciliation with transactional consistency and business isolation.

## Milestone I: Orders and Returns

**Status:** Pending.

Implement business-scoped orders, order items, fulfillment, returns, restocking and corresponding inventory movements.

Preserve auditability and transactional consistency.

## Milestone J: Commerce Integrations

**Status:** Pending.

Consider Shopify, Myntra, AJIO/AJIOGRAM and Nykaa Fashion.

Start with controlled read-only integrations.

Live inventory writes require separate approval.

## Milestone K: Inventory Source-of-Truth Cutover

**Status:** Not started.

Follow ADR-001.

Reconcile Excel, Shopify and marketplace stock.

Validate SKU mappings and movement history.

Establish operational ownership and rollback procedures.

Obtain explicit authorization.

No cutover has occurred.

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

For untracked files, `git diff --check` alone does not inspect their contents.

After reviewing files for staging, use the staged diff check to validate newly added documentation.

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

The migration history table name must be confirmed against the actual TypeORM configuration before executing the query.

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

| Version  | Milestone                                                                                     | Status                                                                           |
| -------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| v1.0     | Initial development documentation                                                             | Historical reference                                                             |
| v1.1     | Business workspaces and inventory ownership                                                   | Historical completed milestone                                                   |
| v1.2     | Tenant-scoped SKU identifiers, migration 5 and ADR-002                                        | Merged                                                                           |
| v1.3     | JWT verification, business authorization, inventory API and isolated integration tests        | Implementation merged through PR #6 (`d4e5296`)                                  |
| v1.4     | Login, Argon2id, invitation lifecycle, migration 6 and expanded tests                         | Documentation merged through PR #8 (`537bc9f`); implementation PR #7 (`d1c25be`) |
| v1.5     | Read-only business membership retrieval, owner/admin access and isolation tests               | Implementation PR #9 (`5de2992`); documentation PR #10 (`f757124`)               |
| **v1.6** | **Membership lifecycle, business membership invitations, migrations 7 and 8, expanded tests** | **Implementation PR #11 (`c852d35`); documentation in progress**                 |

## 17.2 Acceptance Basis

The v1.6 milestone records the completed Phase 2B backend implementation.

The accepted development baseline includes:

1. Business membership role updates.
2. Membership suspension.
3. Membership reactivation.
4. Membership removal.
5. Business membership invitation issuance.
6. Invitation acceptance.
7. Invitation listing and retrieval.
8. Invitation revocation.
9. Membership lifecycle migration.
10. Business membership invitation migration.
11. Expanded unit and integration tests.

The milestone recorded successful TypeScript compilation, ESLint, NestJS build and GitHub CI checks.

These results were obtained during implementation, not rerun while preparing this document.

## 17.3 Recorded Verification Totals

| Milestone | Unit Tests | Integration Tests |   Total |
| --------- | ---------: | ----------------: | ------: |
| v1.3      |         75 |                37 |     112 |
| v1.4      |        151 |                83 |     234 |
| v1.5      |        163 |                96 |     259 |
| **v1.6**  |    **348** |           **376** | **724** |

The totals describe their respective recorded milestones.

They do not imply production certification.

## 17.4 Database Safety Acceptance

The development work was designed and tested using an isolated PostgreSQL test database.

No documentation change authorizes a write to the protected India inventory database.

The deployment status of migrations 6, 7 and 8 against the protected database has not been verified as part of this documentation review.

Source control presence must not be interpreted as deployment confirmation.

## 17.5 Current Acceptance State

**Authentication implementation:** Merged into `main` through PR #7 (`d1c25be`).

**Business Membership Management Phase 1:** Merged through PR #9 (`5de2992`).

**Business Membership Management Phase 2B:** Merged through PR #11 (`c852d35`).

**Recorded automated verification:** Passed, 724 tests consisting of 348 unit tests and 376 integration tests.

**Documentation v1.4 and ADR-003:** Merged through PR #8 (`537bc9f`).

**Documentation v1.5:** Merged through PR #10 (`f757124`).

**Documentation v1.6:** In progress on `docs/development-documentation-v1.6`.

**Business membership administration backend:** Implemented.

**Business Membership Administration frontend:** Pending.

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

Documents the implemented JWT and Argon2id decisions, database-backed membership resolution, global guards, invitation security, transactional acceptance and known limitations.

The record describes the implemented design.

It does not approve production deployment.

## 18.1 Future Architecture Decisions

Further ADRs should cover:

1. Session and refresh-token management.
2. Business onboarding and initial owner provisioning.
3. Business membership lifecycle and invitation security.
4. Endpoint permission policy.
5. Production import architecture.
6. Inventory ledger.
7. Warehouses.
8. Marketplace synchronization.
9. Deployment and recovery.

Phase 2B introduced membership lifecycle and invitation functionality, but a dedicated ADR covering its security and concurrency decisions has not been established by the documentation provided.

Existing ADRs should remain unchanged as historical records unless separately reviewed.

---

# 19. Development Checkpoint Summary

Fimonaa Commerce Hub v1.6 records the completed Business Membership Management Phase 2B implementation.

The milestone builds on the existing multi-business inventory, authentication, authorization and initial invitation foundations.

The backend now provides membership listing, individual retrieval, role updates, suspension, reactivation and removal.

The membership administration endpoints are:

```http
GET /api/business-memberships
GET /api/business-memberships/:membershipId
PATCH /api/business-memberships/:membershipId/role
POST /api/business-memberships/:membershipId/suspend
POST /api/business-memberships/:membershipId/reactivate
POST /api/business-memberships/:membershipId/remove
```

Business membership invitation management is provided through:

```http
POST /api/auth/business-membership-invitations
POST /api/auth/business-membership-invitations/accept
GET /api/auth/business-membership-invitations
GET /api/auth/business-membership-invitations/:invitationId
POST /api/auth/business-membership-invitations/:invitationId/revoke
```

The implementation introduces two new migrations:

```text
1793000000000-AddBusinessMembershipLifecycle.ts
1793100000000-CreateBusinessMembershipInvitations.ts
```

These migrations extend membership lifecycle persistence and introduce dedicated business membership invitation records.

Both refuse automatic rollback.

The recorded Phase 2B verification totals are:

**348 passing unit tests and 376 passing integration tests, totaling 724 tests across 50 suites.**

The implementation merged through PR #11 as `c852d35`.

These results are not production certification.

The next immediate delivery task is reviewing and merging documentation v1.6 and its companion implementation-plan updates.

The recommended next engineering milestone is **Phase 2C: Business Membership Administration UI**, followed by business onboarding, authentication hardening, endpoint authorization audits and deployment preparation.

The protected Fimonaa India database must remain unchanged without explicit approval.

The Excel SKU workbook remains authoritative until a controlled and separately approved cutover.

---

**Fimonaa Commerce Hub**
**Development Documentation: Version 1.6**
**22 November 2026**

_End of document._
