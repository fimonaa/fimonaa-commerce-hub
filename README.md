# Fimonaa Commerce Hub

**One inventory. Every sales channel. Complete control.**

Fimonaa Commerce Hub is an inventory-first, multitenant commerce operations platform being developed to help small and growing retail businesses manage products, inventory, orders and sales channels from a single system.

The platform is initially being developed for Fimonaa India, with Fimonaa Finland planned as a subsequent business workspace. Its longer-term objective is to become a configurable SaaS solution for independent retailers across fashion, jewellery, home décor and other retail categories.

### Product Vision

Commerce Hub is designed to address a common challenge faced by businesses selling through multiple channels: maintaining accurate inventory while managing orders across online stores, marketplaces and physical retail locations.

The approved architecture establishes Commerce Hub as the future authoritative inventory system, with the following capabilities planned:

- Centralized inventory management with an auditable stock movement ledger.
- Multiple inventory locations and location-specific stock visibility.
- Fixed inventory allocations across sales channels.
- Configurable safety stock buffers to reduce overselling risk.
- Centralized order ingestion, processing and stock reservations.
- Inventory synchronization across connected sales channels.
- Synchronization monitoring, retries, reconciliation and discrepancy alerts.
- Tenant-isolated business workspaces with role-based access controls.
- Extensible integrations and configurable functionality for different retail businesses.

**Important:** These architectural capabilities are planned and must not be interpreted as fully implemented functionality.

The initial production strategy prioritizes fixed channel-specific inventory allocations. Shared inventory pools and more advanced allocation strategies are reserved for future development.

### Current Implementation

The backend currently includes authentication, account activation, business membership invitations, business-scoped authorization, tenant-scoped dashboard and inventory APIs, membership lifecycle administration, and guarded opening-balance import functionality.

The frontend includes login, business workspace selection, authenticated navigation, dashboard, inventory search, stock filtering and pagination.

Guarded local development tooling and synthetic inventory fixtures support development and testing without modifying protected production inventory data.

**Latest recorded implementation commit:** `0a1b0ce`.

**Latest merged development milestone:** Authenticated frontend and business workspace integration, merged into `main` through PR #13 (`efc1289`).

**Production readiness:** The platform is **not production ready**.

### Inventory Authority and Production Safety

The existing Fimonaa Excel SKU workbook remains the authoritative inventory source until a separately approved, validated and reconciled production cutover.

Following that cutover, Commerce Hub is intended to become the central inventory authority. Orders originating from Shopify, marketplaces, physical stores or other supported channels will be processed centrally, with updated inventory availability synchronized to connected channels.

Shopify integration is the first planned external sales channel integration. Myntra integration will follow subject to technical feasibility, API availability and partner permissions.

**No live inventory synchronization, marketplace integration or production inventory cutover is implied by the current development status.**

The protected `fimonaa_commerce` database must not be modified without explicit authorization.

### Next Engineering Priority

The next milestone is the **Production Inventory and Order Management Foundation**, beginning with an existing-codebase gap analysis.

This work will assess the existing product, variant, SKU, inventory and database structures before introducing production-grade stock movements, reservations, locations, channel allocations and order processing.

Advanced product and variant image management is deferred to a later milestone.

For the approved architecture, implementation sequence and production migration strategy, refer to `docs/development-documentation_v1.8.md`.

## Repository layout

| Path             | Purpose                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `apps/api`       | NestJS and TypeScript backend API                                          |
| `apps/web`       | React 19, TypeScript 6, Vite 8 and Tailwind CSS 4 frontend                 |
| `apps/worker`    | Background worker workspace                                                |
| `libs/domain`    | Shared domain contracts                                                    |
| `infrastructure` | Local PostgreSQL and Redis configuration                                   |
| `docs`           | Development documentation, implementation notes and architecture decisions |

The frontend uses React 19, TypeScript 6, Vite 8 and Tailwind CSS 4.

Start it from the repository root:

```bash
npm run dev -w apps/web
```

Build it with:

```bash
npm run build -w apps/web
```

## Prerequisites

- Node.js 22 LTS
- npm
- Docker Desktop

## Local infrastructure

From the repository root:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

The initial local configuration exposes PostgreSQL on `localhost:5432` and Redis on `localhost:6379`.

Confirm ports against the current Compose configuration if it has changed.

## Backend setup

From the repository root, install dependencies:

```bash
npm install
```

For local development, use the Git-ignored configuration file `apps/api/.env.development.local`.

Configure this file to connect exclusively to the approved local PostgreSQL database `fimonaa_commerce_dev`.

The guarded launcher reads this development-specific configuration and validates the database target before executing supported commands.

**Important:** Do not overwrite `apps/api/.env`, as it may contain protected database configuration. Never copy production credentials into the development environment file.

Start the backend through the guarded launcher:

    node apps/api/scripts/run-local-dev.cjs api

Start the frontend in a separate terminal:

    npm run dev -w apps/web

The guarded launcher validates the database configuration before executing supported development commands.

Supported commands:

| Command              | Purpose                                                        |
| -------------------- | -------------------------------------------------------------- |
| `api`                | Start the NestJS development server                            |
| `migration:show`     | Inspect development database migrations                        |
| `migration:run`      | Apply reviewed migrations to the approved development database |
| `seed:dev-auth`      | Create or verify synthetic development users and businesses    |
| `seed:dev-inventory` | Create or verify synthetic development inventory               |

Run these commands through:

    node apps/api/scripts/run-local-dev.cjs <command>

Database environments:

| Database | Purpose |
| --------------------------
---- | ----------------------------------- |
| `fimonaa_commerce` | Protected database |
| `fimonaa_commerce_dev` | Approved local development database |
| `fimonaa_commerce_import_test` | Isolated integration-test database |

**Safety:** Never run migrations, imports, seeds, destructive SQL, or integration tests against the protected database without explicit authorization.

The unguarded `npm run dev:api` command is not the recommended local development workflow.

Starting the API does not authorize modifications to protected inventory.

## API overview

The backend uses the global API prefix:

```text
/api
```

Protected business routes use:

```http
Authorization: Bearer <access-token>
X-Business-Id: <business-uuid>
```

The backend verifies the user's active membership and role for the requested business.

The business header alone does not grant access.

### Authentication and account activation

| Method | Route                         | Purpose                                         |
| ------ | ----------------------------- | ----------------------------------------------- |
| `POST` | `/api/auth/login`             | Verify credentials and issue a JWT access token |
| `POST` | `/api/auth/accept-invitation` | Activate an invited user account                |
| `POST` | `/api/auth/invitations`       | Create an initial account activation invitation |

The initial invitation workflow is intended for an existing user with `invited` status and an existing business membership.

It is separate from the Phase 2B business membership invitation workflow.

### Business membership invitations

Phase 2B introduces dedicated business membership invitation endpoints.

| Method | Route                                                            | Purpose                                |
| ------ | ---------------------------------------------------------------- | -------------------------------------- |
| `POST` | `/api/auth/business-membership-invitations`                      | Issue a business membership invitation |
| `POST` | `/api/auth/business-membership-invitations/accept`               | Accept an invitation                   |
| `GET`  | `/api/auth/business-membership-invitations`                      | List invitations                       |
| `GET`  | `/api/auth/business-membership-invitations/:invitationId`        | Retrieve an invitation                 |
| `POST` | `/api/auth/business-membership-invitations/:invitationId/revoke` | Revoke an invitation                   |

Invitation records are associated with a business and contain hashed tokens, expiration timestamps, and acceptance or revocation state.

Supported invitation roles are:

- `admin`
- `inventory_manager`
- `operator`
- `viewer`

The invitation schema does not permit inviting an `owner` through this mechanism.

Secure invitation delivery remains outstanding.

### Business Membership Management

Business Membership Management was implemented in two stages.

**Phase 1:** Read-only membership listing and retrieval, merged through PR #9 (`5de2992`).

**Phase 2B:** Membership lifecycle administration and invitation management, merged through PR #11 (`c852d35`).

The backend provides:

| Method  | Route                                                | Access                               |
| ------- | ---------------------------------------------------- | ------------------------------------ |
| `GET`   | `/api/business-memberships`                          | Owner or admin                       |
| `GET`   | `/api/business-memberships/:membershipId`            | Owner or admin                       |
| `PATCH` | `/api/business-memberships/:membershipId/role`       | Owner                                |
| `POST`  | `/api/business-memberships/:membershipId/suspend`    | Owner or admin, subject to hierarchy |
| `POST`  | `/api/business-memberships/:membershipId/reactivate` | Owner or admin, subject to hierarchy |
| `POST`  | `/api/business-memberships/:membershipId/remove`     | Owner                                |

All operations are scoped to the verified business context.

The `membershipId` parameter identifies a membership record, not a user account.

Membership role updates support:

- `admin`
- `inventory_manager`
- `operator`
- `viewer`

The role update endpoint does not provide ownership transfer.

Membership removal uses a lifecycle state rather than immediate deletion.

### Membership lifecycle

Phase 2B supports four membership states:

| Status      | Description                                  |
| ----------- | -------------------------------------------- |
| `pending`   | Awaiting activation                          |
| `active`    | Membership currently active                  |
| `suspended` | Membership temporarily disabled              |
| `removed`   | Membership removed from active participation |

Suspended and removed memberships must not authorize protected business operations.

Membership access remains business-specific.

A user's membership status in one business must not automatically affect access to another business.

### Inventory and imports

The backend provides business-scoped inventory listing, searching, filtering and pagination.

Inventory records are isolated through verified business ownership.

The opening-balance import endpoint is:

```http
POST /api/inventory-import/import-opening-balance
```

The import feature is disabled by default.

The current import service restricts execution to the isolated `fimonaa_commerce_import_test` database.

Production imports are not authorized.

### Health and API documentation

The backend health endpoint is:

```http
GET /api/health
```

Swagger/OpenAPI documentation is available outside production at:

```text
/api/docs
```

## Authentication and authorization

The merged backend implementation includes:

- Argon2id password hashing and credential verification.
- Signed JWT access tokens with a 15-minute lifetime.
- Database-backed business membership and role resolution.
- Global authentication and authorization guards.
- Initial account activation invitations.
- Business membership invitations.
- Transactional invitation acceptance.
- SHA256-hashed invitation tokens in storage.
- Membership lifecycle authorization.
- Business-scoped role management.

Membership lifecycle mutations use transactional database operations and PostgreSQL row-level locking.

The backend must validate active membership and business-specific permissions independently of client-supplied identifiers.

The following capabilities remain outstanding or require additional verification:

- Refresh-token rotation.
- Session persistence.
- Logout and token revocation.
- Password recovery.
- Login and public-endpoint rate limiting.
- Secure invitation delivery.
- Comprehensive membership audit logging.
- Production verification of last-active-owner safeguards.
- Complete endpoint permission matrix review.

## Database and inventory safety

**Protected database:** `fimonaa_commerce`

**Isolated integration-test database:** `fimonaa_commerce_import_test`

Do not run migrations, rollbacks, imports, seeds, destructive SQL, integration tests or other database writes against the protected database without explicit authorization.

TypeORM automatic schema synchronization is disabled:

```typescript
synchronize: false;
```

### Database migrations

Eight TypeORM migrations are implemented in the repository.

| Migration | Purpose                                        |
| --------- | ---------------------------------------------- |
| 1         | Business workspace foundation                  |
| 2         | Foundational inventory tables                  |
| 3         | Business ownership for inventory               |
| 4         | Business ownership for opening-balance imports |
| 5         | Tenant-scoped SKU identifiers                  |
| 6         | Initial user invitations                       |
| 7         | Business membership lifecycle                  |
| 8         | Business membership invitations                |

Migrations 7 and 8 were introduced during Phase 2B.

Their presence in source control does **not** confirm deployment to the protected database.

Migrations 5 through 8 refuse automatic rollback and require reviewed recovery procedures.

The Excel SKU workbook remains authoritative.

Live Shopify or marketplace stock writes, production opening-balance imports and inventory cutover are not approved.

## Verification

The completed Phase 2B implementation recorded:

| Verification           | Result              |
| ---------------------- | ------------------- |
| Unit tests             | 348 passed          |
| Integration tests      | 376 passed          |
| Total tests            | 724 passed          |
| Test suites            | 50                  |
| TypeScript compilation | Passed              |
| ESLint                 | Passed              |
| API build              | Passed              |
| GitHub CI              | 2 successful checks |

These results were recorded during the implementation milestone.

They are not a claim of a fresh test run or production readiness.

### Build verification

Non-database-writing build checks from the repository root:

```bash
npm run build:api
npm run build -w apps/web
```

Additional TypeScript test compilation check from `apps/api`:

```bash
npx tsc --project tsconfig.test.json --noEmit
```

Integration tests require verified local `.env.test` and `TEST_DATABASE_URL` configuration targeting only `fimonaa_commerce_import_test`.

Do not run integration tests until the database safety checks have been confirmed.

## Development status and next steps

### Completed milestones

| Milestone                               | Reference                             | Status             |
| --------------------------------------- | ------------------------------------- | ------------------ |
| Business-scoped inventory authorization | PR #6, `d4e5296`                      | Merged             |
| Authentication and initial invitations  | PR #7, `d1c25be`                      | Merged             |
| Development Documentation v1.4          | PR #8, `537bc9f`                      | Merged             |
| Business Membership Management Phase 1  | PR #9, `5de2992`                      | Merged             |
| Development Documentation v1.5          | PR #10, `f757124`                     | Merged             |
| Business Membership Management Phase 2B | PR #11, `c852d35`                     | Merged             |
| Development Documentation v1.6          | Historical Phase 2B documentation     | Superseded by v1.7 |
| Authenticated frontend and workspaces   | PR #13, `efc1289`                     | Merged             |
| Development Documentation v1.7          | PR #13, `efc1289`                     | Merged             |
| Development Documentation v1.8          | `docs/commerce-hub-architecture-v1.8` | In progress        |

### Current frontend implementation

The authenticated frontend implementation, merged into `main` through PR #13 (`efc1289`), includes the following functionality:

- Typed authenticated API client.
- Authentication context and session management.
- Login page.
- Business workspace selection.
- Authenticated application navigation.
- Tenant-scoped dashboard API and frontend.
- Inventory listing with search, stock-status filtering and pagination.
- Improved inventory empty states.
- Guarded local development tooling.
- Synthetic development authentication and inventory fixtures.

These changes were reviewed and merged into `main` through PR #13 (`efc1289`). They establish the current frontend development baseline but do not constitute production readiness or authorization to modify live inventory.

The historical Phase 2B backend membership-management milestone remains complete. The frontend membership administration screens, including invitation management, role changes, suspension and removal, remain future work unless separately verified.

### Latest recorded development verification

The more recent development checkpoint recorded:

| Verification               | Result                      |
| -------------------------- | --------------------------- |
| Backend tests              | 379 passed across 36 suites |
| Development script tests   | 17 passed                   |
| API TypeScript compilation | Passed                      |
| Manual frontend checks     | Passed                      |

Manual frontend verification covered authenticated workspace access, business isolation, inventory pagination, name and SKU searches, and stock-status filters.

These results belong to a separate verification checkpoint and must not be added to the historical Phase 2B total of 724 tests. They do not establish production readiness.

### Recommended next milestone

**Production Inventory and Order Management Foundation**

**Status:** Approved for planning. Implementation has not started.

The immediate next engineering activity is a comprehensive existing-codebase gap analysis.

This analysis must examine the current product, variant, SKU, inventory, database and authorization structures before introducing new production functionality.

The foundation will be developed incrementally, with the following priorities:

1. **Inventory data model:** Establish an auditable inventory ledger with explicit physical, reserved and available stock quantities.
2. **Multiple inventory locations:** Support location-specific inventory records from the outset, initially using one default location for Fimonaa India.
3. **Stock movements:** Introduce controlled stock adjustments, receipts and other inventory transactions with traceability and authorization.
4. **Order management:** Establish order records, lifecycle states, transactional stock reservations, cancellations and returns.
5. **Channel-specific allocations:** Allow authorized users to assign fixed inventory quantities to individual sales channels.
6. **Safety stock buffers:** Support configurable stock buffers that reduce the risk of overselling.
7. **Reliable order ingestion:** Design idempotent order processing that prevents duplicate stock deductions.
8. **Synchronization architecture:** Introduce background processing, retries, failure monitoring, reconciliation and auditability.
9. **Excel inventory migration:** Prepare a validated and reconciled migration from the existing Fimonaa SKU workbook.
10. **Controlled production cutover:** Transfer inventory authority to Commerce Hub only after explicit approval and successful operational verification.

**Initial integration priority:** Shopify, followed by Myntra subject to available integration capabilities and seller permissions.

Fixed channel-specific allocations are the initial inventory distribution strategy. Shared inventory pools and dynamic allocation strategies remain future enhancements.

Product and variant image management is deferred until the core inventory and order management foundation has progressed sufficiently.

**Production safety:** The existing Excel SKU workbook remains authoritative. No production database changes, live inventory writes or marketplace synchronization may be enabled without separate approval.

The detailed architecture, implementation roadmap, migration strategy and acceptance criteria are documented in `docs/development-documentation_v1.8.md`, Sections 22 through 25.

### Additional development priorities

Further development will follow a phased approach, prioritizing reliable inventory operations before external integrations and commercial expansion.

1. Existing-codebase gap analysis covering products, variants, SKUs, inventory, database relationships and authorization.
2. Production inventory data model, transaction ledger and stock movement workflows.
3. Multiple inventory locations and location-specific stock management.
4. Centralized order management, stock reservations, cancellations and returns.
5. Fixed channel-specific inventory allocations and configurable safety stock buffers.
6. Background processing, idempotency, synchronization monitoring, retries and reconciliation.
7. Controlled Excel SKU workbook migration, inventory validation and reconciliation.
8. Shopify integration, including authorized order ingestion and inventory synchronization.
9. Controlled production cutover following explicit approval and operational verification.
10. Myntra integration, subject to technical feasibility, API availability and seller permissions.
11. Frontend business membership administration, invitations and role management.
12. Business onboarding, initial owner provisioning and workspace administration.
13. Authentication hardening, authorization audits and tenant-isolation verification.
14. Audit logging, operational monitoring, database backup and recovery procedures.
15. Fimonaa Finland onboarding, including location, currency and country-specific operational requirements.
16. Advanced product and variant image management, including secure uploads and image retrieval.
17. Native invoicing, configurable retail attributes and additional marketplace integrations.
18. Commercial SaaS capabilities, including tenant onboarding, subscription management and operational administration.

These priorities represent the intended development direction, not completed functionality.

The exact implementation order and scope will be refined following the existing-codebase gap analysis. Security, tenant isolation, database safety and operational reliability remain mandatory throughout development.

The Excel SKU workbook will remain authoritative until an explicitly approved production cutover. Shopify and marketplace integrations must not perform live inventory writes before their respective authorization, testing and operational readiness requirements have been satisfied.

## Shopify and marketplace integration

**Implementation status:** Planned. Live Shopify and marketplace order ingestion, inventory synchronization and channel allocation workflows have not yet been implemented.

### Central Inventory Authority

Following an explicitly approved production cutover, Commerce Hub is intended to become the authoritative inventory system for connected business operations.

Orders may originate from Shopify, Myntra, physical retail locations or other supported channels. Commerce Hub will process those orders centrally, maintain inventory reservations and stock movements, and synchronize updated availability across connected sales channels.

Until that cutover is completed, the existing Excel SKU workbook remains the authoritative inventory source.

### Channel-Specific Inventory Allocation

The initial integration strategy uses fixed inventory allocations.

For example, if a product variant has four available units, an authorized inventory manager may allocate three units to Myntra and one unit to Shopify.

The system must track:

1. Physical inventory and reserved inventory.
2. Available inventory at each location.
3. Channel-specific inventory allocations.
4. Configurable safety stock buffers.
5. Unallocated inventory.
6. Confirmed inventory quantities on external channels.
7. Pending, failed and completed synchronization operations.

Allocations must not exceed eligible available inventory.

Inventory must not be offered to another channel while a conflicting external inventory update remains unresolved.

Shared inventory pools and dynamic allocation strategies are planned as future enhancements.

### Integration Priorities

**Shopify is the first planned integration.**

The proposed integration includes authorized product and variant mapping, order ingestion, webhook processing, inventory synchronization, retry handling and reconciliation.

**Myntra is the next planned marketplace integration**, subject to technical feasibility, API availability and the permissions granted to the relevant seller account.

Additional marketplace connectors will follow a reusable integration architecture.

No connector should be represented as operational until its capabilities have been implemented, tested and explicitly enabled.

### Reliability and Operational Controls

External order processing and inventory synchronization must support:

1. Idempotent event processing to prevent duplicate stock deductions.
2. Transactional inventory reservations and controlled stock movements.
3. Background processing and reliable event delivery.
4. Retry handling with appropriate failure classification.
5. Synchronization status visibility and operational alerts.
6. Reconciliation between Commerce Hub and connected sales channels.
7. Audit trails for inventory changes and integration operations.
8. Recovery procedures for failed, delayed or conflicting updates.

The implementation must account for delayed webhooks, duplicate events, concurrent orders, cancellations, returns and temporary marketplace outages.

### Security and Production Restrictions

Shopify OAuth, webhook handling and live integration credentials must be configured and tested before use.

Required scopes and permissions must be reviewed against the actual integration design. Proposed scopes in the existing scaffold are not automatically approved.

Client secrets, access tokens and other credentials must remain outside frontend code and Git.

Marketplace connectors must use only capabilities authorized for the relevant seller account.

Live inventory writes require an approved design, verified authorization, integration testing, reconciliation procedures and operational recovery controls.

**No production inventory synchronization or source-of-truth cutover may be enabled without explicit approval.**

The protected `fimonaa_commerce` database must remain unchanged unless a specific operation has been separately authorized.

For the detailed architecture, refer to Sections 23 and 24 of `docs/development-documentation_v1.8.md`.

## Documentation

The repository maintains versioned development documentation, implementation plans and architecture decision records.

**Current development documentation (v1.8, in progress):**

`docs/development-documentation_v1.8.md`

Version 1.8 documents the revised Commerce Hub product vision, production inventory architecture, multiple inventory locations, fixed channel allocations, safety stock buffers, multichannel order processing, synchronization strategy, Excel migration and proposed SaaS evolution.

This version is being prepared on `docs/commerce-hub-architecture-v1.8` and must not be described as merged until its pull request has been approved and merged.

**Latest merged development documentation:**

`docs/development-documentation_v1.7.md`

Version 1.7 records the authenticated frontend implementation, business workspace integration, development tooling and the historical image management proposal. It was merged into `main` through PR #13 (`efc1289`).

**Implementation plan:**

`docs/IMPLEMENTATION_PLAN.md`

The implementation plan should be read alongside development documentation v1.8 for the current production inventory and order management priorities.

**Historical development documentation:**

- `docs/development-documentation_v1.6.md` (Business Membership Management Phase 2B)
- `docs/development-documentation_v1.5.md` (Read-only Business Membership Management)

Earlier versions remain historical records and should not be overwritten.

**Architecture decisions:**

- `docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`: Excel authority and controlled cutover.
- `docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`: Tenant-scoped inventory identity.
- `docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`: Authentication, invitations and authorization decisions.

Historical architecture decisions must be preserved unless separately reviewed.

---

**Fimonaa Commerce Hub**

One inventory. Every sales channel. Complete control.
