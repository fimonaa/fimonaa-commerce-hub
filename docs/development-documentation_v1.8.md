# Fimonaa Commerce Hub

## Development Documentation: Version 1.8

**Status:** Authenticated frontend workspaces, tenant-scoped dashboard and inventory functionality, and guarded development fixtures implemented. Production inventory and multichannel synchronization architecture approved for planning. The application is not yet production ready.

**Updated:** 25 November 2026

**Repository:** `fimonaa/fimonaa-commerce-hub`

**Development branch:** `docs/commerce-hub-architecture-v1.8`

**Latest implementation reference:** `0a1b0ce`

**Latest documentation reference:** `e48a328`

**Latest merged development milestone:** Authenticated frontend and business workspace integration, merged into `main` through PR #13 (`efc1289`).

**Previous completed backend milestone:** Business Membership Management Phase 2B, merged through PR #11 (`c852d35`).

**Delivery state:** The authenticated frontend, business-scoped inventory functionality, guarded development tooling, and development documentation v1.7 have been merged into `main`. Documentation v1.8 records the revised product strategy and proposed architecture. Its new capabilities are not yet implemented.

**Previous documentation:** `docs/development-documentation_v1.7.md`

**Next recommended milestone:** Production Inventory and Order Management Foundation, beginning with an existing-codebase gap analysis.

**Product direction:** Build Commerce Hub into a production-ready, multitenant inventory and order management platform for small and growing retail businesses. Fimonaa India will be the first production implementation, followed by Fimonaa Finland and eventual commercial SaaS adoption.

**Inventory strategy:** Commerce Hub will become the authoritative inventory system after a controlled migration from the Excel SKU master sheet. Orders may originate from Commerce Hub, Shopify, Myntra, or future connected channels. Commerce Hub will process those orders centrally and synchronize updated inventory availability across connected channels.

**Approved architectural priorities:** Auditable inventory movements, order reservations, multiple inventory locations, fixed channel-specific inventory allocations, configurable safety stock buffers, reliable order ingestion, synchronization monitoring, retries, and reconciliation.

**Integration priorities:** Shopify integration first, followed by Myntra subject to integration feasibility and partner access. Other marketplace integrations will follow a reusable connector architecture.

**Future capabilities:** Native invoice generation, shared inventory allocation strategies, industry-specific product attributes, and commercial SaaS capabilities.

**Deferred milestone:** Advanced product and variant image management.

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

**Historical planning note (v1.6):** This section preserves the development sequence proposed during the v1.6 milestone. Subsequent implementation and documentation milestones have superseded parts of this plan. The authenticated frontend implementation was merged into `main` through PR #13 (`efc1289`). For the current development status, approved architectural direction and next engineering priorities, refer to Sections 20 and 22 through 25. The immediate next engineering activity is an existing-codebase gap analysis for the Production Inventory and Order Management Foundation.

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

# 20. Development Checkpoint: 25 November 2026

## 20.1 Overview

This section records the development completed after the Business Membership Management Phase 2B milestone documented in version 1.6.

The implementation was developed on the `feature/business-membership-frontend` branch.

The latest recorded implementation commit for this milestone is `0a1b0ce`.

The milestone introduces an authenticated frontend experience, business workspace selection, tenant-scoped dashboard and inventory integration, and guarded local development tooling.

The frontend implementation and associated development tooling were subsequently merged into `main` through pull request #13, with merge commit `efc1289`.

The changes were implemented and tested in the development environment. Their successful merge establishes the approved development baseline but does not constitute production deployment, operational acceptance or inventory source-of-truth cutover.

## 20.2 Frontend Technology

The frontend uses:

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router 7

The application communicates with the NestJS backend through a typed API client.

The frontend architecture separates authentication and session management from business-specific navigation and inventory functionality.

## 20.3 Implemented Frontend Functionality

The following functionality has been implemented:

1. Typed authenticated API client.
2. Authentication context and session management.
3. Login page.
4. Business workspace selection.
5. Authenticated application navigation.
6. Business-scoped dashboard integration.
7. Business-scoped inventory listing.
8. Inventory searching and filtering.
9. Inventory pagination.
10. Inventory loading, empty and error states.
11. Navigation between authorized business workspaces.

Business context must be established through authenticated membership information rather than trusting an arbitrary business identifier supplied by the frontend.

Frontend authorization and navigation controls do not replace backend authorization.

## 20.4 Backend Development

The backend uses NestJS 11, TypeORM and PostgreSQL.

The current development milestone includes business-scoped dashboard and inventory APIs.

The backend remains responsible for:

- Authentication.
- Business membership validation.
- Role-based authorization.
- Tenant isolation.
- Inventory query filtering.
- Pagination and response validation.
- Preventing unauthorized access to another business's records.

Manual tenant-isolation checks passed in the development environment.

A comprehensive authorization and security audit remains necessary before production deployment.

## 20.5 Development Database Architecture

Three PostgreSQL databases have distinct responsibilities.

| Database                       | Responsibility                                  |
| ------------------------------ | ----------------------------------------------- |
| `fimonaa_commerce`             | Protected historical Fimonaa inventory database |
| `fimonaa_commerce_dev`         | Approved local development database             |
| `fimonaa_commerce_import_test` | Isolated integration-test database              |

The Excel SKU workbook remains the authoritative inventory source until an explicitly approved cutover.

No protected database writes are authorized by this documentation.

## 20.6 Guarded Development Launcher

Local development uses the Git-ignored configuration file:

`apps/api/.env.development.local`

The guarded launcher is:

`node apps/api/scripts/run-local-dev.cjs <command>`

Supported commands include:

- `api`
- `migration:show`
- `migration:run`
- `seed:dev-auth`
- `seed:dev-inventory`

The launcher validates the development database configuration and rejects unauthorized database targets.

It also prevents inherited database environment variables from silently overriding the approved local configuration.

Migrations and seeds remain database-writing operations and require review before execution.

The existing `apps/api/.env` file must not be overwritten or assumed safe for local development.

## 20.7 Synthetic Development Fixtures

The development environment contains synthetic users, business memberships and inventory records for testing application behavior.

Recorded fixture accounts include:

- `multi@commerce-demo.test`
- `owner@commerce-demo.test`
- `employee@commerce-demo.test`
- `nomembership@commerce-demo.test`

The inventory fixture contains 45 synthetic records across two businesses.

Business A contains 35 records.

Business B contains 10 records.

The fixtures include:

- Overlapping SKU identifiers across businesses.
- In-stock products.
- Low-stock products.
- Out-of-stock products.

These records support development testing of tenant isolation, inventory filtering and dashboard calculations.

Synthetic fixtures must not be interpreted as actual Fimonaa inventory.

## 20.8 Recorded Verification

The latest recorded development checkpoint includes:

| Verification                          | Recorded result |
| ------------------------------------- | --------------- |
| Backend tests                         | 379 passing     |
| Backend test suites                   | 36              |
| Development launcher script tests     | 17 passing      |
| API TypeScript compilation            | Passed          |
| Manual business workspace checks      | Passed          |
| Manual tenant-isolation checks        | Passed          |
| Inventory search and filtering checks | Passed          |
| Inventory pagination checks           | Passed          |

These results relate to the current development milestone.

The historical Phase 2B verification results remain separately documented in version 1.6:

- 348 passing unit tests.
- 376 passing integration tests.
- 724 tests across 50 suites.

The historical totals must not be added to the newer checkpoint results or presented as a single test run.

Neither checkpoint establishes production certification.

## 20.9 Implementation Commit History

The current development branch includes the following recorded commits:

| Commit    | Description                                            |
| --------- | ------------------------------------------------------ |
| `f947850` | Typed authenticated API client                         |
| `de3b73b` | Authentication context and session management          |
| `5a12075` | Authentication login page                              |
| `9ddd5dd` | Business workspace selection                           |
| `79a2c5e` | Authenticated workspaces and modular navigation        |
| `f1c3c6e` | Tenant-scoped dashboards and local development tooling |
| `959cc69` | Inventory empty states and pagination improvements     |
| `0a1b0ce` | Safe development inventory fixtures and seed           |

The branch contains development work beyond the backend membership milestone merged through PR #11.

## 20.10 Remaining Frontend Work

The authenticated frontend foundation is implemented, but the broader application remains incomplete.

Outstanding work includes:

- Business membership administration screens.
- Business onboarding and provisioning workflows.
- Product and variant catalogue management.
- Product and variant image management.
- Stock movement workflows.
- Inventory adjustment and reconciliation interfaces.
- Order and return management.
- Marketplace integration interfaces.
- Production security and deployment hardening.

These items must not be represented as implemented functionality.

## 20.11 Next Development Priority

At the time of the v1.7 checkpoint, the recommended next milestone was the Product and Variant Image Management Foundation. This recommendation was subsequently superseded by the production inventory and order management priorities documented in Sections 22 through 25.

The intended scope includes:

1. Business-scoped product and variant image associations.
2. Multiple images per product and variant.
3. Primary image selection and ordering.
4. Secure manual uploads.
5. Image metadata and source attribution.
6. Private object storage.
7. Backend authorization and validation.
8. Frontend previews and image management.
9. Automated security and tenant-isolation tests.
10. Future read-only Shopify image retrieval.

The image architecture has not yet been implemented.

Object storage selection, image lifecycle rules and the final data model require design review before implementation.

## 20.12 Current Delivery Boundaries

The following restrictions remain in force:

- Do not modify the protected `fimonaa_commerce` database without explicit authorization.
- Do not replace the Excel SKU workbook as the authoritative inventory source.
- Do not enable Shopify or marketplace inventory writes.
- Do not introduce production credentials into development documentation.
- Do not treat synthetic inventory as actual stock.
- Do not deploy the current implementation to production without security and operational review.
- The development branch was subsequently merged into `main` through PR #13 (efc1289). This merge does not authorize production deployment or inventory modifications.

The next section will document the proposed image management architecture and implementation sequence.

---

# 21. Proposed Product and Variant Image Management Architecture

## 21.1 Objective and Implementation Status

At the time this architecture was proposed, image management was the recommended next development milestone. It has since been deferred in favour of the Production Inventory and Order Management Foundation. The following requirements remain a proposal for future implementation.

The system should support manual image uploads initially and authorized, read-only Shopify image retrieval in a subsequent phase.

**Implementation status:** Proposed. The architecture, database schema, storage provider and API contracts require review before implementation.

The design must preserve the existing authentication, authorization, tenant-isolation and database-safety boundaries.

## 21.2 Functional Requirements

The image management system should support:

1. Multiple images associated with a product.
2. Images associated with specific product variants.
3. Primary image selection.
4. Custom image display ordering.
5. Manual image uploads.
6. Image previews and thumbnails.
7. Image metadata and source attribution.
8. Secure image retrieval.
9. Authorized image replacement and deletion.
10. Future read-only Shopify image retrieval.
11. Duplicate detection and import reconciliation.
12. Business-level isolation.

Product-level images and variant-level images must have clearly defined relationships.

For example, a product may contain multiple colour variants, each with its own photographs.

The final design must establish how product-level images and variant-specific images are displayed together.

## 21.3 Proposed Data Model

A dedicated image entity is recommended rather than storing image URLs directly in product or variant records.

The proposed logical structure is:

```text
Business
   |
   +-- Product
         |
         +-- Product Images
         |
         +-- Variant
               |
               +-- Variant Images
```

The final entity design should consider the following fields:

| Field              | Purpose                                 |
| ------------------ | --------------------------------------- |
| `id`               | Internal image identifier               |
| `businessId`       | Business ownership and tenant isolation |
| `productId`        | Associated product                      |
| `variantId`        | Optional variant association            |
| `storageKey`       | Private object storage reference        |
| `source`           | Manual upload or external channel       |
| `externalImageId`  | Optional external image identifier      |
| `originalFilename` | Original uploaded filename              |
| `contentType`      | Validated media type                    |
| `fileSize`         | Uploaded file size                      |
| `width`            | Image width                             |
| `height`           | Image height                            |
| `altText`          | Accessible image description            |
| `position`         | Display ordering                        |
| `isPrimary`        | Primary image designation               |
| `createdAt`        | Creation timestamp                      |
| `updatedAt`        | Last modification timestamp             |

This table is a proposed logical model, not an approved migration specification.

Before implementation, review existing catalogue entities, relationships, naming conventions and database constraints.

The final design must prevent an image from being associated with a product or variant belonging to another business.

Primary image uniqueness and ordering rules should be enforced consistently.

## 21.4 Image Storage Architecture

Image binaries should be stored separately from relational metadata.

The recommended approach is private object storage, with PostgreSQL retaining image associations and metadata.

The storage provider has not yet been selected.

Candidate solutions should be evaluated against:

- Security and private access.
- Development and production environment separation.
- Cost and expected storage volume.
- Upload and retrieval performance.
- Image transformation requirements.
- Backup and recovery capabilities.
- Operational complexity.
- Portability and vendor dependency.

Production storage credentials must not be introduced before the architecture has been approved.

## 21.5 Upload Security

Manual uploads must be authenticated and authorized.

The backend should validate:

- Business membership.
- Required role permissions.
- Product and variant ownership.
- Supported image formats.
- Actual file content, not only the filename extension.
- Maximum file size.
- Image dimensions where required.
- Storage destination and object ownership.

Uploaded filenames must not be trusted as storage paths.

The implementation should use generated storage identifiers and prevent path traversal or unauthorized object access.

Publicly accessible image URLs should not be assumed appropriate for private catalogue assets.

## 21.6 Proposed Backend API Responsibilities

The API should provide controlled operations for:

1. Listing images associated with a product.
2. Listing images associated with a variant.
3. Uploading an image.
4. Retrieving image metadata.
5. Accessing image content securely.
6. Selecting a primary image.
7. Updating display order.
8. Updating supported metadata.
9. Deleting or replacing an image.

The final routes, request schemas and response contracts must be defined after inspecting the existing API conventions.

Every operation must enforce business-scoped authorization.

An authenticated user must not be able to access or modify another business's images by changing identifiers in a request.

## 21.7 Frontend Image Management

The frontend should integrate image management into the selected business workspace.

The proposed user experience includes:

- Product image gallery.
- Variant-specific image gallery.
- Image upload control.
- Primary image selection.
- Image ordering controls.
- Image preview.
- Upload progress feedback.
- Validation messages.
- Loading and empty states.
- Error recovery.
- Accessible controls and image descriptions.

The interface should remain clean, responsive and consistent with the existing application design.

Image management actions must be limited according to the user's authorized business role.

Frontend permission checks are supplementary. The backend remains the authorization authority.

## 21.8 Image Lifecycle and Consistency

The implementation must define how database records and stored objects remain consistent.

Potential failure scenarios include:

- Upload succeeds but database persistence fails.
- Database persistence succeeds but storage upload fails.
- Image deletion succeeds in one system but fails in the other.
- A product or variant is removed while images remain.
- An external image is changed or removed.
- Multiple requests attempt to update the primary image simultaneously.

The final design should establish:

1. Upload completion rules.
2. Temporary object cleanup.
3. Safe deletion behavior.
4. Retry and recovery mechanisms.
5. Orphaned object detection.
6. Transaction boundaries.
7. Audit requirements.
8. Backup and restoration procedures.

The database and object storage cannot be assumed to participate in one atomic transaction.

## 21.9 Future Shopify Image Retrieval

Shopify image retrieval is a subsequent integration milestone.

The intended workflow is read-only.

The integration should:

1. Authenticate through an approved Shopify application.
2. Retrieve product information.
3. Retrieve variant information.
4. Retrieve associated image metadata.
5. Map external identifiers to internal records.
6. Preserve source attribution.
7. Prevent duplicate image associations.
8. Detect external image changes.
9. Reconcile deleted or replaced external images.
10. Record synchronization errors for investigation.

The implementation must distinguish between referencing Shopify-hosted images and copying image binaries into internal storage.

That decision requires review of access permissions, lifecycle management, storage costs and applicable API behavior.

No Shopify inventory writes are authorized.

## 21.10 Tenant Isolation Requirements

Image management must follow the existing multitenant security model.

Required protections include:

- Business ownership validation.
- Membership-based authorization.
- Role-based mutation permissions.
- Business-scoped database queries.
- Secure storage access.
- Prevention of cross-business image associations.
- Prevention of unauthorized primary-image changes.
- Prevention of unauthorized deletion.
- Validation of external channel mappings.

Security tests must attempt cross-business access using valid identifiers belonging to another tenant.

## 21.11 Testing Strategy

Testing should cover:

**Unit tests**

- Image metadata validation.
- Primary image selection.
- Display ordering.
- Duplicate detection.
- File validation.
- Authorization rules.

**Integration tests**

- Business-scoped image operations.
- Product and variant ownership.
- Database constraints.
- Upload and deletion consistency.
- Cross-business access rejection.
- Error handling and recovery.

**Frontend tests**

- Image previews.
- Upload interactions.
- Loading and error states.
- Primary image selection.
- Ordering controls.
- Role-dependent UI behavior.

Tests requiring database writes must use the isolated integration-test database.

No tests may modify the protected Fimonaa inventory database.

## 21.12 Proposed Implementation Sequence

The recommended development sequence is:

**Phase 1: Architecture review**

- Inspect existing product and variant entities.
- Confirm image ownership rules.
- Select the storage approach.
- Define authorization requirements.
- Review migration safety.

**Phase 2: Backend foundation**

- Implement approved database migrations.
- Add image metadata persistence.
- Introduce storage abstraction.
- Implement secure upload and retrieval.
- Add authorization and validation tests.

**Phase 3: Frontend integration**

- Display product and variant images.
- Implement manual uploads.
- Add primary image and ordering controls.
- Handle loading, validation and errors.
- Verify workspace isolation.

**Phase 4: Shopify read-only integration**

- Review Shopify API permissions and data contracts.
- Implement product and variant image retrieval.
- Map external identifiers.
- Add deduplication and reconciliation.
- Test repeated imports and failure recovery.

Each phase requires verification before proceeding to the next.

## 21.13 Open Architectural Decisions

The following decisions remain unresolved:

1. Object storage provider.
2. Exact database entity relationships.
3. Product-level versus variant-level gallery behavior.
4. Primary image uniqueness rules.
5. Image size and format restrictions.
6. Thumbnail generation and transformation strategy.
7. Upload transport and temporary storage.
8. Image deletion and retention policy.
9. Shopify image referencing versus internal copying.
10. Required audit history and recovery mechanisms.

These decisions must not be presented as finalized architecture.

## 21.14 Delivery and Security Boundaries

The image management milestone does not authorize:

- Protected database migrations.
- Production deployment.
- Shopify inventory modifications.
- Marketplace inventory synchronization.
- Inventory source-of-truth cutover.
- Production credential changes.
- Unreviewed destructive image deletion.

All implementation work should continue on a dedicated development branch with appropriate tests, documentation and review.

The product and variant image management architecture documented in Section 21 remains a future capability. Its implementation has been deferred following the revised product priorities approved on 25 November 2026.

The next engineering milestone is the Production Inventory and Order Management Foundation, beginning with a codebase gap analysis covering products, variants, SKUs, inventory movements, reservations, inventory locations, orders and existing database relationships.

Sections 22 through 25 document the revised product strategy, proposed inventory architecture, multichannel synchronization requirements and production implementation roadmap.

These sections describe approved architectural direction and planned functionality. They must not be interpreted as completed implementation or authorization for production database modifications, inventory migration or external marketplace synchronization.

---

# 22. Revised Product Vision and Production Priorities

## 22.1 Purpose and Decision Status

This section records the revised product strategy agreed on 25 November 2026.

Fimonaa Commerce Hub will evolve from its current authenticated, multitenant inventory management foundation into a production-ready, centralized inventory and order management platform for small and growing retail businesses.

The initial implementation will focus on Fimonaa India. Fimonaa Finland will follow after the Indian implementation has demonstrated sufficient operational reliability.

The long-term objective is to commercialize Commerce Hub as a multitenant software-as-a-service platform.

**Decision status:** Product direction approved. Detailed implementation design, operational acceptance criteria and production deployment remain subject to engineering review.

**Implementation status:** The capabilities described in this section are strategic requirements and planned functionality unless explicitly identified as already implemented elsewhere in this documentation.

## 22.2 Product Vision

Commerce Hub should provide businesses with one reliable place to manage inventory, orders, sales channels and operational stock availability.

The proposed product positioning is:

**One inventory. Every sales channel. Complete control.**

The platform should prioritize operational accuracy, simplicity, transparency and reliability over unnecessary feature complexity.

Its primary purpose is to solve practical problems experienced by businesses selling through multiple online marketplaces, physical stores and direct sales channels.

Commerce Hub should help businesses understand:

1. How much inventory they physically own.
2. How much inventory is committed to existing orders.
3. How much inventory is available for sale.
4. How available inventory is distributed across sales channels.
5. Why inventory quantities have changed.
6. Whether connected marketplaces have received the latest inventory updates.
7. Which orders or synchronization failures require attention.
8. Whether marketplace inventory differs from the authoritative Commerce Hub inventory.

## 22.3 Initial Production Customer: Fimonaa India

Fimonaa India will serve as the first production implementation and operational validation environment.

The immediate business objective is to replace the existing Excel SKU master sheet with Commerce Hub as the authoritative inventory management system.

The transition must be controlled and reversible until the business formally accepts the new system.

The initial production scope should support:

- Product, variant and SKU management.
- Barcode and marketplace identifier associations.
- Inventory balances by location.
- Auditable stock movements.
- Stock reservations and releases.
- Manual order creation and management.
- Offline sales.
- Order cancellation and return workflows.
- Channel-specific inventory allocation.
- Configurable safety stock buffers.
- Inventory search, filtering and reporting.
- Controlled Excel import and reconciliation.
- Business-specific roles and authorization.
- Operational monitoring, backups and recovery.

Not every capability needs to be delivered simultaneously. However, the system must satisfy the agreed production acceptance criteria before replacing the workbook.

## 22.4 Inventory Source-of-Truth Strategy

Commerce Hub is the intended authoritative inventory system.

The Excel SKU master sheet remains authoritative until an explicitly approved production cutover.

After cutover, Commerce Hub will maintain the central inventory record, including physical stock, reservations, stock movements, available quantities and channel allocations.

Connected sales channels may maintain their own inventory representations, but Commerce Hub will determine the authoritative quantities intended for publication.

Inventory changes may originate from:

- Manual stock adjustments.
- Stock receipts.
- Offline sales.
- Orders entered directly into Commerce Hub.
- Shopify orders.
- Future marketplace orders.
- Returns and cancellations.
- Inventory transfers between locations.
- Other explicitly supported business operations.

Every accepted inventory-changing event must be recorded centrally and processed according to defined inventory rules.

External marketplace synchronization must not directly bypass the authoritative inventory ledger.

## 22.5 Multichannel Order Strategy

Orders may originate from Commerce Hub or any connected sales channel.

An order received through Shopify must be imported into Commerce Hub, associated with the correct business, channel, product variants and inventory location, and processed through the central order and inventory workflow.

The resulting available inventory must then be synchronized with other connected sales channels according to their configured allocations and buffers.

The same principle will apply to Myntra and future marketplace integrations, subject to available APIs, permissions and integration mechanisms.

The system must prevent duplicate processing of the same external order and maintain traceability between external order identifiers and internal order records.

External order ingestion, inventory processing and outbound synchronization must be designed as separate responsibilities.

This separation is necessary for reliability, retry handling, monitoring and future connector expansion.

## 22.6 Channel-Specific Inventory Allocation

Commerce Hub must allow authorized business owners and inventory managers to control how much available inventory is offered through each connected sales channel.

For example, if a product variant has four available units, the business may allocate:

| Channel | Allocated quantity |
| ------- | -----------------: |
| Shopify |                  1 |
| Myntra  |                  3 |
| Total   |                  4 |

This is a fixed allocation strategy.

Allocations represent quantities intended to be offered through a channel. They are not equivalent to physical inventory balances or order reservations.

The system must clearly display:

- Total physical stock.
- Reserved stock.
- Available stock.
- Safety stock.
- Channel allocations.
- Unallocated stock.
- Last confirmed channel quantities.
- Pending synchronization changes.
- Failed synchronization operations.

Allocations must not exceed the quantity safely available for distribution.

When reallocating inventory between channels, the system must account for pending reductions and external synchronization delays before treating released quantities as safely available elsewhere.

**Initial strategy:** Fixed channel allocation.

**Future strategy:** Shared inventory pools with configurable availability distribution and risk controls.

## 22.7 Configurable Safety Stock Buffers

Commerce Hub must support configurable safety stock buffers to reduce overselling risks.

A safety buffer represents inventory deliberately withheld from publication to one or more sales channels.

For example:

| Inventory information | Quantity |
| --------------------- | -------: |
| Available stock       |       10 |
| Safety buffer         |        2 |
| Allocatable stock     |        8 |
| Shopify allocation    |        5 |
| Myntra allocation     |        3 |

The initial implementation should establish clear rules for business-level defaults and SKU-level overrides.

More advanced policies, including channel-specific buffers, may be introduced as required.

Safety stock must remain distinguishable from physical stock, reserved stock and allocated stock.

The platform must not silently alter actual inventory balances when applying buffers.

## 22.8 Multiple Inventory Locations

Commerce Hub must support multiple inventory locations at the architectural and data-model levels from the beginning.

Fimonaa India may initially operate with one primary inventory location.

The underlying system must nevertheless support future warehouses, retail stores and other stockholding locations.

Inventory quantities, reservations and movements must be attributable to the appropriate location.

The architecture should support future:

- Location-specific inventory balances.
- Inventory transfers between locations.
- Location-based fulfilment.
- Channel-to-location mappings.
- Shopify inventory location mappings.
- Business-specific warehouse and store configuration.

A complete warehouse management system is not required for the first production release.

## 22.9 Initial Invoice Strategy

Shopify will remain responsible for the invoicing workflows currently handled through Shopify.

Native Commerce Hub invoice generation is deferred.

However, Commerce Hub's order architecture should retain the information required to support future invoice generation, including:

- Customer and business information.
- Billing and shipping addresses.
- Order items and quantities.
- Unit prices and discounts.
- Taxes and currency.
- Payment and fulfilment status.
- Refunds and credit adjustments.
- Relevant external order and invoice references.

Invoice generation must remain separate from inventory reservation, deduction and fulfilment logic.

Marketplace-originated orders must not automatically be assumed to require Shopify invoice creation.

Future native invoicing will require business-specific numbering, regional tax rules, document generation and appropriate accounting controls.

## 22.10 Fimonaa Finland as the Second Operational Customer

Following successful validation with Fimonaa India, Commerce Hub should support Fimonaa Finland as a separate business tenant.

This implementation will test the platform's ability to support:

- Independent business inventories.
- Separate Shopify stores.
- Different currencies.
- Regional tax requirements.
- Business-specific inventory locations.
- Different product catalogues.
- Independent channel configurations.
- Separate business memberships and permissions.

Cross-business data isolation must remain a fundamental security requirement.

The Finland implementation must not depend on hardcoded Fimonaa India assumptions.

## 22.11 Commercial SaaS Vision

The long-term goal is to offer Commerce Hub to other small and growing retail businesses.

The platform should not be restricted to fashion.

Potential customer segments include:

- Fashion and apparel.
- Jewellery.
- Home décor.
- Accessories.
- Beauty and personal care.
- Gifts and lifestyle products.
- Other businesses managing physical inventory across multiple sales channels.

The core inventory and order management engine should remain industry-independent.

Industry-specific requirements should be supported through extensible product attributes, configurations and specialized workflows where justified.

The initial implementation should avoid building unnecessary industry-specific functionality before it is validated through real business requirements.

## 22.12 Product Differentiation

Commerce Hub should differentiate itself through practical operational capabilities rather than attempting to immediately match the complete feature sets of established enterprise platforms.

Potential differentiators include:

**Inventory allocation control:** Businesses can explicitly decide how much stock to offer through each marketplace.

**Configurable overselling protection:** Safety buffers and synchronization-aware allocation rules help manage inventory exposure.

**Inventory transparency:** Every stock change is traceable to a transaction, order, adjustment or other recorded event.

**Synchronization visibility:** Businesses can distinguish intended marketplace quantities from confirmed marketplace quantities.

**Operational exception detection:** The system can identify discrepancies, failed updates, delayed synchronization and overselling risks.

**Simple user experience:** Small businesses should be able to perform daily operations without extensive technical training.

**Flexible retail model:** A common inventory foundation can support multiple retail industries without requiring separate applications.

These differentiators are product goals, not claims of currently implemented functionality.

## 22.13 Production Readiness Principles

Production readiness must be assessed through demonstrated operational behavior, not merely successful application builds.

The production program must address:

1. Authentication and authorization.
2. Tenant isolation.
3. Inventory transaction integrity.
4. Order processing correctness.
5. Concurrency and duplicate-event protection.
6. Audit history.
7. Data import and reconciliation.
8. Database backup and restoration.
9. Error monitoring and alerting.
10. Reliable deployment and rollback procedures.
11. Staff usability and operational workflows.
12. Security of external integration credentials.
13. Recovery from failed synchronization.
14. Controlled inventory source-of-truth cutover.

The first production release should prioritize a smaller set of dependable workflows over a broad collection of incomplete features.

## 22.14 Revised Priority Order

The revised implementation priorities are:

| Priority | Workstream                           | Objective                                                      |
| -------- | ------------------------------------ | -------------------------------------------------------------- |
| P0       | Existing-codebase gap analysis       | Establish implemented capabilities and missing requirements    |
| P0       | Product, variant and SKU foundation  | Support reliable business-scoped product identities            |
| P0       | Inventory locations                  | Establish location-aware inventory architecture                |
| P0       | Inventory ledger and stock movements | Record and explain inventory changes                           |
| P0       | Reservations and order lifecycle     | Process orders without inconsistent stock deductions           |
| P0       | Fixed channel allocations            | Control stock offered through each sales channel               |
| P0       | Safety stock buffers                 | Reduce exposure to synchronization-related overselling         |
| P0       | Excel migration and reconciliation   | Prepare controlled inventory source-of-truth replacement       |
| P0       | Production operational readiness     | Establish security, backup, monitoring and recovery controls   |
| P1       | Shopify integration                  | Import orders and synchronize inventory                        |
| P1       | Synchronization reliability          | Implement retries, reconciliation and operational visibility   |
| P2       | Myntra integration                   | Investigate and implement supported partner integration        |
| P2       | Fimonaa Finland onboarding           | Validate a second operational business tenant                  |
| P3       | Native invoice generation            | Introduce internal invoicing when operationally justified      |
| P3       | Multi-industry capabilities          | Expand validated retail-specific functionality                 |
| Later    | Advanced image management            | Implement product and variant image workflows when prioritized |

These priorities describe business importance rather than a rigid implementation sequence.

Security, testing, data integrity and operational readiness are continuous requirements.

## 22.15 Acceptance and Delivery Boundaries

Approval of this product direction does not authorize:

- Production database migrations.
- Changes to protected inventory data.
- Importing the live Excel workbook into production.
- Declaring Commerce Hub the inventory source of truth.
- Modifying Shopify inventory.
- Enabling live marketplace synchronization.
- Creating production orders through external integrations.
- Deploying unreviewed application changes.
- Changing production credentials.

The protected `fimonaa_commerce` database must remain unchanged without explicit authorization.

The Excel SKU master sheet remains authoritative until an approved, validated cutover.

The next engineering action is an existing-codebase gap analysis, followed by a detailed implementation plan for the Production Inventory and Order Management Foundation.

Sections 23 through 25 will define the proposed technical architecture, synchronization behavior and staged production roadmap.

---

# 23. Central Inventory, Locations and Channel Allocation Architecture

## 23.1 Purpose and Implementation Status

This section defines the proposed inventory architecture for Fimonaa Commerce Hub.

The objective is to establish a reliable, auditable and location-aware inventory system capable of supporting multiple sales channels without compromising stock accuracy.

**Architecture status:** Approved direction, subject to detailed engineering validation.

**Implementation status:** Proposed. The existing codebase must be inspected before determining which components can be reused, extended or replaced.

The architecture must support Fimonaa India's immediate operational requirements while remaining suitable for future multitenant SaaS customers.

## 23.2 Core Architectural Principles

The inventory system must follow these principles:

1. Commerce Hub becomes the authoritative inventory system only after an explicitly approved cutover.
2. Physical stock must be distinguished from reservations, safety buffers and channel allocations.
3. Every accepted stock-changing operation must have an auditable business reason.
4. Inventory operations must be scoped to a business and inventory location.
5. Stock quantities must remain consistent under concurrent operations.
6. External marketplace synchronization must not directly modify physical stock.
7. Inventory changes must be processed through controlled application services.
8. Duplicate events must not cause duplicate stock deductions.
9. Failed external synchronization must be visible and recoverable.
10. Inventory history must remain traceable even when products or channels change.

## 23.3 Proposed Inventory Domain Model

The proposed domain includes the following logical components.

| Component                | Responsibility                                                    |
| ------------------------ | ----------------------------------------------------------------- |
| Business                 | Owns inventory, products, channels and configuration              |
| Product                  | Represents a sellable product family                              |
| Product Variant          | Represents a specific sellable variation                          |
| SKU                      | Provides the internal stock-keeping identifier                    |
| Inventory Location       | Identifies a warehouse, store or other stockholding location      |
| Inventory Balance        | Represents the current stock position for a variant at a location |
| Inventory Movement       | Records a stock-changing transaction                              |
| Inventory Reservation    | Records stock committed to an order or other approved purpose     |
| Sales Channel            | Represents Shopify, Myntra, physical store or another source      |
| Channel Allocation       | Represents stock assigned for sale through a channel              |
| Safety Stock Policy      | Defines quantities withheld from channel availability             |
| Channel Inventory State  | Tracks intended, pending and externally confirmed quantities      |
| Inventory Reconciliation | Records detected differences and their resolution                 |
| Inventory Audit Event    | Records relevant administrative and operational actions           |

These are logical responsibilities, not finalized database table names.

Existing entities and migrations must be inspected before the persistence design is finalized.

## 23.4 Business and Tenant Isolation

Every inventory record must belong to an explicitly identified business.

Inventory queries and mutations must use verified business context rather than trusting client-provided business identifiers.

An authenticated user must have appropriate membership and permissions before accessing or modifying inventory.

A SKU belonging to Fimonaa India must not be accessible through the Fimonaa Finland business workspace unless a future explicitly authorized cross-business workflow supports it.

Database relationships, application services and API authorization must consistently enforce tenant isolation.

Cross-business inventory transfers are outside the initial scope.

## 23.5 Product, Variant and SKU Identity

The product and variant model must support reliable mapping between Commerce Hub and external sales channels.

Each sellable variant should have a stable internal identifier.

A variant may also have:

- An internal SKU.
- Barcode or EAN identifiers.
- Shopify product and variant identifiers.
- Myntra SKU or style identifiers.
- Other marketplace-specific identifiers.

External identifiers must be associated with the correct business and integration account.

Marketplace mappings must not rely solely on product names, display labels or mutable descriptions.

SKU uniqueness rules must be defined after reviewing the existing database model and migration requirements.

Historical order and inventory records must remain valid when product titles or display attributes change.

## 23.6 Inventory Locations

Inventory must be represented at the location level.

The proposed logical identity of an inventory balance is:

**Business + Product Variant + Inventory Location**

Fimonaa India will initially use a default location.

The architecture must support additional locations without requiring a fundamental inventory model redesign.

Location configuration should include:

- Business ownership.
- Stable location identifier.
- Display name.
- Active or inactive status.
- Optional external location mappings.
- Operational metadata required for future fulfilment workflows.

Location-specific stock must not be silently combined when an order requires fulfilment from a particular location.

Future location transfers must use auditable, balanced movement workflows.

## 23.7 Inventory Quantity Definitions

The following quantities must remain conceptually distinct.

### Physical stock

The quantity physically held at a location, adjusted through accepted receipts, sales, returns, transfers and stock corrections.

### Reserved stock

The quantity committed to orders or other approved reservations but not yet deducted from physical stock.

### Available stock

The quantity not currently reserved.

For the initial model:

`Available Stock = Physical Stock - Active Reserved Stock`

This equation assumes the selected order lifecycle deducts physical stock when fulfilment or another explicitly defined stock-consumption event occurs.

If the implementation adopts a different deduction point, the reservation and balance rules must be adjusted consistently to avoid double deductions.

### Safety stock

The quantity withheld from channel allocation according to an applicable safety stock policy.

### Allocatable stock

The quantity available for distribution across sales channels after applying the effective safety buffer.

`Allocatable Stock = max(0, Available Stock - Effective Safety Buffer)`

### Allocated stock

The quantity assigned to a specific channel under the fixed allocation strategy.

### Unallocated stock

The allocatable quantity not assigned to any channel.

`Unallocated Stock = Allocatable Stock - Sum of Active Channel Allocations`

### Confirmed external quantity

The last inventory quantity positively confirmed or observed on an external sales channel.

This may differ from the intended quantity while synchronization is pending or failing.

## 23.8 Inventory Invariants

The initial inventory implementation must enforce the following invariants.

1. Physical stock cannot become negative through normal inventory operations.
2. Active reservations cannot exceed physical stock.
3. Available stock cannot be negative.
4. Safety buffers cannot create additional physical inventory.
5. Total active channel allocations cannot exceed allocatable stock.
6. Unallocated stock cannot be negative.
7. A unit cannot be simultaneously allocated to multiple fixed-allocation channels.
8. Every inventory-changing transaction must have a traceable movement or reservation record.
9. Reprocessing the same accepted external event must not repeat its inventory effect.
10. All inventory changes must preserve business and location boundaries.

Any exceptional workflow permitting negative inventory must require a separate explicit product decision and controlled authorization.

The initial implementation should not permit negative stock.

## 23.9 Transaction-Based Inventory Ledger

Commerce Hub should maintain an append-only inventory movement ledger.

Movements should record:

- Business.
- Product variant.
- Inventory location.
- Movement type.
- Quantity change.
- Related order or business operation.
- Source channel where applicable.
- Actor or integration identity.
- Timestamp.
- Idempotency or correlation reference.
- Reason or explanatory metadata.

Potential movement types include:

- Opening balance.
- Stock receipt.
- Sale or fulfilment.
- Return to sellable stock.
- Damaged or unsellable stock adjustment.
- Manual correction.
- Transfer out.
- Transfer in.
- Reconciliation adjustment.

Historical movements must not be silently overwritten.

Corrections should be represented through compensating movements with appropriate authorization and audit records.

The ledger should provide a reconstructable explanation of stock changes.

## 23.10 Inventory Balance and Ledger Consistency

The implementation may maintain current inventory balances for efficient queries.

These balances must remain consistent with the authoritative movement and reservation records.

A stock-changing operation must update the relevant records within an appropriate database transaction.

The implementation must define how balances are rebuilt or verified from historical transactions.

Reconciliation routines should detect discrepancies between ledger-derived balances and stored balances.

A detected discrepancy must not automatically trigger an unreviewed stock correction.

## 23.11 Inventory Reservations

Reservations represent inventory committed to an order before the selected stock-consumption event.

A reservation should identify:

- Business.
- Order or reservation purpose.
- Product variant.
- Inventory location.
- Reserved quantity.
- Reservation status.
- Creation and release timestamps.
- Relevant correlation identifiers.

The lifecycle should support:

1. Reservation creation.
2. Reservation confirmation or continued holding.
3. Reservation consumption during fulfilment.
4. Reservation release after cancellation or expiration.
5. Controlled correction or recovery from processing failures.

Reservations must be idempotent and concurrency-safe.

A cancelled order must not release stock that has already been consumed without following the appropriate return or reversal workflow.

## 23.12 Concurrency and Overselling Protection

Inventory operations must remain correct when multiple orders arrive simultaneously.

The implementation should use database transactions and appropriate locking or conditional updates to prevent competing operations from reserving the same stock.

The exact approach must be selected after inspecting the existing PostgreSQL and TypeORM persistence design.

Required behaviors include:

- Atomic reservation checks.
- No duplicate deductions.
- Predictable conflict handling.
- Safe retries.
- Consistent inventory balances.
- Explicit failure responses when stock is insufficient.

Application-level quantity checks alone are insufficient if they are not protected against concurrent updates.

## 23.13 Fixed Channel Allocation Strategy

Fixed allocation will be the initial supported inventory distribution strategy.

An authorized user may assign allocatable stock to connected sales channels.

Example:

| Inventory position      | Quantity |
| ----------------------- | -------: |
| Physical stock          |        6 |
| Reserved stock          |        1 |
| Available stock         |        5 |
| Effective safety buffer |        1 |
| Allocatable stock       |        4 |
| Shopify allocation      |        1 |
| Myntra allocation       |        3 |
| Unallocated stock       |        0 |

The allocation sum must remain within the allocatable quantity.

The allocation model must distinguish between:

- Desired allocation.
- Allocation changes pending external confirmation.
- Last confirmed external availability.
- Allocation changes that failed to synchronize.

Channel allocations must be tied to the appropriate business, variant and inventory location or explicitly defined location aggregation policy.

## 23.14 Allocation Consumption After an Order

When an order is accepted from a channel, Commerce Hub must process its inventory effect and update the relevant channel allocation.

For example, if Myntra has an allocation of three units and an accepted Myntra order consumes one unit, the intended Myntra availability should decrease accordingly.

The inventory reservation or deduction must occur through the central inventory workflow.

The implementation must avoid reducing the same stock twice when the order is later fulfilled or when duplicate marketplace events arrive.

The resulting availability for connected channels must be recalculated according to the allocation policy.

The exact order status at which stock is reserved or consumed must be documented per integration.

## 23.15 Safe Channel Reallocation

Reallocation between channels introduces synchronization risk.

Example:

- Shopify currently advertises three units.
- The business wants to reduce Shopify to one unit.
- Two units are intended to move to Myntra.

Commerce Hub must not immediately assume that the two units are safely available on Myntra.

Until Shopify's reduction is confirmed or otherwise reliably reconciled, those units must remain unavailable for reassignment.

The proposed workflow is:

1. Record the requested allocation change.
2. Calculate the quantity that must be withdrawn from the source channel.
3. Publish the source-channel reduction.
4. Await reliable confirmation or reconciliation.
5. Release the safely withdrawn quantity for reassignment.
6. Publish the destination-channel increase.
7. Track the final synchronization outcome.

If source-channel reduction fails, the destination increase must not proceed for the affected quantity.

If external confirmation cannot be obtained, the system must retain a conservative availability position and surface an operational exception.

This is a required safety property of the fixed allocation strategy.

## 23.16 Allocation Behavior During Synchronization Failures

Commerce Hub must distinguish between internal allocation decisions and externally confirmed marketplace quantities.

A failed update must not be represented as successfully synchronized.

The platform should expose states such as:

- Pending.
- In progress.
- Confirmed.
- Failed.
- Reconciliation required.
- Temporarily blocked.

When an external marketplace may still be advertising units that Commerce Hub intends to withdraw, those units must remain accounted for as potential exposure.

Retries must not cause duplicated inventory changes.

Operational staff must be able to identify affected products, channels and quantities.

## 23.17 Safety Stock Policy Model

The initial safety stock implementation should support:

- Business-level default safety stock.
- Product variant or SKU-level overrides.
- Clear inheritance and override behavior.

The policy evaluation must be deterministic.

For example, a SKU-specific policy may override the business default.

A missing override should fall back to the applicable default.

Future channel-specific policies must define whether buffers are additive, substitutive or applied at a different level.

The same physical units must not be counted as multiple independent safety buffers unless the policy explicitly requires that behavior.

Safety stock configuration changes must be audited.

## 23.18 Inventory Reconciliation

Reconciliation must compare relevant inventory representations and identify inconsistencies.

Potential reconciliation checks include:

- Physical balance versus movement ledger.
- Reserved quantity versus active reservation records.
- Channel allocation versus allocatable stock.
- Intended channel quantity versus externally confirmed quantity.
- External order history versus imported orders.
- Inventory location mappings.
- Duplicate or missing external identifiers.

Reconciliation results should include:

- Business and location.
- Product variant.
- Affected channel.
- Expected quantity.
- Observed quantity.
- Difference.
- Detection time.
- Severity.
- Resolution status.

Automatic correction must be restricted to explicitly approved, deterministic cases.

Other discrepancies should require investigation and authorized resolution.

## 23.19 Inventory Audit and Authorization

Inventory changes must be attributable to an authorized actor or trusted integration identity.

Permissions should distinguish between:

- Viewing inventory.
- Receiving stock.
- Creating manual adjustments.
- Managing reservations.
- Changing channel allocations.
- Configuring safety buffers.
- Resolving reconciliation discrepancies.
- Managing inventory locations.

Sensitive operations should require appropriate business roles.

The existing membership and authorization architecture should be reused where suitable.

Every administrative adjustment should record its reason and relevant before-and-after values.

## 23.20 Operational User Experience

The inventory interface should present understandable quantities rather than exposing internal implementation complexity.

For each variant, authorized users should be able to understand:

- Where stock is physically located.
- How much stock is reserved.
- How much stock is available.
- How much stock is withheld as safety stock.
- How much stock is allocated to each channel.
- Whether channel quantities are synchronized.
- Whether inventory discrepancies require attention.

A future allocation interface should support clear validation and warnings before changes are submitted.

The interface must not imply that an external update succeeded until confirmation has been received.

## 23.21 API and Service Boundaries

The proposed backend should separate responsibilities into coherent application services.

Potential responsibilities include:

- Product and variant identity management.
- Inventory location management.
- Stock movement processing.
- Reservation management.
- Inventory availability calculation.
- Channel allocation management.
- Safety stock policy evaluation.
- Reconciliation.
- Audit and authorization.

API operations should express business actions rather than permitting arbitrary client-side modification of calculated balances.

For example, an authorized stock adjustment should invoke a validated adjustment operation rather than directly replacing a stored physical quantity.

The final API structure must be based on an inspection of the existing NestJS modules and domain boundaries.

## 23.22 Database Design and Migration Safety

The proposed architecture will require a detailed review of existing entities, migrations, constraints and indexes.

Potential persistence requirements include:

- Business-scoped foreign keys.
- Variant and location uniqueness constraints.
- Nonnegative quantity constraints.
- Transaction and idempotency identifiers.
- Inventory movement records.
- Reservation lifecycle records.
- Channel allocation records.
- Safety stock policies.
- Channel inventory synchronization state.
- Reconciliation records.

No new database schema should be considered finalized before the codebase gap analysis.

All schema development and tests must use approved isolated development environments.

The protected `fimonaa_commerce` database must not be modified without explicit authorization.

## 23.23 Required Engineering Tests

The inventory foundation must be validated with automated tests covering:

1. Tenant isolation.
2. Location isolation.
3. Stock receipt and adjustment.
4. Reservation creation and release.
5. Fulfilment and stock consumption.
6. Cancellation behavior.
7. Return handling.
8. Duplicate-event idempotency.
9. Concurrent reservation attempts.
10. Insufficient-stock rejection.
11. Allocation limit enforcement.
12. Safety stock calculations.
13. Safe reallocation with pending source-channel reductions.
14. Synchronization failure handling.
15. Ledger and balance reconciliation.
16. Authorization boundaries.
17. Transaction rollback behavior.
18. Historical movement traceability.

Integration tests must use isolated databases.

Tests must not depend on or modify protected production inventory.

## 23.24 Acceptance Criteria

The inventory architecture can be considered ready for production implementation when:

- Existing persistence and application boundaries have been reviewed.
- Inventory quantity definitions are unambiguous.
- Reservation and stock-consumption rules are finalized.
- Location ownership and tenant isolation are enforced.
- Allocation and safety buffer calculations are deterministic.
- Concurrency and idempotency strategies are documented.
- Database migration requirements are reviewed.
- External synchronization exposure is represented explicitly.
- Reconciliation and audit requirements are defined.
- Automated test scenarios are agreed upon.

This architectural checkpoint does not itself authorize production deployment or inventory source-of-truth cutover.

## 23.25 Next Architectural Section

Section 24 will define the proposed multichannel order processing and synchronization architecture.

It will cover order ingestion, lifecycle mapping, connector responsibilities, reliable event processing, outbound inventory updates, retries, reconciliation and failure recovery.

Section 25 will define the staged implementation roadmap, Excel migration strategy, production acceptance gates and future SaaS evolution.

---

# 24. Multichannel Order Processing and Synchronization Architecture

## 24.1 Purpose and Implementation Status

This section defines the proposed architecture for processing orders originating from multiple sales channels and synchronizing inventory through Fimonaa Commerce Hub.

The objective is to establish Commerce Hub as the central authority for inventory decisions while allowing customers to continue purchasing through their preferred sales channels.

The architecture must support:

- Orders originating from Shopify.
- Orders originating from Myntra, subject to integration feasibility.
- Orders entered directly into Commerce Hub.
- Offline and physical store sales.
- Future marketplace and ecommerce integrations.

**Architecture status:** Approved product direction, subject to technical validation.

**Implementation status:** Proposed. No production marketplace synchronization or inventory source-of-truth cutover is authorized.

The existing NestJS backend, PostgreSQL database, TypeORM persistence model and worker application should be assessed for reuse before implementation begins.

## 24.2 Centralized Order Processing Principle

Commerce Hub must maintain a centralized representation of orders affecting its authoritative inventory.

An external order should not independently modify inventory across multiple connected marketplaces.

Instead, the intended workflow is:

1. A customer places an order through a connected sales channel.
2. The sales channel records the order.
3. Commerce Hub receives or retrieves the order.
4. Commerce Hub validates and identifies the order.
5. The order is mapped to the appropriate business, product variant and inventory location.
6. Commerce Hub processes the required inventory reservation or deduction.
7. The authoritative inventory position is updated.
8. Channel-specific availability is recalculated.
9. Updated inventory quantities are sent to the relevant connected sales channels.
10. Synchronization results are recorded and monitored.

This workflow represents the target architecture.

Actual processing behavior will depend on the external platform's integration capabilities, order lifecycle and inventory update mechanisms.

## 24.3 Proposed High-Level Data Flow

The intended architecture is:

```text
                       CUSTOMER ORDERS
                              |
             +----------------+----------------+
             |                |                |
          Shopify           Myntra         Offline Store
             |                |                |
             +----------------+----------------+
                              |
                     CHANNEL CONNECTORS
                              |
                  ORDER INGESTION LAYER
                              |
                  VALIDATION AND MAPPING
                              |
                  CENTRAL ORDER MANAGEMENT
                              |
                  INVENTORY TRANSACTION
                              |
               +--------------+--------------+
               |                             |
         ORDER RECORD                 INVENTORY LEDGER
               |                             |
               +--------------+--------------+
                              |
                  AVAILABILITY CALCULATION
                              |
                   CHANNEL ALLOCATION RULES
                              |
                     SYNC EVENT OUTBOX
                              |
                       BACKGROUND WORKER
                              |
                  CHANNEL INVENTORY UPDATES
                              |
               +--------------+--------------+
               |                             |
            Shopify                        Myntra
               |                             |
               +--------------+--------------+
                              |
                 CONFIRMATION AND MONITORING
```

The diagram is conceptual and does not represent completed implementation.

## 24.4 Sales Channel Connector Architecture

Each external platform should be integrated through a dedicated connector implementing common application-level responsibilities.

A connector should support the capabilities available from its platform, potentially including:

- Authentication and credential management.
- External product and variant mapping.
- Order retrieval.
- Webhook event processing.
- Inventory quantity updates.
- Order status retrieval.
- Cancellation and return events.
- Synchronization confirmation.
- Error classification.
- Rate-limit handling.
- Reconciliation.

Not every marketplace will support every capability.

The system must explicitly represent unsupported operations rather than assuming equivalent functionality across all platforms.

Connector implementations should remain separate from the central inventory calculation and reservation logic.

## 24.5 Shopify Integration Strategy

Shopify will be the first external ecommerce integration targeted for production implementation.

The proposed Shopify integration should investigate and implement supported mechanisms for:

1. Authenticating the relevant Shopify store.
2. Mapping Shopify products and variants to Commerce Hub variants.
3. Mapping Shopify inventory locations to Commerce Hub locations.
4. Receiving relevant order events.
5. Retrieving complete order details when required.
6. Processing order cancellations and refunds.
7. Publishing intended inventory quantities.
8. Confirming or reconciling externally visible inventory.
9. Handling webhook retries and duplicate events.
10. Monitoring integration health.

Shopify webhooks are the anticipated primary mechanism for receiving order changes.

Periodic reconciliation or polling may be necessary to recover missed events.

The exact Shopify APIs, scopes, webhook subscriptions and inventory update semantics must be verified during implementation.

No live Shopify inventory modification is authorized by this document.

## 24.6 Myntra Integration Strategy

Myntra integration is a planned capability, not a confirmed technical integration.

Before implementation, the engineering team must establish:

- Which seller or partner APIs are available.
- Whether order retrieval is supported.
- Whether inventory updates are supported.
- Whether webhooks or polling are available.
- What authentication and authorization mechanisms apply.
- Which rate limits and operational restrictions exist.
- Whether the seller account has the required permissions.
- How product and SKU identifiers are mapped.
- How order cancellations, returns and fulfilment statuses are represented.

If direct APIs are unavailable, a separately evaluated import or export workflow may provide limited functionality.

Such a workflow must not be described as real-time synchronization.

The system must not promise capabilities that the marketplace does not expose.

## 24.7 Offline and Manual Order Processing

Commerce Hub must support orders created directly by authorized business users.

Examples include:

- Physical store purchases.
- Telephone or messaging orders.
- Direct customer orders.
- Other manually recorded sales.

Manual order creation must use the same inventory integrity rules as external order ingestion.

The system must validate:

- Business context.
- Product variant.
- Inventory location.
- Requested quantity.
- Stock availability.
- Applicable order status.
- User authorization.

Offline orders must not bypass reservations, ledger recording or concurrency protection.

The order should retain its origin as an offline or manually created transaction.

## 24.8 Internal Order Domain Model

The proposed order domain should include the following logical components.

| Component                   | Responsibility                                                |
| --------------------------- | ------------------------------------------------------------- |
| Order                       | Represents the central order record                           |
| Order Line                  | Represents a purchased variant and quantity                   |
| Order Source                | Identifies the originating sales channel                      |
| External Order Reference    | Associates internal and external order identities             |
| Order Status History        | Records lifecycle changes                                     |
| Order Inventory Reservation | Associates order lines with reserved inventory                |
| Order Fulfilment            | Records fulfilment activity                                   |
| Order Cancellation          | Records cancellation events and their effects                 |
| Order Return                | Records returned quantities and inspection outcomes           |
| Order Refund Reference      | Associates relevant payment or marketplace refund information |
| Order Audit Event           | Records administrative and integration activity               |

These are proposed logical responsibilities.

Existing database entities and APIs must be inspected before determining the final persistence model.

## 24.9 External Order Identity and Idempotency

Every external order must be uniquely identifiable within its business and integration context.

The system should retain:

- Business identifier.
- Integration account.
- Sales channel.
- External order identifier.
- External order line identifier where available.
- Internal order identifier.
- External event identifier where available.
- Event type.
- Relevant external version or timestamp.
- Processing status.

The same external order or event may be delivered multiple times.

Duplicate delivery must not create duplicate orders, reservations or stock deductions.

Idempotency must be enforced through durable database constraints and transactional processing rather than relying solely on in-memory checks.

An event with the same external identifier but materially different content must be evaluated according to explicit update and conflict rules.

## 24.10 Order Lifecycle and Inventory Effects

Commerce Hub must define an internal order lifecycle independent of individual marketplace status names.

A proposed lifecycle includes:

1. Received.
2. Validated.
3. Accepted.
4. Reserved.
5. Partially fulfilled.
6. Fulfilled.
7. Cancelled.
8. Partially returned.
9. Returned.
10. Closed.

Additional exception states may be required.

The exact state model must be finalized during the engineering design phase.

Each external marketplace status must be mapped to an internal lifecycle meaning.

The inventory effect of each transition must be explicitly defined.

For example:

| Order event                          | Proposed inventory effect                     |
| ------------------------------------ | --------------------------------------------- |
| New accepted order                   | Reserve eligible inventory                    |
| Duplicate order notification         | No additional inventory effect                |
| Order quantity reduction             | Release eligible unconsumed reservation       |
| Order cancellation before fulfilment | Release active reservation                    |
| Fulfilment                           | Consume reservation and deduct physical stock |
| Partial fulfilment                   | Consume and deduct only fulfilled quantity    |
| Return received                      | Record returned quantity pending inspection   |
| Return accepted as sellable          | Restore sellable physical stock               |
| Return rejected as damaged           | Record unsellable stock separately            |
| Refund without physical return       | No automatic physical stock increase          |

The final rules must accommodate each channel's actual order lifecycle.

## 24.11 Reservation Versus Physical Stock Deduction

The system must not confuse order acceptance with physical stock leaving the business.

Under the proposed model:

- An accepted order reserves inventory.
- Reserved inventory is excluded from available stock.
- Fulfilment consumes the reservation and reduces physical stock.
- Cancellation before fulfilment releases the reservation.
- A completed return may restore sellable stock after inspection.

This approach prevents double deduction when an order progresses through multiple statuses.

However, the final reservation and deduction points must be validated against Shopify, Myntra and offline operational workflows.

For channels that report orders only after physical dispatch, the system may require a controlled equivalent transition.

Any deviation must preserve the same inventory invariants.

## 24.12 Orders Exceeding Available Inventory

An external marketplace may accept an order that Commerce Hub cannot fully reserve.

This can occur because of synchronization delays, unexpected marketplace activity or inventory discrepancies.

Commerce Hub must not silently create negative inventory.

Instead, it should:

1. Record the external order and its source.
2. Identify the affected order lines.
3. Detect the inventory shortfall.
4. Place the affected processing workflow into an explicit exception state.
5. Preserve the external order reference.
6. Notify or surface the issue to authorized staff.
7. Avoid publishing unsupported inventory quantities.
8. Require an approved resolution workflow.

Potential resolutions may include stock correction, alternative fulfilment location, cancellation or other channel-supported action.

The platform must not automatically cancel marketplace orders without an approved policy and supported integration capability.

## 24.13 Partial Orders and Multi-Line Transactions

Orders may contain multiple variants, quantities and fulfilment locations.

The implementation must define whether inventory reservation is atomic for the complete order or can be partially accepted.

The initial default should favor predictable, transactionally consistent behavior.

A failed reservation for one line must not leave other lines in an undocumented intermediate state.

Partial fulfilment and partial cancellation must preserve accurate quantities at the order-line level.

The system must maintain traceability between each order line and its inventory effect.

## 24.14 Out-of-Order Events and Event Versioning

External events may arrive late or in an unexpected sequence.

For example, a fulfilment notification may arrive before a delayed order update.

The ingestion layer must not assume events arrive in chronological order.

The implementation should use available external timestamps, versions and current-state retrieval to determine whether an event is new, stale or requires reconciliation.

A stale event must not reverse a newer valid order state.

When event ordering cannot be established reliably, the system should retrieve authoritative external state or create a reconciliation exception.

## 24.15 Transactional Outbox Pattern

Inventory changes and outbound synchronization requests must remain consistent.

The proposed architecture should use a transactional outbox.

Within a single database transaction, Commerce Hub should:

1. Apply the accepted order transition.
2. Update the relevant reservation and inventory records.
3. Record required inventory movements.
4. Recalculate or record affected availability.
5. Persist an outbox event describing required synchronization work.

A background worker can then process committed outbox events.

This prevents a successful database transaction from being lost merely because an external API request failed immediately afterward.

The outbox does not guarantee exactly-once external delivery.

Consumers and connectors must remain idempotent.

## 24.16 Background Worker Responsibilities

The existing worker application should be evaluated as the foundation for asynchronous processing.

Proposed responsibilities include:

- Processing pending outbox events.
- Scheduling inventory synchronization.
- Retrying recoverable failures.
- Respecting platform rate limits.
- Recording synchronization attempts.
- Updating confirmation status.
- Detecting stalled operations.
- Triggering reconciliation.
- Managing dead-letter or manual-review workflows.

The worker must not bypass central inventory authorization and consistency rules.

Worker operations must be isolated by business and integration account.

## 24.17 Outbound Inventory Synchronization

After an inventory-changing event, Commerce Hub must calculate the intended availability for affected channels.

Under fixed allocations, each channel should receive only its safely allocated quantity.

The system must not publish total physical stock to every channel.

The synchronization workflow should:

1. Determine affected variants and locations.
2. Apply active reservations and safety buffers.
3. Evaluate fixed channel allocations.
4. Account for pending withdrawals and external exposure.
5. Calculate intended channel quantities.
6. Persist synchronization requests.
7. Send updates through the appropriate connector.
8. Record outcomes.
9. Confirm or reconcile external quantities.

The calculation must be deterministic and testable.

## 24.18 Synchronization State Model

Commerce Hub must distinguish between intended inventory and externally confirmed inventory.

A proposed synchronization record should include:

- Business.
- Integration account.
- Sales channel.
- Product variant.
- Inventory location mapping.
- Intended quantity.
- Last confirmed or observed quantity.
- Pending quantity.
- Synchronization status.
- Last attempt timestamp.
- Last successful confirmation timestamp.
- Retry count.
- Error classification.
- Correlation identifier.

Suggested statuses include:

- Pending.
- Processing.
- Confirmed.
- Failed.
- Reconciliation required.
- Blocked.

An API request returning success must not automatically be treated as proof that the marketplace is displaying the intended quantity unless the platform's response semantics justify that conclusion.

## 24.19 Retry and Failure Handling

External integrations will experience transient and permanent failures.

Examples include:

- Network timeouts.
- Rate limiting.
- Expired credentials.
- Permission changes.
- Invalid external product mappings.
- Temporarily unavailable APIs.
- Rejected inventory quantities.
- Marketplace-side processing delays.

The system should classify failures and apply appropriate handling.

Recoverable failures may be retried using bounded exponential backoff.

Permanent failures should be surfaced for authorized intervention.

Retries must not repeat central inventory deductions.

Retry operations must use stable idempotency and correlation identifiers where supported.

## 24.20 Synchronization Ordering and Stale Updates

Multiple inventory changes may occur before an earlier synchronization request completes.

For example:

1. Commerce Hub intends to publish five units.
2. A new order reduces intended availability to four.
3. Another order reduces intended availability to three.

The system must prevent a delayed update for five units from overwriting a newer intended quantity of three.

Possible implementation strategies include:

- Per-channel and per-variant serialization.
- Monotonically increasing internal inventory versions.
- Superseding obsolete pending updates.
- Recalculating current intended quantity before transmission.
- Reconciling after uncertain external outcomes.

The final strategy must reflect each connector's API behavior.

## 24.21 Safe Cross-Channel Reallocation

Inventory reassignment between marketplaces must account for external synchronization delays.

A reduction on the source channel must be reliably confirmed before the withdrawn units are published as additional availability on another channel.

Example:

| Stage                          |      Shopify |       Myntra |
| ------------------------------ | -----------: | -----------: |
| Initial confirmed availability |            3 |            1 |
| Requested allocation           |            1 |            3 |
| Shopify reduction pending      | 3 externally | 1 externally |
| Shopify reduction confirmed    | 1 externally | 1 externally |
| Myntra increase permitted      | 1 externally |      Up to 3 |
| Final confirmed availability   |            1 |            3 |

If Shopify's reduction cannot be confirmed, the two units must remain protected from reassignment.

The same principle applies when reallocating from Myntra to Shopify.

## 24.22 Webhook Security

Webhook endpoints must validate incoming requests according to the external platform's documented authentication and signature mechanisms.

Security requirements include:

- Signature verification where supported.
- Correct integration account identification.
- Tenant isolation.
- Request size limits.
- Safe payload validation.
- Duplicate event detection.
- Secure logging.
- Protection against replay attacks where supported.
- Appropriate handling of unknown events.

Webhook secrets and integration credentials must not be committed to source control.

Sensitive payload data must not be unnecessarily exposed through application logs.

## 24.23 Integration Credential Management

Each connected sales channel must have a secure, business-scoped integration configuration.

The system must support:

- Credential storage using appropriate encryption or secret-management controls.
- Credential rotation.
- Permission and scope validation.
- Connection status monitoring.
- Revocation and disconnection.
- Separation between development and production credentials.
- Audit records for sensitive integration configuration changes.

One business must never be able to access another business's marketplace credentials.

Production credentials must not be used in unapproved local development workflows.

## 24.24 Reconciliation and Missed Event Recovery

Webhooks and API updates alone are insufficient to guarantee permanent synchronization.

The platform must support reconciliation routines appropriate to each connector.

Potential checks include:

- External orders missing from Commerce Hub.
- Commerce Hub orders missing expected external references.
- Duplicate imported orders.
- Unexpected order status differences.
- Intended inventory differing from externally observed inventory.
- Missing product or variant mappings.
- Stalled synchronization requests.
- External inventory changes made outside Commerce Hub.

Reconciliation should produce actionable discrepancies rather than silently overwriting authoritative inventory.

Automated recovery may be allowed for explicitly approved deterministic cases.

Other cases must require investigation.

## 24.25 External Inventory Changes

A connected marketplace may permit inventory changes outside Commerce Hub.

Such changes can conflict with the intended source-of-truth model.

The platform must establish a clear policy for externally initiated inventory adjustments.

The initial strategy should treat Commerce Hub as authoritative after cutover.

Unexpected external quantity changes should be detected and reported.

Where appropriate and safe, Commerce Hub may republish its intended quantity after determining whether outstanding orders or synchronization delays explain the discrepancy.

The system must not blindly overwrite an external change without evaluating potential unprocessed sales.

## 24.26 Returns, Refunds and Cancellations

Returns and cancellations must be handled through explicit order lifecycle events.

A refund does not necessarily mean physical inventory has returned.

Returned goods must be inspected or classified before being restored to sellable stock.

The system should distinguish between:

- Cancellation before fulfilment.
- Cancellation after partial fulfilment.
- Return initiated.
- Return in transit.
- Return received.
- Return accepted as sellable.
- Return classified as damaged.
- Refund issued.
- Return closed.

The exact workflow may differ by sales channel.

Inventory must not be increased solely because a refund event was received.

## 24.27 Invoice and Payment Boundaries

Commerce Hub's initial responsibility is centralized order and inventory management.

Existing Shopify invoicing workflows will remain in Shopify.

The system should preserve order pricing, taxes, discounts, payment references and relevant invoice identifiers for future capabilities.

Native invoice generation is deferred.

The platform must not assume that a Myntra order can or should be invoiced through Shopify.

Payment capture, refunds and marketplace settlements must remain distinct from inventory movements.

Future accounting and invoice functionality will require separate requirements and regulatory review.

## 24.28 Monitoring and Operational Visibility

Authorized users should be able to identify integration problems without inspecting technical logs.

The proposed operational dashboard should eventually display:

- Connected channels.
- Connection health.
- Last successful synchronization.
- Pending inventory updates.
- Failed inventory updates.
- Orders awaiting processing.
- Unmapped external SKUs.
- Inventory discrepancies.
- Potential overselling exposure.
- Reconciliation exceptions.

Operational alerts should prioritize issues that could affect sales, fulfilment or inventory accuracy.

The interface should distinguish between a temporary delay and an unresolved failure.

## 24.29 Auditability and Traceability

Every relevant order and synchronization operation should be traceable.

The system should retain relationships between:

- External order.
- Internal order.
- Order line.
- Reservation.
- Inventory movement.
- Channel allocation.
- Outbox event.
- Synchronization attempt.
- External confirmation.
- Reconciliation record.

This traceability is essential for diagnosing inventory discrepancies and explaining stock changes to business users.

Audit records must respect tenant isolation and appropriate retention requirements.

## 24.30 Integration Testing Strategy

The implementation must include automated tests for:

1. Valid order ingestion.
2. Duplicate webhook delivery.
3. Duplicate order retrieval.
4. Out-of-order order events.
5. Missing SKU mappings.
6. Concurrent orders.
7. Insufficient inventory.
8. Reservation and fulfilment transitions.
9. Partial cancellation.
10. Partial fulfilment.
11. Return inspection and restocking.
12. Outbox transaction consistency.
13. Worker retries.
14. Connector authentication failures.
15. API rate limiting.
16. Stale inventory update prevention.
17. Safe cross-channel reallocation.
18. Missed webhook recovery.
19. Inventory reconciliation.
20. Tenant isolation.
21. Unauthorized inventory changes.
22. Integration disconnection.
23. External API timeout recovery.
24. Repeated reconciliation execution.

Tests should use isolated databases and mocked or sandboxed external integrations.

No test may modify protected production inventory or live marketplace quantities without explicit authorization.

## 24.31 Implementation Sequencing

The proposed implementation sequence is:

**Stage 1: Internal order and inventory foundation**

Implement and validate internal order processing, reservations, stock movements and allocation rules without live marketplace integration.

**Stage 2: Shopify connector foundation**

Establish secure Shopify authentication, product mappings, webhook ingestion and controlled inventory synchronization in an approved test environment.

**Stage 3: Shopify operational validation**

Validate order processing, cancellations, fulfilment, retries, reconciliation and inventory accuracy using representative business scenarios.

**Stage 4: Fimonaa India production cutover**

Proceed only after migration validation, operational readiness and explicit approval.

**Stage 5: Myntra feasibility and integration**

Implement supported capabilities after confirming technical access and operational requirements.

**Stage 6: Additional channels and businesses**

Extend the connector model to Fimonaa Finland and future SaaS customers.

The exact ordering of the Shopify integration and inventory cutover must be finalized during implementation planning.

## 24.32 Acceptance Criteria

The multichannel architecture can proceed to detailed implementation when:

- Internal order states and inventory effects are defined.
- External order identity and idempotency rules are established.
- Reservation and fulfilment semantics are consistent.
- Connector responsibilities are separated from inventory logic.
- Outbox and worker processing strategies are documented.
- Synchronization versioning and stale-update protection are defined.
- Fixed allocation reassignments preserve inventory safety.
- Failure handling and reconciliation are specified.
- Webhook and credential security requirements are reviewed.
- Automated integration test scenarios are agreed upon.
- Production cutover boundaries remain explicit.

This architectural checkpoint does not authorize live marketplace synchronization or production inventory changes.

## 24.33 Next Section

Section 25 will document the production implementation roadmap.

It will cover the existing-codebase gap analysis, phased delivery, Excel SKU master migration, inventory reconciliation, production acceptance gates, Fimonaa India rollout, Fimonaa Finland onboarding and eventual commercial SaaS evolution.

---

# 25. Production Implementation Roadmap, Excel Migration and SaaS Evolution

## 25.1 Purpose and Delivery Status

This section defines the proposed implementation roadmap for transforming Fimonaa Commerce Hub into a production-ready inventory and order management platform.

The roadmap prioritizes Fimonaa India's operational requirements while preserving the architecture needed for Fimonaa Finland and future commercial SaaS customers.

**Roadmap status:** Proposed delivery strategy based on the product direction approved on 25 November 2026.

**Implementation status:** The existing authenticated frontend, business membership functionality, tenant-scoped inventory APIs and guarded development environment form the current development baseline.

The inventory ledger, order processing engine, channel allocation system, Shopify integration, Myntra integration and production migration described in Sections 22 through 24 are not yet confirmed as implemented.

Actual implementation scope must be determined through an existing-codebase gap analysis.

## 25.2 Delivery Philosophy

Commerce Hub should be developed through small, independently verifiable milestones.

Each milestone should have:

1. Defined business objectives.
2. Explicit functional scope.
3. Documented architecture decisions.
4. Appropriate database migrations.
5. Automated tests.
6. Security and tenant-isolation validation.
7. Frontend and backend integration.
8. Operational acceptance criteria.
9. Updated development documentation.
10. A reviewed pull request.

The development process must prioritize inventory correctness over rapid feature expansion.

Production inventory must never be used as an experimental development dataset.

## 25.3 Current Development Baseline

The current implementation includes an established multitenant application foundation.

Documented capabilities include:

- NestJS backend.
- PostgreSQL persistence through TypeORM.
- React and TypeScript frontend.
- Authentication.
- Business membership and authorization.
- Business workspace selection.
- Business-scoped inventory dashboard.
- Inventory search, filtering and pagination.
- Protected inventory APIs.
- Development fixtures.
- Guarded development database workflows.
- Existing automated tests.
- GitHub pull request and CI workflows.

These capabilities provide a foundation for the next phase.

They do not establish that the application is ready to replace Fimonaa India's existing inventory management processes.

## 25.4 Phase 0: Existing-Codebase Gap Analysis

**Objective:** Determine precisely what already exists and what must be implemented.

Before changing the inventory model, inspect:

- Existing product entities.
- Existing variant entities.
- SKU and barcode fields.
- Inventory balance representation.
- Inventory-related services.
- Inventory API endpoints.
- Business and tenant relationships.
- Existing database constraints.
- TypeORM migrations.
- Inventory import functionality.
- Order-related entities, if any.
- Worker application capabilities.
- Existing tests.
- Development environment safeguards.

The analysis must identify:

1. Reusable functionality.
2. Missing domain concepts.
3. Existing technical limitations.
4. Required schema changes.
5. Potential migration risks.
6. Necessary API changes.
7. Frontend changes.
8. Required tests.
9. Security considerations.
10. Recommended implementation sequence.

**Exit criterion:** A reviewed implementation gap report and prioritized engineering backlog.

No protected database changes are authorized during this phase.

## 25.5 Phase 1: Product, Variant and SKU Foundation

**Objective:** Establish reliable product identities and inventory references.

The implementation must support:

- Business-scoped products.
- Sellable variants.
- Stable internal identifiers.
- SKU uniqueness rules.
- Barcode and EAN associations.
- External marketplace identifiers.
- Product and variant lifecycle states.
- Relevant product attributes.
- Safe editing and validation.

The design must accommodate Fimonaa's existing size and colour variants without becoming fashion-specific.

External channel mappings must remain separate from mutable product titles.

**Exit criterion:** Products and variants can be created, identified, validated and referenced reliably through tested business-scoped APIs.

## 25.6 Phase 2: Inventory Locations and Ledger

**Objective:** Establish the authoritative inventory accounting foundation.

Implement:

- Business-scoped inventory locations.
- Default location configuration.
- Location-specific balances.
- Auditable stock movements.
- Stock receipts.
- Manual adjustments.
- Transactional balance updates.
- Inventory history.
- Appropriate authorization.
- Ledger reconciliation.

The initial implementation may use one location for Fimonaa India.

However, the persistence model must support multiple locations.

**Exit criterion:** Every accepted stock-changing operation is traceable, transactionally consistent and protected against unauthorized or cross-business access.

## 25.7 Phase 3: Reservations and Internal Order Management

**Objective:** Support reliable inventory consumption through orders.

Implement:

- Internal order records.
- Order lines.
- Manual order creation.
- Offline sales.
- Reservation creation.
- Reservation release.
- Fulfilment transitions.
- Cancellation handling.
- Partial order workflows.
- Return inspection and restocking.
- Idempotent order processing.
- Concurrency-safe inventory updates.

The system must prevent duplicate stock deductions.

An accepted order must not silently produce negative available inventory.

**Exit criterion:** Representative offline and manually entered orders can be processed through their complete lifecycle while maintaining correct inventory balances.

## 25.8 Phase 4: Channel Allocations and Safety Buffers

**Objective:** Allow businesses to control inventory exposure across sales channels.

Implement:

- Sales channel configuration.
- Fixed inventory allocations.
- Allocation validation.
- Unallocated stock calculations.
- Business-level safety stock defaults.
- SKU-level safety stock overrides.
- Allocation audit history.
- Allocation management interface.
- Synchronization-aware reallocation states.

Initial allocations may be tested using simulated channels before external integrations are enabled.

**Exit criterion:** Channel allocations remain consistent with available inventory, and reallocation cannot create duplicate inventory exposure.

## 25.9 Phase 5: Excel SKU Master Migration Preparation

**Objective:** Prepare the controlled migration of Fimonaa India's existing inventory records.

The existing Excel SKU workbook remains authoritative throughout migration preparation.

The migration process must begin with a read-only assessment of the workbook.

The assessment should identify:

- Worksheets and their purposes.
- Product and variant records.
- SKU formats.
- Barcode values.
- Product names.
- Colours.
- Sizes.
- Inventory quantities.
- Duplicate identifiers.
- Missing required fields.
- Inconsistent formatting.
- Records requiring business clarification.

The migration must not assume that every workbook row is valid or uniquely identifiable.

The import process must support validation and reporting before committing data.

## 25.10 Migration Mapping and Validation

A documented mapping must define how each relevant Excel field corresponds to the Commerce Hub data model.

The migration should produce:

1. Source workbook identification.
2. Import batch identifier.
3. Source row reference.
4. Parsed product and variant identifiers.
5. Normalized field values.
6. Validation results.
7. Duplicate detection results.
8. Proposed inventory opening balances.
9. Import warnings.
10. Import errors.
11. Reconciliation totals.

Rows with unresolved ambiguity must not be silently corrected.

The system should provide a reviewable report identifying records that require manual decisions.

## 25.11 Dry-Run Import Strategy

Before any production import, the migration must be tested in an isolated development or staging environment.

A dry run should:

- Read the workbook without modifying it.
- Validate expected columns.
- Parse all relevant records.
- Identify duplicates.
- Validate SKU and variant mappings.
- Calculate expected opening balances.
- Report rejected records.
- Produce reconciliation totals.
- Avoid changes to protected production inventory.

The process should be repeatable.

Repeated dry runs must not create duplicate records or inconsistent inventory balances.

**Exit criterion:** The business and engineering team can review a complete import report and explain all unresolved discrepancies.

## 25.12 Inventory Reconciliation Before Cutover

A successful technical import does not automatically establish inventory accuracy.

Before cutover, compare:

- Excel SKU records.
- Imported Commerce Hub records.
- Expected variant counts.
- Expected inventory quantities.
- Duplicate or missing SKUs.
- Physical stock verification where practical.
- Outstanding orders.
- Pending returns.
- Unfulfilled marketplace orders.
- Relevant inventory adjustments.

The reconciliation must distinguish between data quality issues and genuine stock discrepancies.

Any unresolved discrepancy must be documented.

The business must explicitly approve the treatment of material differences.

## 25.13 Production Cutover Strategy

The transition from Excel to Commerce Hub must be treated as a controlled operational event.

A proposed cutover process is:

1. Confirm production readiness.
2. Establish a cutover date and responsible personnel.
3. Back up the current workbook and relevant systems.
4. Establish the final inventory snapshot.
5. Record outstanding orders and stock commitments.
6. Restrict conflicting inventory edits during the transition.
7. Run the approved import.
8. Validate imported records and quantities.
9. Reconcile inventory totals.
10. Verify user access and operational workflows.
11. Confirm backup and recovery procedures.
12. Obtain explicit business approval.
13. Declare Commerce Hub the authoritative inventory system.
14. Begin controlled production operations.
15. Monitor discrepancies and operational exceptions.

The exact cutover procedure must be finalized after the gap analysis and migration dry runs.

## 25.14 Rollback and Recovery Planning

The migration plan must define how the business can recover if cutover fails.

Before cutover, the team must establish:

- Database backup procedures.
- Verified restore procedures.
- Workbook snapshot retention.
- Inventory reconciliation records.
- Cutover transaction logs.
- Responsible decision-makers.
- Operational communication procedures.
- Criteria for pausing or reversing the transition.

A rollback must not simply restore an old database snapshot after new orders have been accepted without accounting for those transactions.

If Commerce Hub has already processed live orders, recovery must reconcile those orders and their inventory effects.

The recovery strategy must preserve business transaction history.

## 25.15 Phase 6: Shopify Integration Foundation

**Objective:** Connect Fimonaa India's Shopify store to Commerce Hub.

The initial integration should focus on:

- Secure store authentication.
- Product and variant mapping.
- Inventory location mapping.
- Order ingestion.
- Duplicate-event protection.
- Order lifecycle mapping.
- Inventory availability calculation.
- Controlled outbound inventory updates.
- Synchronization monitoring.
- Reconciliation.

Implementation should begin with approved development or test configurations.

Live inventory changes must remain disabled until explicit authorization.

**Exit criterion:** Representative Shopify orders and inventory updates can be processed reliably in a controlled test environment.

## 25.16 Shopify Cutover and Inventory Authority

Shopify integration introduces an additional source-of-truth transition.

Before enabling live synchronization, the business must confirm:

- Which system currently controls Shopify inventory.
- How existing Shopify stock quantities map to Commerce Hub.
- Which inventory locations are active.
- Which products and variants are eligible for synchronization.
- How pending Shopify orders are handled.
- How external inventory adjustments are detected.
- How synchronization failures are escalated.
- How inventory updates can be safely paused.

The integration should support a controlled rollout, potentially beginning with a limited set of products.

The rollout must not expose the same physical inventory independently through multiple channels.

**Exit criterion:** Commerce Hub and Shopify inventory remain consistent under agreed operational scenarios, with monitored synchronization and a documented recovery process.

## 25.17 Phase 7: Fimonaa India Production Stabilization

**Objective:** Demonstrate that Commerce Hub is reliable for everyday business operations.

The stabilization period should include:

- Daily inventory reconciliation.
- Order processing monitoring.
- Synchronization failure review.
- Staff feedback.
- Operational issue tracking.
- Backup verification.
- Performance monitoring.
- Authorization checks.
- Audit history review.
- Recovery procedure validation.

Success must be evaluated through actual operational results rather than feature completion alone.

The business should define an acceptable stabilization period and measurable reliability thresholds before production cutover.

## 25.18 Phase 8: Myntra Integration Feasibility

**Objective:** Determine the supported technical integration model for Myntra.

The feasibility assessment must confirm:

- Available partner APIs.
- Seller account permissions.
- Order retrieval mechanisms.
- Inventory update capabilities.
- Webhook or polling support.
- Rate limits.
- Authentication requirements.
- SKU mapping requirements.
- Operational limitations.
- Reconciliation mechanisms.

If supported, the integration should reuse Commerce Hub's existing order and inventory services.

If direct integration is unavailable, the team may evaluate controlled import or export workflows.

A manual or scheduled workflow must not be presented as real-time synchronization.

**Exit criterion:** A documented integration decision based on verified marketplace capabilities.

## 25.19 Phase 9: Fimonaa Finland Onboarding

**Objective:** Validate Commerce Hub as a genuine multibusiness operational platform.

Fimonaa Finland should be onboarded as a separate tenant.

The onboarding process should validate:

- Independent business configuration.
- Separate product catalogue.
- Separate inventory.
- Business-specific users and roles.
- Separate Shopify integration.
- Different currency.
- Regional tax requirements.
- Independent inventory locations.
- Separate reporting.
- Tenant-isolated credentials and data.

The Finland implementation should reveal any assumptions that were unintentionally specific to Fimonaa India.

**Exit criterion:** Both businesses can operate independently without cross-business inventory, order or credential exposure.

## 25.20 Phase 10: Commercial SaaS Preparation

**Objective:** Prepare Commerce Hub for customers beyond the Fimonaa businesses.

Commercial readiness will require additional capabilities.

Potential workstreams include:

- Customer onboarding.
- Business account administration.
- Subscription plans.
- Billing and payment collection.
- Usage limits.
- Tenant provisioning.
- Customer support workflows.
- Service monitoring.
- Data retention policies.
- Backup and recovery.
- Security reviews.
- Privacy and regulatory compliance.
- Product documentation.
- Operational support processes.

These capabilities should be prioritized after the core inventory and order management system has been validated through real business operations.

## 25.21 Multi-Industry Product Strategy

The commercial platform should support multiple retail industries through a common inventory foundation.

The core model should remain focused on:

- Businesses.
- Products.
- Variants.
- SKUs.
- Locations.
- Inventory movements.
- Reservations.
- Orders.
- Sales channels.
- Allocations.
- Synchronization.

Industry-specific requirements should be introduced through configurable attributes and specialized workflows when justified.

The architecture should avoid hardcoding clothing sizes, colours or fashion terminology into generic inventory services.

## 25.22 Deferred Capabilities

The following capabilities remain outside the immediate production foundation unless explicitly reprioritized:

- Advanced product image management.
- Native invoice generation.
- Shared inventory allocation pools.
- Predictive stock allocation.
- Advanced demand forecasting.
- Automated purchasing.
- Supplier management.
- Advanced warehouse operations.
- Comprehensive accounting.
- Subscription billing.
- Industry-specific advanced modules.

Deferring these capabilities does not prohibit designing appropriate extension points.

However, the initial implementation should not introduce unnecessary complexity solely to support speculative future requirements.

## 25.23 Production Quality Gates

Before production deployment, the team must validate:

**Security**

- Authentication.
- Authorization.
- Tenant isolation.
- Credential protection.
- Input validation.
- Audit logging.

**Data integrity**

- Inventory ledger consistency.
- Reservation correctness.
- Concurrency protection.
- Idempotency.
- Transaction rollback behavior.
- Reconciliation.

**Operational reliability**

- Monitoring.
- Alerting.
- Backup.
- Restore testing.
- Error recovery.
- Deployment rollback.
- Integration failure handling.

**Business readiness**

- Validated inventory data.
- Staff training.
- Documented workflows.
- Approved cutover plan.
- Defined support responsibilities.
- Operational acceptance testing.

Production deployment must not proceed solely because automated tests pass.

## 25.24 Suggested Acceptance Scenarios

The initial production acceptance process should validate representative business scenarios.

Examples include:

1. Create a product and variant.
2. Assign an internal SKU.
3. Record opening inventory.
4. Receive additional stock.
5. Create an offline order.
6. Reserve inventory.
7. Fulfil an order.
8. Cancel an unfulfilled order.
9. Process a partial return.
10. Reject a damaged return from sellable stock.
11. Allocate stock to Shopify.
12. Allocate stock to Myntra in a simulated environment.
13. Apply a safety buffer.
14. Attempt an allocation exceeding available stock.
15. Process duplicate order events.
16. Process concurrent orders for limited stock.
17. Simulate an external synchronization failure.
18. Reconcile intended and confirmed quantities.
19. Import a representative Excel dataset.
20. Verify business and location isolation.
21. Restore a database backup.
22. Confirm that unauthorized users cannot modify inventory.

The final acceptance suite should reflect actual Fimonaa operational workflows.

## 25.25 Documentation and Decision Management

Each implementation milestone should update the relevant project documentation.

Documentation should distinguish between:

- Implemented functionality.
- Tested functionality.
- Proposed architecture.
- Approved product decisions.
- Deferred functionality.
- Known limitations.
- Operational risks.

Architectural decisions should be recorded when they materially affect data integrity, external integrations or future extensibility.

The development documentation must not imply that a proposed capability is already operational.

## 25.26 Git and Pull Request Workflow

Implementation should continue through dedicated Git branches and reviewed pull requests.

The expected workflow is:

1. Start from the latest approved `main`.
2. Create a focused feature or documentation branch.
3. Implement a defined milestone.
4. Run relevant tests.
5. Review changes.
6. Update documentation.
7. Commit changes.
8. Push the branch.
9. Open a pull request.
10. Complete required review and CI checks.
11. Merge after approval.
12. Verify the merged baseline.

Protected production database operations require separate explicit authorization regardless of Git approval.

A merged pull request does not automatically authorize production deployment.

## 25.27 Recommended Immediate Engineering Action

The next implementation task should be the existing-codebase gap analysis defined in Section 25.4.

The analysis should begin with the current product, variant and inventory persistence model.

It should establish:

- Which existing entities can be reused.
- Which inventory concepts are missing.
- Whether existing inventory balances are location-aware.
- Whether an inventory ledger already exists.
- Whether reservation functionality exists.
- Whether order processing functionality exists.
- Which database migrations would be required.
- How the existing frontend inventory views should evolve.
- Which automated tests already cover relevant behavior.
- Which additional safeguards are necessary.

No schema modification should be performed until the analysis has been reviewed.

## 25.28 Final Product Direction

Fimonaa Commerce Hub should evolve into a reliable operational platform that enables small businesses to manage inventory and orders across multiple sales channels.

The immediate goal is to replace Fimonaa India's Excel-based inventory management with a controlled, auditable system.

The next goal is to integrate Shopify orders and inventory synchronization.

Myntra integration will follow according to verified technical feasibility.

Fimonaa Finland will validate the multitenant operating model across separate businesses and markets.

The long-term goal is to offer Commerce Hub as a commercial SaaS product for small and growing retailers across multiple industries.

Throughout this evolution, the platform must prioritize:

**Inventory accuracy, operational simplicity, transparent synchronization, tenant isolation and reliable business workflows.**

The product vision remains:

**One inventory. Every sales channel. Complete control.**

---

**Fimonaa Commerce Hub**
**Development Documentation: Version 1.8**
**25 November 2026**

_End of development documentation v1.8._
