# API Feature Modules

This directory contains the NestJS feature modules for Fimonaa Commerce Hub.

Fimonaa Commerce Hub is a multitenant inventory and order management platform designed for small and growing retail businesses.

**Product vision:** One inventory. Every sales channel. Complete control.

The API provides the backend foundation for authentication, business membership management, tenant-scoped inventory access and future centralized inventory and order processing.

The API uses a global `/api` prefix and enforces authentication, verified business membership and role-based authorization for protected business routes.

## Current Development Status

**Latest merged development milestone:** Authenticated Frontend and Business Workspace Integration.

**Merged through:** PR #13 (`efc1289`).

**Latest recorded implementation commit:** `0a1b0ce`.

**Previous completed backend milestone:** Business Membership Management Phase 2B, merged through PR #11 (`c852d35`).

**Current documentation version:** v1.8, in progress on `docs/commerce-hub-architecture-v1.8`.

**Next recommended engineering milestone:** Production Inventory and Order Management Foundation.

**Immediate next activity:** Existing-codebase gap analysis.

**Production status:** Not production ready.

The authenticated frontend, business workspace selection, business-scoped dashboard and inventory functionality have been merged into `main`.

The existing backend supports authenticated access to business-scoped inventory information.

However, production-grade inventory transactions, centralized order processing, channel allocations, safety stock buffers and live marketplace synchronization have not yet been implemented.

The approved architecture establishes Commerce Hub as the future authoritative inventory system after a controlled production cutover.

Until that cutover is explicitly approved and completed, the Fimonaa Excel SKU workbook remains the authoritative inventory source.

---

## 1. Existing API Modules

The following modules are part of the current implementation.

| Module                 | Current responsibility                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                 | Login, JWT authentication, account activation invitations, business membership invitations, verified business context and role guards |
| `business-memberships` | Business membership listing, retrieval, role updates, suspension, reactivation and removal                                            |
| `inventory`            | Business-scoped inventory listing, searching, filtering and pagination                                                                |
| `imports`              | Guarded opening-balance import functionality with isolated test database restrictions                                                 |
| `dashboard`            | Business-scoped dashboard APIs used by authenticated frontend workspaces                                                              |
| `health`               | Health endpoint                                                                                                                       |

These modules form the existing backend foundation.

Their presence does not establish that the proposed production inventory and order management architecture has been implemented.

### 1.1 Current Implementation Boundaries

The current backend does not yet provide a complete production implementation of:

- Transaction-based inventory movements.
- Centralized inventory reservations.
- Multiple inventory location management.
- Channel-specific inventory allocations.
- Configurable safety stock buffers.
- Centralized multichannel order processing.
- Production Shopify order ingestion.
- Live marketplace inventory synchronization.
- Automated inventory reconciliation.
- Production synchronization monitoring and recovery.

These capabilities remain planned.

---

## 2. Authentication and Authorization

The `auth` module provides JWT authentication, invitation workflows, verified business context and role-based authorization.

Protected business routes require a valid access token and a verified business context.

The backend must resolve the user's membership and permissions for the requested business.

A client-supplied business identifier alone does not grant access.

### 2.1 Account Authentication and Activation

| Method | Endpoint                      | Purpose                                         |
| ------ | ----------------------------- | ----------------------------------------------- |
| `POST` | `/api/auth/login`             | Authenticate a user                             |
| `POST` | `/api/auth/accept-invitation` | Accept an initial account activation invitation |
| `POST` | `/api/auth/invitations`       | Create an initial account activation invitation |

The initial account activation workflow is separate from business membership invitations.

### 2.2 Business Membership Invitations

Phase 2B introduced dedicated business membership invitation functionality.

| Method | Endpoint                                                         | Purpose                                 |
| ------ | ---------------------------------------------------------------- | --------------------------------------- |
| `POST` | `/api/auth/business-membership-invitations`                      | Create a business membership invitation |
| `POST` | `/api/auth/business-membership-invitations/accept`               | Accept a business membership invitation |
| `GET`  | `/api/auth/business-membership-invitations`                      | List business membership invitations    |
| `GET`  | `/api/auth/business-membership-invitations/:invitationId`        | Retrieve an invitation                  |
| `POST` | `/api/auth/business-membership-invitations/:invitationId/revoke` | Revoke an invitation                    |

Business membership invitations support the following roles:

- `admin`
- `inventory_manager`
- `operator`
- `viewer`

The invitation mechanism does not support assigning the `owner` role.

Invitation records are business-specific and include token hashes, expiration timestamps and acceptance or revocation information.

### 2.3 Business Context Verification

Protected business operations must verify:

1. The user is authenticated.
2. The requested business exists.
3. The user has an appropriate business membership.
4. The membership is active.
5. The user's role permits the requested operation.
6. The operation remains scoped to the verified business.

Suspended or removed memberships must not authorize protected business operations.

### 2.4 Future Authorization Requirements

The planned inventory and order management architecture will require additional authorization controls.

These include permissions for:

- Inventory adjustments.
- Stock reservations.
- Inventory location management.
- Channel allocation changes.
- Safety stock configuration.
- Order management.
- Inventory reconciliation.
- External integration configuration.
- Synchronization enablement.
- Business administration.

Permission boundaries must be finalized during implementation design.

Existing membership roles must not automatically receive new inventory mutation permissions without review.

---

## 3. Business Membership Management

Business Membership Management was delivered in two stages.

### 3.1 Phase 1: Read-Only Membership Management

Merged through PR #9 (`5de2992`).

| Method | Endpoint                                  | Purpose                                       |
| ------ | ----------------------------------------- | --------------------------------------------- |
| `GET`  | `/api/business-memberships`               | List memberships within the verified business |
| `GET`  | `/api/business-memberships/:membershipId` | Retrieve an individual membership             |

These endpoints are available to authorized owners and administrators.

The Phase 1 membership response includes:

- `id`
- `userId`
- `email`
- `status`
- `role`
- `createdAt`

Sensitive user fields are excluded.

### 3.2 Phase 2B: Membership Lifecycle Management

Merged through PR #11 (`c852d35`).

| Method  | Endpoint                                             | Purpose                  |
| ------- | ---------------------------------------------------- | ------------------------ |
| `PATCH` | `/api/business-memberships/:membershipId/role`       | Update a membership role |
| `POST`  | `/api/business-memberships/:membershipId/suspend`    | Suspend a membership     |
| `POST`  | `/api/business-memberships/:membershipId/reactivate` | Reactivate a membership  |
| `POST`  | `/api/business-memberships/:membershipId/remove`     | Remove a membership      |

Role updates and membership removal are restricted to authorized owners.

Suspension and reactivation are available to authorized owners and administrators, subject to membership hierarchy restrictions.

Membership mutations are business-scoped and use transactional database operations.

### 3.3 Membership Lifecycle States

| Status      | Meaning                                      |
| ----------- | -------------------------------------------- |
| `pending`   | Membership awaiting activation               |
| `active`    | Membership currently active                  |
| `suspended` | Membership access temporarily disabled       |
| `removed`   | Membership removed from active participation |

Suspended and removed memberships must not authorize protected business operations.

Membership access is evaluated independently for each business.

Removal uses a lifecycle state rather than immediate database deletion.

Ownership transfer is not provided through the standard membership role update endpoint.

### 3.4 Outstanding Membership Functionality

The following functionality remains planned:

- Business Membership Administration frontend.
- Membership invitation management screens.
- Secure invitation delivery.
- Comprehensive membership audit logging.
- Verification of last-active-owner safeguards.
- Business onboarding and initial owner provisioning.
- Additional authentication and session hardening.

The backend Phase 2B milestone is complete.

The remaining membership functionality will be delivered through subsequent development workstreams.

---

## 4. Existing Inventory and Dashboard Functionality

### 4.1 Inventory Module

The existing `inventory` module supports business-scoped inventory retrieval.

Implemented frontend functionality includes:

- Inventory listing.
- Search by product name.
- Search by SKU.
- Stock-status filtering.
- Pagination.
- Improved empty states.

The backend provides the business-scoped APIs used by these workflows.

### 4.2 Dashboard Module

The authenticated frontend uses business-scoped dashboard APIs.

The original dashboard implementation read PostgreSQL inventory metrics without completed tenant-isolation verification.

Subsequent development introduced business-scoped dashboard APIs and authenticated workspace integration.

Manual tenant-isolation checks passed in the development environment.

A comprehensive authorization and security audit remains required before production deployment.

### 4.3 Current Inventory Limitations

The existing inventory functionality must not be treated as a complete production inventory management system.

The following capabilities remain planned:

- Auditable stock movement ledger.
- Transactional inventory adjustments.
- Physical, reserved and available stock accounting.
- Order reservations.
- Multiple inventory locations.
- Channel-specific allocations.
- Safety stock buffers.
- Inventory reconciliation.
- Controlled external inventory synchronization.

### 4.4 Inventory Authority

The existing Excel SKU workbook remains the authoritative inventory source.

Historical inventory records in PostgreSQL do not establish that Commerce Hub has become the production inventory authority.

The planned authority transfer requires:

1. Verified inventory domain implementation.
2. Validated Excel migration.
3. Inventory reconciliation.
4. Operational readiness.
5. Explicit production cutover approval.

No source-of-truth transfer is authorized by this README.

---

## 5. Approved Future Inventory Architecture

**Status:** Planned. Not implemented.

The next engineering milestone will establish the production inventory and order management foundation.

The immediate first activity is an existing-codebase gap analysis.

The following sections describe approved architectural requirements rather than completed API functionality.

### 5.1 Inventory Domain

The production inventory model must distinguish:

- Physical stock.
- Reserved stock.
- Available stock.
- Safety stock buffers.
- Channel-allocated stock.
- Unallocated stock.

These quantities must have precise definitions and consistent calculation rules.

Safety stock buffers and channel allocations must not be deducted twice.

### 5.2 Inventory Movement Ledger

The planned inventory ledger must support auditable movements such as:

- Opening balance.
- Stock receipt.
- Manual adjustment.
- Order reservation.
- Reservation release.
- Order fulfillment.
- Return receipt.
- Damaged stock adjustment.
- Inventory correction.
- Location transfer when implemented.

Each movement must include appropriate business, variant, location, quantity, reference, actor and timestamp information.

### 5.3 Transaction Safety

Inventory mutations must support:

- Atomic database transactions.
- Concurrency protection.
- Idempotency.
- Prevention of duplicate stock deductions.
- Prevention of unauthorized negative inventory.
- Tenant-scoped authorization.
- Audit history.
- Recovery from partial failures.

### 5.4 Multiple Inventory Locations

The inventory domain must support multiple locations from the outset.

Fimonaa India will initially use one default inventory location.

Each location must belong to a verified business.

Inventory quantities must be tracked separately by location.

Future location transfers and external channel location mappings must be supported without redesigning the core inventory model.

### 5.5 Fixed Channel Allocations

Fixed channel-specific inventory allocations are the approved initial production strategy.

For example, if a variant has four eligible available units:

| Channel | Allocation |
| ------- | ---------: |
| Myntra  |          3 |
| Shopify |          1 |
| Total   |          4 |

Authorized business users must eventually be able to:

- View channel allocations.
- Adjust allocations.
- Review unallocated inventory.
- Review pending synchronization.
- Review confirmed external quantities.
- Identify discrepancies.

Allocations must not exceed eligible inventory.

### 5.6 Safety Stock Buffers

The planned architecture must support configurable safety stock buffers.

Potential configuration levels include:

- Business.
- SKU or variant.
- Sales channel.

Configuration precedence must be defined during implementation.

Safety buffers must reduce externally offered inventory according to approved business rules without introducing double deductions.

### 5.7 Synchronization-Aware Allocation Changes

The system must account for external synchronization delays.

Inventory removed from one channel must not automatically become available to another channel while conflicting external quantities remain unresolved.

Pending and failed synchronization states must be visible.

### 5.8 Future Allocation Strategies

The following are future enhancements:

- Shared inventory pools.
- Dynamic channel allocations.
- Demand-based allocation recommendations.
- Automated inventory rebalancing.

They are outside the initial production scope.

---

## 6. Planned Centralized Order Management

**Status:** Planned. Not implemented.

### 6.1 Objective

Commerce Hub will provide a centralized order management foundation for orders originating from connected sales channels.

Potential order sources include:

- Commerce Hub.
- Shopify.
- Myntra, subject to technical feasibility.
- Physical retail stores.
- Other approved marketplaces.

### 6.2 Order Domain

The proposed order model must support:

- Business ownership.
- Internal order identifiers.
- External channel references.
- Order source.
- Order items.
- Internal SKU and variant mappings.
- Order quantities.
- Inventory location.
- Reservation references.
- Order lifecycle.
- Fulfillment information.
- Cancellation and return information.
- Processing status.
- Synchronization status.

### 6.3 Order Lifecycle

The planned lifecycle should account for:

- Order received.
- Validation.
- Inventory reservation.
- Processing.
- Packed.
- Dispatched.
- Fulfilled.
- Cancelled.
- Returned.
- Exception handling.

Exact lifecycle transitions must be defined during implementation design.

External marketplace statuses must be mapped carefully without losing their original meaning.

### 6.4 Inventory Reservations

Orders must reserve eligible inventory through transactional operations.

Reservations must:

- Respect available stock.
- Respect channel allocations.
- Respect safety stock rules.
- Prevent duplicate deductions.
- Prevent overselling.
- Support cancellation handling.
- Support failure recovery.

### 6.5 Cancellations and Returns

Cancellation handling must account for the actual fulfillment state.

Returned stock must not automatically become available for sale.

Future return workflows should support inspection and disposition, including:

- Sellable inventory.
- Damaged inventory.
- Quarantined inventory.
- Rejected returns.

### 6.6 Invoice Architecture

Shopify will continue to handle invoice generation for existing Shopify workflows during the initial implementation.

Commerce Hub must not assume that Shopify can generate invoices for orders originating from other sales channels.

The order architecture should remain extensible for future native invoice generation, tax calculations, credit notes and country-specific compliance requirements.

---

## 7. Planned External Channel Integrations

**Status:** Planned. No live inventory synchronization is enabled.

### 7.1 Integration Strategy

Commerce Hub will eventually become the authoritative inventory system after an approved production cutover.

Connected sales channels will originate orders and receive approved inventory availability updates.

The initial integration priority is Shopify.

Myntra will follow subject to available APIs, technical feasibility and authorized seller permissions.

Other marketplaces may be added through a reusable connector architecture.

### 7.2 Shopify Integration

The planned Shopify integration includes:

- Authorized application setup.
- Secure authentication.
- Product and variant mapping.
- Shopify location mapping.
- Order ingestion.
- Verified webhook processing.
- Idempotent event handling.
- Inventory synchronization.
- Retry handling.
- Reconciliation.
- Operational monitoring.

Initial integration work should prioritize read-only verification.

No Shopify inventory writes may be enabled without explicit authorization.

### 7.3 Myntra Integration

Myntra integration depends on:

- Available seller APIs.
- Authorized credentials.
- Supported order retrieval methods.
- Supported inventory update methods.
- Marketplace fulfillment rules.
- Integration testing.

The implementation must not assume that every required API capability is available.

Alternative workflows may be evaluated separately if direct integration capabilities are restricted.

### 7.4 Additional Marketplace Integrations

Potential future integrations include:

- AJIO.
- AJIOGRAM.
- Nykaa Fashion.
- Other authorized retail channels.

Each connector must respect the capabilities and permissions available to the relevant seller account.

### 7.5 Reusable Connector Architecture

The proposed connector architecture should support common internal contracts for:

- Authentication.
- Product mapping.
- Order ingestion.
- Inventory synchronization.
- Retry processing.
- Reconciliation.
- Monitoring.
- Error reporting.

Channel-specific business rules must remain isolated within their respective adapters.

---

## 8. Planned Background Processing and Synchronization

**Status:** Planned.

### 8.1 Background Processing

Reliable multichannel operations will require background processing infrastructure.

The implementation should support:

- Verified webhook ingestion.
- Idempotent event processing.
- Background jobs.
- Transactional event persistence.
- Retry handling.
- Failure classification.
- Exception queues.
- Operational monitoring.

### 8.2 Transactional Outbox

A transactional outbox or equivalent reliable delivery mechanism should be evaluated to prevent inventory changes and external synchronization events from silently diverging.

### 8.3 Synchronization Status

The system must distinguish:

- Internal authoritative quantity.
- Desired external quantity.
- Last confirmed external quantity.
- Pending synchronization.
- Failed synchronization.
- Reconciliation discrepancies.

### 8.4 Failure Scenarios

The architecture must account for:

- Duplicate webhooks.
- Delayed events.
- Out-of-order events.
- Temporary channel outages.
- Network failures.
- API rate limits.
- Concurrent orders.
- Partial synchronization failures.
- Conflicting inventory updates.

### 8.5 Operational Monitoring

Authorized users should eventually be able to review:

- Pending synchronization.
- Failed updates.
- Repeated retry failures.
- Inventory discrepancies.
- Channels requiring intervention.

The operational interface must distinguish internal inventory authority from quantities confirmed by external channels.

---

## 9. Planned API Modules and Capabilities

The following table describes proposed future backend capabilities.

**Important:** These module names and responsibilities are architectural proposals. They are not evidence that corresponding modules or endpoints currently exist.

| Proposed module or capability | Planned responsibility                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| `catalog`                     | Internal products, variants, SKU mappings and catalogue management |
| Inventory ledger              | Auditable stock movements and transactional adjustments            |
| Inventory locations           | Business-scoped inventory locations and location-specific stock    |
| Inventory reservations        | Transactional order reservations and releases                      |
| Channel allocations           | Fixed channel-specific inventory allocation management             |
| Safety stock                  | Configurable inventory buffers                                     |
| `channels`                    | External channel configuration and integration orchestration       |
| `orders`                      | Business-scoped orders and order items                             |
| `fulfillment`                 | Dispatch, fulfillment and return workflows                         |
| `sync`                        | Synchronization, retries, reconciliation and checkpoints           |
| `audit`                       | Operational audit records and change history                       |
| `shopify-auth`                | Approved Shopify authentication flow                               |
| `shopify-webhooks`            | Verified Shopify webhook processing                                |
| Background processing         | Reliable asynchronous event and job processing                     |
| Integration monitoring        | Synchronization status, failures and operational alerts            |

Final module boundaries must be determined through the existing-codebase gap analysis.

Do not introduce duplicate modules or entities without reviewing existing implementations.

### 9.1 Additional Planned Backend Work

Further work within existing modules includes:

- Authentication hardening.
- Session management.
- Secure invitation delivery.
- Comprehensive membership audit logging.
- Last-active-owner safeguards.
- Business onboarding.
- Initial owner provisioning.
- Inventory authorization.
- Endpoint security audits.
- Tenant-isolation audits.

---

## 10. Existing Database Migrations

Eight TypeORM migrations are implemented in the repository.

Phase 2B introduced the following migrations.

### 10.1 Migration 7: Business Membership Lifecycle

Adds:

- Membership lifecycle status.
- Update timestamps.
- Removal timestamps.
- Supporting database constraints.

### 10.2 Migration 8: Business Membership Invitations

Introduces:

- Business membership invitation table.
- Token hash uniqueness.
- Invitation lifecycle timestamps.
- Business relationships.
- Integrity constraints.

### 10.3 Migration Safety

The presence of migrations in source control does not confirm their deployment to the protected database.

Database migration execution requires separate authorization and deployment verification.

Future inventory and order management migrations must undergo:

1. Schema review.
2. Tenant-isolation review.
3. Data preservation review.
4. Development database verification.
5. Isolated integration testing.
6. Backup and recovery planning.
7. Explicit production authorization.

No new database migration is authorized by this documentation update.

---

## 11. Development Database Safety

Database safety is mandatory throughout development.

### 11.1 Database Environments

| Database                       | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `fimonaa_commerce`             | Protected database containing historical inventory records |
| `fimonaa_commerce_dev`         | Approved local development database                        |
| `fimonaa_commerce_import_test` | Isolated integration-test database                         |

### 11.2 Protected Database

**Protected database:** `fimonaa_commerce`

Do not execute the following against this database without explicit approval:

- Migrations.
- Rollbacks.
- Imports.
- Seeds.
- Destructive SQL.
- Integration tests.
- Inventory adjustments.
- Stock movement operations.
- Other database writes.

### 11.3 Local Development Configuration

Local development must use the Git-ignored configuration file:

`apps/api/.env.development.local`

The guarded development launcher is:

`node apps/api/scripts/run-local-dev.cjs <command>`

Supported commands include:

- `api`
- `migration:show`
- `migration:run`
- `seed:dev-auth`
- `seed:dev-inventory`

The launcher validates the database configuration and prevents accidental execution against unauthorized databases.

Migrations and seeds are database-writing operations and must be reviewed before execution.

The standard `apps/api/.env` file may contain protected database configuration.

It must not be overwritten or used as the default local development environment.

### 11.4 Integration Tests

Integration tests must target only:

`fimonaa_commerce_import_test`

Required database safety assertions must remain enabled.

Development fixtures must never be treated as authoritative Fimonaa inventory.

### 11.5 Inventory Authority

The Excel SKU workbook remains the authoritative inventory source until an approved cutover.

No production opening-balance import, protected-database migration or external inventory write is authorized by the current implementation.

---

## 12. Verification History

### 12.1 Business Membership Management Phase 2B

The completed Phase 2B implementation recorded:

| Verification           | Result     |
| ---------------------- | ---------- |
| Unit tests             | 348 passed |
| Integration tests      | 376 passed |
| Total tests            | 724 passed |
| Test suites            | 50         |
| TypeScript compilation | Passed     |
| ESLint                 | Passed     |
| API build              | Passed     |
| GitHub CI checks       | 2 passed   |

These results belong to the historical backend implementation milestone.

### 12.2 Authenticated Frontend and Business Workspace Integration

The latest recorded development checkpoint includes:

| Verification                 | Result                      |
| ---------------------------- | --------------------------- |
| Backend tests                | 379 passed across 36 suites |
| Development script tests     | 17 passed                   |
| API TypeScript compilation   | Passed                      |
| Manual frontend verification | Passed                      |

Manual verification covered:

- Authenticated workspace access.
- Tenant isolation.
- Inventory searching.
- Stock-status filtering.
- Inventory pagination.

These results are separate from the Phase 2B verification.

They must not be combined or represented as a newly executed comprehensive test run.

### 12.3 Production Readiness

Passing development tests does not establish production readiness.

Additional verification is required for:

- Authorization.
- Tenant isolation.
- Inventory concurrency.
- Order reservations.
- Allocation calculations.
- Safety stock buffers.
- External integrations.
- Synchronization recovery.
- Data migration.
- Production monitoring.
- Backup and restore procedures.

---

## 13. Immediate Next Engineering Milestone

### Production Inventory and Order Management Foundation

**Status:** Approved for planning.

**Implementation status:** Not started.

The next engineering activity is an existing-codebase gap analysis.

### 13.1 Existing-Codebase Review

Inspect:

- Existing product and variant entities.
- SKU identifiers and mappings.
- Inventory tables.
- Existing stock quantity calculations.
- Database migrations.
- Business relationships.
- Tenant-scoped authorization.
- Existing inventory services.
- Order-related code.
- Worker infrastructure.
- Integration scaffolding.

### 13.2 Gap Analysis Deliverables

The review should produce:

1. Existing functionality inventory.
2. Missing functionality assessment.
3. Reusable components.
4. Proposed inventory domain model.
5. Proposed order domain model.
6. Multiple inventory location requirements.
7. Channel allocation requirements.
8. Safety stock requirements.
9. Required database migrations.
10. Security and operational risks.
11. Recommended implementation sequence.
12. First proposed engineering task.

### 13.3 Implementation Approval

The gap analysis must be reviewed before introducing new production inventory or order management database structures.

The first implementation task should be narrowly scoped, testable and compatible with the existing architecture.

No protected-database modifications are authorized.

---

## 14. Future Product Development

The longer-term roadmap includes additional operational capabilities.

### 14.1 Excel Inventory Migration

The existing Excel SKU workbook must be analyzed, validated and reconciled before Commerce Hub becomes the authoritative inventory system.

The migration process must support:

- Source analysis.
- SKU validation.
- Duplicate detection.
- Dry-run imports.
- Error reporting.
- Inventory reconciliation.
- Explicit production cutover approval.

### 14.2 Controlled Production Cutover

Production cutover must require:

- Verified inventory transactions.
- Reliable order reservations.
- Tested channel allocations.
- Safety stock validation.
- Integration readiness.
- Reconciliation.
- Backup and recovery procedures.
- Monitoring.
- Explicit approval.

### 14.3 Fimonaa Finland

Fimonaa Finland is the planned second production business implementation.

The architecture must support independent:

- Business workspaces.
- Inventory.
- Inventory locations.
- Products and variants.
- Orders.
- Sales channels.
- User permissions.
- Country-specific configurations.

Tenant isolation must remain mandatory.

### 14.4 Commercial SaaS Expansion

Future commercial capabilities may include:

- Self-service business onboarding.
- Tenant provisioning.
- Subscription plans.
- Billing.
- Usage limits.
- Workspace administration.
- Integration management.
- Configurable industry-specific product attributes.
- Operational monitoring.
- Support tools.

Commercial SaaS functionality is outside the immediate production inventory foundation scope.

### 14.5 Deferred Product and Variant Image Management

Advanced product and variant image management remains deferred.

The future implementation should support:

- Business-scoped image associations.
- Product and variant image collections.
- Primary image selection.
- Display ordering.
- Secure manual uploads.
- Private object storage.
- Image metadata.
- Authorization and tenant isolation.
- Frontend previews.
- Future authorized Shopify image retrieval.

The proposed image architecture is preserved in Section 21 of `docs/development-documentation_v1.8.md`.

Image management must not delay the immediate production inventory and order management foundation.

---

## 15. Documentation

For complete technical details, refer to the following documentation.

### 15.1 Current Development Documentation

`docs/development-documentation_v1.8.md`

**Status:** In progress.

This version documents the revised product direction, production inventory architecture, multichannel order processing strategy, migration requirements and proposed development roadmap.

### 15.2 Implementation Plan

`docs/IMPLEMENTATION_PLAN.md`

Contains the detailed phased implementation strategy, engineering priorities, acceptance criteria and production safety boundaries.

### 15.3 Latest Merged Documentation

`docs/development-documentation_v1.7.md`

Merged into `main` through PR #13 (`efc1289`).

### 15.4 Historical Documentation

- `docs/development-documentation_v1.6.md`
- `docs/development-documentation_v1.5.md`
- Earlier versioned development documentation.

Historical documentation remains preserved.

### 15.5 Architecture Decisions

Existing architecture decisions include:

- `docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`
- `docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`
- `docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`

New architecture decisions should be recorded through additional ADRs or explicitly reviewed amendments.

---

## 16. Final Implementation Boundaries

This README describes existing API functionality and the approved future backend architecture.

It does not authorize production deployment, protected database modifications or live inventory synchronization.

The following restrictions remain mandatory:

1. The Excel SKU workbook remains authoritative until approved cutover.
2. The protected `fimonaa_commerce` database must not be modified without explicit authorization.
3. Integration tests must use the isolated test database.
4. Development fixtures must remain separate from real inventory.
5. Shopify and marketplace stock writes must remain disabled until approved.
6. External integrations must use authorized capabilities.
7. Tenant isolation must be preserved.
8. Inventory operations must be auditable.
9. Production cutover requires validation, reconciliation and operational approval.
10. Planned functionality must not be represented as implemented.

---

**Fimonaa Commerce Hub**

One inventory. Every sales channel. Complete control.

**Latest merged milestone:** Authenticated Frontend and Business Workspace Integration, PR #13.

**Next engineering milestone:** Production Inventory and Order Management Foundation.

**Immediate next activity:** Existing-codebase gap analysis.

**Documentation version:** v1.8, in progress.

**Production status:** Not production ready.
