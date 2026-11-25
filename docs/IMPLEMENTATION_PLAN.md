# Fimonaa Commerce Hub Implementation Plan

## 1. Purpose and Product Direction

Fimonaa Commerce Hub is an inventory-first, multitenant commerce operations platform designed to help small and growing retail businesses manage inventory, products, orders and sales channels from a centralized system.

**Product vision:** One inventory. Every sales channel. Complete control.

The platform is being developed initially for Fimonaa India, followed by Fimonaa Finland, with the longer-term objective of offering a configurable SaaS solution to independent retailers across fashion, jewellery, home décor and other retail categories.

The primary business objective is to eliminate fragmented inventory management across spreadsheets, online stores, marketplaces and physical retail operations.

Commerce Hub will eventually serve as the authoritative inventory system, maintaining accurate stock records while processing orders originating from multiple sales channels.

**Important:** Commerce Hub will become the authoritative inventory system only after an explicitly approved, validated and reconciled production cutover.

Until then, the existing Fimonaa Excel SKU workbook remains the authoritative inventory source.

### 1.1 Core Product Principles

The platform must prioritize:

1. Inventory accuracy and operational reliability.
2. Clear separation between physical, reserved and available stock.
3. Centralized inventory management across sales channels.
4. Fixed channel-specific inventory allocations during initial production implementation.
5. Configurable safety stock buffers.
6. Transaction-based inventory movements and auditability.
7. Reliable order ingestion and stock reservations.
8. Multiple inventory locations.
9. Tenant isolation and role-based authorization.
10. Reliable synchronization, retries and reconciliation.
11. Simple, intuitive interfaces suitable for nontechnical business users.
12. Extensible architecture for future integrations and SaaS adoption.

### 1.2 Approved Inventory Strategy

Commerce Hub will become the central inventory authority after production cutover.

Sales channels such as Shopify, Myntra and physical retail locations will remain order-originating systems.

Commerce Hub will receive orders from connected channels, process inventory reservations and stock movements centrally, and synchronize updated inventory availability to other connected channels.

The initial implementation will use **fixed channel-specific inventory allocations**.

For example, a product variant with four eligible available units may be allocated as follows:

| Sales channel | Allocated quantity |
| ------------- | -----------------: |
| Myntra        |                  3 |
| Shopify       |                  1 |
| Total         |                  4 |

Authorized business users must be able to review and adjust allocations.

The system must prevent allocations from exceeding eligible available inventory and must account for outstanding reservations, safety buffers and unresolved external synchronization operations.

A configurable safety stock buffer will allow businesses to withhold inventory from external channels.

Shared inventory pools and dynamic allocation strategies are future enhancements.

### 1.3 Implementation Status

The approved architecture is a development roadmap.

Production-grade inventory movements, centralized order management, channel allocations, safety stock buffers, live marketplace integrations and inventory synchronization have not yet been implemented.

The existing authenticated frontend, business-scoped inventory functionality and development tooling form the current implementation baseline.

**Production status:** Not production ready.

---

## 2. Current Development Foundation

### 2.1 Current Development Checkpoint: 26 November 2026

Development has progressed beyond the Business Membership Management Phase 2B backend milestone and the authenticated frontend integration milestone.

The authenticated frontend and business workspace implementation was merged into `main` through PR #13 (`efc1289`).

**Latest recorded implementation commit:** `0a1b0ce`.

**Current documentation branch:** `docs/commerce-hub-architecture-v1.8`.

**Documentation status:** Development documentation v1.8 and the accompanying implementation plan updates are in progress. They have not yet been merged into `main`.

### 2.2 Implemented Frontend Functionality

The current frontend implementation includes:

- Typed authenticated API client.
- Authentication context and session management.
- Login page.
- Business workspace selection.
- Authenticated application navigation.
- Tenant-scoped dashboard.
- Inventory listing with name and SKU search.
- Inventory stock-status filtering.
- Inventory pagination.
- Improved inventory empty states.

These capabilities have been merged into `main`.

They do not establish production readiness.

### 2.3 Implemented Backend and Development Tooling

The current backend and development environment include:

- Business-scoped dashboard and inventory APIs.
- Authentication and account activation.
- Business membership management.
- Membership invitations and lifecycle operations.
- Business-scoped authorization.
- Guarded opening-balance import functionality.
- Guarded local development launcher.
- Separate development database configuration.
- Synthetic development authentication fixtures.
- Synthetic development inventory fixtures.

The synthetic inventory dataset contains 45 records across two demonstration businesses, with overlapping SKU identifiers to support tenant-isolation testing.

These fixtures are development-only data and must never be treated as authoritative Fimonaa inventory.

### 2.4 Latest Recorded Verification

The latest recorded development checkpoint includes:

| Verification               | Recorded result             |
| -------------------------- | --------------------------- |
| Backend tests              | 379 passed across 36 suites |
| Development script tests   | 17 passed                   |
| API TypeScript compilation | Passed                      |
| Manual frontend checks     | Passed                      |

Manual frontend verification covered:

- Authenticated workspace access.
- Business isolation.
- Inventory searching by name and SKU.
- Stock-status filtering.
- Inventory pagination.

These results are separate from the historical Phase 2B verification of 724 passing tests.

They must not be combined or represented as a new comprehensive test run.

No new test execution is implied by this documentation update.

### 2.5 Current Implementation Boundaries

The following functionality remains planned:

- Frontend business membership administration.
- Business invitation management screens.
- Business onboarding and provisioning.
- Production-grade inventory transactions.
- Multiple inventory location management.
- Centralized order processing.
- Inventory reservations.
- Channel-specific inventory allocations.
- Safety stock buffers.
- Live Shopify order ingestion.
- Live marketplace integrations.
- Inventory synchronization.
- Production reconciliation and recovery workflows.
- Advanced product and variant image management.

These capabilities must not be represented as implemented until independently verified.

### 2.6 Next Recommended Engineering Milestone

**Production Inventory and Order Management Foundation**

**Status:** Approved for planning. Implementation has not started.

The immediate next engineering activity is an existing-codebase gap analysis.

This analysis will establish which existing components can be extended and which new entities, services, workflows and migrations are required.

The implementation must build on the existing authenticated, tenant-scoped architecture rather than duplicate completed functionality.

---

## 3. Historical Backend Milestone

### 3.1 Business Membership Management Phase 2B

**Historical checkpoint:** 22 November 2026.

The backend Business Membership Management Phase 2B milestone was merged into `main` through PR #11 (`c852d35`).

The development baseline includes:

- Business-scoped inventory authorization through PR #6.
- Authentication and initial invitation lifecycle through PR #7.
- Read-only business membership management through PR #9.
- Expanded membership lifecycle and invitation workflows through PR #11.

### 3.2 Historical Verification

The recorded Phase 2B verification included:

| Verification            | Result |
| ----------------------- | -----: |
| Unit tests              |    348 |
| Unit test suites        |     31 |
| Integration tests       |    376 |
| Integration test suites |     19 |
| Total passing tests     |    724 |
| Total test suites       |     50 |

TypeScript compilation, ESLint, NestJS build and two GitHub checks passed during the implementation milestone.

These checks have not been rerun as part of this documentation update.

### 3.3 Implemented Membership Endpoints

- `GET /api/business-memberships`
- `GET /api/business-memberships/:membershipId`
- `PATCH /api/business-memberships/:membershipId/role`
- `POST /api/business-memberships/:membershipId/suspend`
- `POST /api/business-memberships/:membershipId/reactivate`
- `POST /api/business-memberships/:membershipId/remove`

### 3.4 Implemented Invitation Endpoints

- `POST /api/auth/business-membership-invitations`
- `POST /api/auth/business-membership-invitations/accept`
- `GET /api/auth/business-membership-invitations`
- `GET /api/auth/business-membership-invitations/:invitationId`
- `POST /api/auth/business-membership-invitations/:invitationId/revoke`

### 3.5 Historical Database and Inventory State

The documented migration sequence contains eight TypeORM migrations.

The two latest migrations introduce membership lifecycle fields and a dedicated business membership invitation table.

Both explicitly prohibit automatic rollback.

The historical opening-balance record in the protected PostgreSQL database contained:

- 318 SKUs.
- 2,027 available units.

These figures are historical and must not be represented as verified current inventory totals.

The original dashboard implementation read PostgreSQL inventory metrics without completed tenant-isolation verification.

Subsequent frontend development introduced business-scoped dashboard APIs and workspace integration.

Manual tenant-isolation checks passed in the development environment.

A comprehensive authorization and security audit remains required before production deployment.

### 3.6 Historical Development Priorities

At the Phase 2B checkpoint, the next recommended work included:

- Business Membership Administration UI.
- Authentication hardening.
- Comprehensive audit logging.
- Invitation delivery.
- Endpoint authorization review.
- Production migration verification.

These remain relevant outstanding workstreams.

However, the approved immediate engineering priority is now the Production Inventory and Order Management Foundation.

---

## 4. Safety and Delivery Boundaries

Database safety, tenant isolation and inventory accuracy are mandatory throughout development.

### 4.1 Protected Inventory Authority

The existing Fimonaa Excel SKU workbook remains the authoritative inventory source until an explicitly approved production cutover.

Commerce Hub must not independently replace this authority during development.

The existence of inventory records in PostgreSQL does not establish that Commerce Hub has become the production inventory source of truth.

### 4.2 Protected Database Restrictions

The protected database is:

`fimonaa_commerce`

Do not execute any of the following against this database without explicit authorization:

- Database migrations.
- Imports.
- Seeds.
- Destructive SQL.
- Integration tests.
- Inventory adjustments.
- Stock movement operations.
- Schema modifications.
- Other database-writing operations.

No protected-database operation is authorized by this implementation plan.

### 4.3 Local Database Environments

The project uses three distinct PostgreSQL database environments:

| Database                       | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `fimonaa_commerce`             | Protected database containing historical inventory records |
| `fimonaa_commerce_dev`         | Approved local development database                        |
| `fimonaa_commerce_import_test` | Isolated integration-test database                         |

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

The launcher validates database configuration and prevents accidental execution against unauthorized databases.

Migrations and seeds remain database-writing operations and must be reviewed before execution.

The standard `apps/api/.env` file may contain protected database configuration.

It must not be overwritten or used as the default local development environment.

### 4.4 Integration Test Restrictions

Automated integration tests must target only:

`fimonaa_commerce_import_test`

Required database safety assertions must remain enabled.

Integration tests must not be executed until the target database configuration has been independently verified.

### 4.5 Migration Restrictions

Eight TypeORM migrations are documented in the current source-controlled sequence.

Their presence in Git does not establish that they have been applied to the protected database.

Any future migration must undergo:

1. Schema review.
2. Tenant-isolation review.
3. Data preservation review.
4. Development database verification.
5. Isolated integration testing.
6. Backup and recovery planning.
7. Explicit production authorization.

### 4.6 External Integration Restrictions

Do not enable:

- Live Shopify inventory writes.
- Marketplace stock writes.
- Production inventory synchronization.
- Unauthorized order processing.
- Automatic source-of-truth cutover.

External integrations must remain disabled until their authorization, security, reconciliation and operational requirements have been satisfied.

---

## 5. Implementation Strategy

The implementation will follow a phased approach.

The immediate objective is to establish a reliable production inventory and order management foundation before enabling live external synchronization.

### 5.1 Recommended Delivery Sequence

| Phase | Workstream                                 | Current status            |
| ----- | ------------------------------------------ | ------------------------- |
| 0     | Existing-codebase gap analysis             | Next engineering activity |
| 1     | Inventory domain and transaction ledger    | Planned                   |
| 2     | Multiple inventory locations               | Planned                   |
| 3     | Order management and reservations          | Planned                   |
| 4     | Fixed channel allocations and safety stock | Planned                   |
| 5     | Background processing and reconciliation   | Planned                   |
| 6     | Excel migration preparation and validation | Planned                   |
| 7     | Shopify integration                        | Planned                   |
| 8     | Controlled production cutover              | Planned                   |
| 9     | Myntra integration                         | Subject to feasibility    |
| 10    | Additional operational functionality       | Planned                   |
| 11    | Fimonaa Finland onboarding                 | Future                    |
| 12    | Commercial SaaS expansion                  | Future                    |

This sequence is provisional.

The existing-codebase gap analysis must determine the precise implementation order, dependencies and migration requirements.

No phase is considered complete merely because its architecture has been documented.

### 5.2 Implementation Principles

Each phase must:

1. Reuse existing functionality where appropriate.
2. Preserve tenant isolation.
3. Avoid unauthorized protected-database changes.
4. Introduce migrations incrementally.
5. Include automated tests.
6. Include authorization checks.
7. Define operational failure handling.
8. Provide clear acceptance criteria.
9. Preserve backward compatibility where required.
10. Receive review before proceeding to dependent phases.

---

## 6. Phase 0: Existing-Codebase Gap Analysis

**Status:** Next engineering activity.

**Objective:** Establish an accurate understanding of the current implementation before introducing production inventory and order management functionality.

### 6.1 Repository and Architecture Review

Inspect:

- `apps/api`
- `apps/web`
- `apps/worker`
- `libs/domain`
- `libs/infrastructure`
- Existing TypeORM entities.
- Existing database migrations.
- Existing inventory services.
- Existing authentication and authorization services.
- Existing tests.
- Existing API contracts.
- Existing frontend inventory components.

Do not assume functionality exists solely because a module, entity or directory is present.

### 6.2 Product and Catalogue Review

Determine:

- How products are represented.
- How variants are represented.
- How SKUs are identified.
- How SKU uniqueness is enforced per tenant.
- How sizes and colours are stored.
- Whether barcode fields exist.
- How product and variant status is represented.
- Whether catalogue records can support multiple sales channels.
- Whether external channel identifiers are already modeled.

### 6.3 Inventory Review

Determine:

- Existing inventory tables and relationships.
- Current stock quantity calculations.
- Whether physical and available stock are distinguished.
- Whether reserved stock is represented.
- Whether stock movements are recorded.
- Whether adjustments are auditable.
- Whether multiple inventory locations are supported.
- Whether concurrent inventory updates are protected.
- Whether existing inventory data can be migrated safely.

### 6.4 Order and Integration Review

Determine:

- Whether internal order entities exist.
- Whether order items map to internal variants.
- Whether order status transitions are modeled.
- Whether reservation logic exists.
- Whether idempotency controls exist.
- Whether background processing infrastructure exists.
- Whether webhook handling is implemented.
- Whether synchronization status and retries are supported.

### 6.5 Security Review

Verify:

- Tenant-scoped queries.
- Business membership authorization.
- Inventory mutation permissions.
- Cross-business access prevention.
- API input validation.
- Audit logging requirements.
- Database environment isolation.

### 6.6 Deliverables

The gap analysis must produce:

1. Existing functionality inventory.
2. Missing functionality assessment.
3. Entity and database relationship review.
4. Proposed inventory domain model.
5. Proposed order domain model.
6. Proposed channel allocation model.
7. Migration requirements.
8. Implementation dependencies.
9. Security and operational risks.
10. Recommended first implementation task.

### 6.7 Acceptance Criteria

Phase 0 is complete when:

- Existing functionality has been verified against source code.
- Missing capabilities are documented.
- Proposed changes have been reviewed for compatibility.
- Database safety requirements are confirmed.
- The implementation sequence has been approved.

---

## 7. Phase 1: Production Inventory Domain and Ledger

**Status:** Planned.

### 7.1 Objective

Establish an auditable inventory model capable of supporting accurate stock operations across multiple sales channels.

### 7.2 Inventory Quantities

The inventory model must distinguish:

- Physical stock.
- Reserved stock.
- Available stock.
- Safety stock buffer.
- Channel-allocated stock.
- Unallocated stock.

These quantities must have precise definitions.

Physical stock represents units physically held at an inventory location.

Reserved stock represents units committed to orders or other approved reservations.

Available stock represents units eligible for further commitment after accounting for applicable reservations and inventory rules.

Safety stock buffers reduce quantities offered for sale through designated channels.

Channel allocations determine how eligible inventory is distributed across connected sales channels.

**Important:** Channel allocations and safety stock buffers must not be treated as additional physical inventory or deducted twice.

### 7.3 Inventory Ledger

Implement an auditable stock movement ledger.

Supported movement types should include:

- Opening balance.
- Stock receipt.
- Manual adjustment.
- Order reservation.
- Reservation release.
- Order fulfillment.
- Return receipt.
- Damaged stock adjustment.
- Inventory correction.
- Location transfer, when enabled.

Each movement must record appropriate:

- Business identifier.
- Product variant or SKU identifier.
- Inventory location.
- Movement type.
- Quantity.
- Reference entity.
- Actor or system source.
- Timestamp.
- Audit metadata.

### 7.4 Transaction Safety

Inventory operations must support:

- Atomic database transactions.
- Concurrency protection.
- Prevention of negative eligible stock.
- Idempotent processing.
- Validation of authorized mutations.
- Recovery from partial failures.

### 7.5 Acceptance Criteria

The phase is complete when:

1. Inventory quantities have documented definitions.
2. Stock movements are auditable.
3. Concurrent operations cannot allocate the same eligible unit twice.
4. Duplicate operations do not cause duplicate deductions.
5. Tenant isolation is verified.
6. Automated tests cover stock invariants and failure scenarios.

---

## 8. Phase 2: Multiple Inventory Locations

**Status:** Planned.

### 8.1 Objective

Support inventory management across multiple physical locations.

Fimonaa India will initially use one default inventory location.

However, the core data model must support multiple locations from the outset.

### 8.2 Location Model

Each location should support:

- Business ownership.
- Unique location identifier.
- Location name.
- Active or inactive status.
- Inventory quantities by SKU or variant.
- Authorized operational access.
- External channel location mappings where applicable.

### 8.3 Location-Specific Inventory

The system must track physical, reserved and available stock separately for each location.

Inventory from different locations must not be combined into a sellable quantity unless an approved allocation or fulfillment rule permits it.

### 8.4 Future Transfers

Location transfers are a later operational capability.

Their data model must account for:

- Source location.
- Destination location.
- Quantity.
- Transfer status.
- Dispatch and receipt events.
- Audit history.

### 8.5 Acceptance Criteria

The phase is complete when:

- Inventory records are location-aware.
- A default location can support Fimonaa India.
- Tenant isolation is preserved.
- Location-specific stock calculations are tested.
- Future multi-location expansion does not require redesigning the inventory authority model.

---

## 9. Phase 3: Centralized Order Management

**Status:** Planned.

### 9.1 Objective

Establish a centralized order management foundation that can process orders originating from different sales channels.

### 9.2 Order Sources

The architecture must support orders originating from:

- Commerce Hub.
- Shopify.
- Myntra, where integration is available.
- Physical retail stores.
- Future connected marketplaces.
- Other approved business channels.

### 9.3 Order Data Model

An order should record:

- Business identifier.
- Internal order identifier.
- External channel identifier.
- External order reference.
- Order source.
- Order status.
- Order items.
- Internal SKU or variant mappings.
- Quantities.
- Applicable inventory location.
- Reservation references.
- Fulfillment information.
- Cancellation and return information.
- Relevant timestamps.
- Processing and synchronization status.

### 9.4 Order Lifecycle

The architecture must support appropriate states for:

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

The exact lifecycle must be finalized during implementation design.

Marketplace-specific states must be mapped carefully without losing their original meaning.

### 9.5 Inventory Reservations

When an order is accepted for processing, Commerce Hub must reserve eligible stock according to the relevant channel allocation and inventory rules.

Reservations must:

- Be transactional.
- Prevent duplicate deductions.
- Respect channel allocations.
- Respect safety stock buffers.
- Prevent overselling.
- Support controlled release on cancellation.
- Support reconciliation after failures.

### 9.6 Returns and Cancellations

Cancellation must release or reverse inventory commitments according to the order's actual fulfillment state.

Returned inventory must not automatically become sellable.

The system must support inspection and disposition rules, including:

- Sellable return.
- Damaged return.
- Quarantined inventory.
- Rejected return.

### 9.7 Invoice Architecture

Shopify will remain responsible for invoice generation in existing Shopify workflows during the initial implementation.

Commerce Hub must not assume Shopify can issue invoices for orders originating from other channels.

The internal order architecture should remain extensible for future native invoicing, tax calculations, credit notes and country-specific compliance.

### 9.8 Acceptance Criteria

The phase is complete when:

1. Orders can be represented independently of their originating channel.
2. Order items map reliably to internal variants.
3. Reservations are transactional.
4. Duplicate order events do not duplicate stock movements.
5. Cancellations and returns follow controlled inventory rules.
6. Tenant isolation is verified.
7. Order lifecycle tests cover normal and exceptional scenarios.

---

## 10. Phase 4: Channel Allocations and Safety Stock

**Status:** Planned.

### 10.1 Objective

Allow businesses to distribute available inventory across sales channels while minimizing overselling risk.

### 10.2 Fixed Channel Allocations

Fixed channel allocations are the approved initial strategy.

For example:

| Inventory measure      | Quantity |
| ---------------------- | -------: |
| Physical stock         |        5 |
| Reserved stock         |        1 |
| Available stock        |        4 |
| Safety buffer          |        1 |
| Eligible channel stock |        3 |
| Myntra allocation      |        2 |
| Shopify allocation     |        1 |

The example illustrates the intended separation of inventory concepts.

The final calculation rules must be explicitly defined and tested during implementation.

### 10.3 Allocation Controls

Authorized users must be able to:

- View eligible inventory.
- View allocations by channel.
- Adjust channel allocations.
- View unallocated inventory.
- View pending synchronization.
- View confirmed external quantities.
- Identify discrepancies.

Allocation changes must not exceed eligible available inventory.

### 10.4 Safety Stock Buffers

The architecture should support configurable safety stock buffers.

Potential configuration levels include:

- Business.
- SKU or variant.
- Sales channel.

Configuration precedence must be explicitly defined.

Buffers must not create inconsistent inventory calculations or double deductions.

### 10.5 Synchronization-Aware Reallocation

Inventory must not be offered to another channel while a conflicting external update remains unresolved.

For example, reducing an allocation on Shopify does not immediately make those units safely available to Myntra if Shopify has not confirmed the reduction.

The system must track pending changes and prevent unsafe redistribution.

### 10.6 Future Allocation Strategies

Future capabilities may include:

- Shared inventory pools.
- Dynamic allocations.
- Demand-based allocation recommendations.
- Channel priority rules.
- Automated rebalancing.

These are outside the initial production scope.

### 10.7 Acceptance Criteria

The phase is complete when:

1. Allocations respect eligible stock.
2. Safety buffers are consistently applied.
3. Pending external updates prevent unsafe reallocations.
4. Authorized users can review allocation status.
5. Allocation changes are auditable.
6. Concurrent changes are protected.
7. Automated tests cover overselling and synchronization-delay scenarios.

---

## 11. Phase 5: Background Processing and Synchronization Reliability

**Status:** Planned.

### 11.1 Objective

Provide reliable infrastructure for processing external events and synchronizing inventory across connected channels.

### 11.2 Event Processing

The architecture should support:

- Verified webhook ingestion.
- Idempotent event handling.
- Background jobs.
- Transactional event persistence.
- Retry processing.
- Failure classification.
- Dead-letter or exception handling.
- Operational monitoring.

### 11.3 Reliability Requirements

The implementation must account for:

- Duplicate webhooks.
- Delayed events.
- Out-of-order events.
- Temporary channel outages.
- Network failures.
- Rate limits.
- Concurrent orders.
- Partial synchronization failures.
- Conflicting inventory updates.

### 11.4 Transactional Outbox

Where required, a transactional outbox or equivalent reliable delivery mechanism should ensure that inventory changes and synchronization events cannot silently diverge.

### 11.5 Synchronization Status

The system must distinguish:

- Internal authoritative quantity.
- Desired external quantity.
- Last confirmed external quantity.
- Pending synchronization.
- Failed synchronization.
- Reconciliation discrepancy.

### 11.6 Operational Visibility

Authorized users should be able to identify:

- Failed synchronization operations.
- Pending updates.
- Repeated retry failures.
- Inventory discrepancies.
- Channels requiring attention.

### 11.7 Acceptance Criteria

The phase is complete when:

1. Duplicate events are safely handled.
2. Failed operations can be retried.
3. Inventory changes remain auditable.
4. Synchronization failures are visible.
5. Recovery procedures are documented.
6. Reconciliation tests cover delayed and conflicting updates.

---

## 12. Phase 6: Excel SKU Workbook Migration

**Status:** Planned.

### 12.1 Objective

Prepare a safe migration from the existing Fimonaa Excel SKU workbook to Commerce Hub.

The workbook remains authoritative until production cutover.

### 12.2 Source Analysis

The migration process must inspect the actual workbook structure.

Relevant fields may include:

- SKU.
- Product name.
- Variant.
- Size.
- Colour.
- Barcode.
- Stock quantity.
- Product status.
- Other catalogue attributes.

The exact field mapping must be based on verified workbook data.

Missing or ambiguous information must not be invented.

### 12.3 Data Validation

The migration process must identify:

- Duplicate SKUs.
- Missing identifiers.
- Invalid quantities.
- Inconsistent sizes or colours.
- Missing product relationships.
- Conflicting barcode information.
- Unsupported values.
- Records requiring manual review.

### 12.4 Import Strategy

The migration should support:

1. Read-only workbook analysis.
2. Mapping validation.
3. Dry-run import.
4. Error reporting.
5. Controlled development database testing.
6. Inventory reconciliation.
7. Explicit approval before production execution.

### 12.5 Reconciliation

Imported inventory must be reconciled against the approved source workbook.

Reconciliation must include:

- SKU counts.
- Variant counts.
- Stock quantities.
- Duplicate detection.
- Missing records.
- Unexpected records.
- Location assignments.
- Unresolved discrepancies.

### 12.6 Production Cutover Preparation

The cutover plan must define:

- Approved source snapshot.
- Operational freeze or controlled transition window.
- Final reconciliation.
- Backup and recovery procedures.
- Integration enablement sequence.
- Responsible approvers.
- Monitoring.
- Rollback or recovery procedures.
- Post-cutover validation.

### 12.7 Acceptance Criteria

Migration preparation is complete when:

1. Workbook structure is verified.
2. Data mapping is documented.
3. Validation rules are tested.
4. Dry-run results are reviewed.
5. Reconciliation discrepancies are resolved.
6. Production cutover procedures are approved.

**Completion of migration preparation does not authorize production cutover.**

---

## 13. Phase 7: Shopify Integration

**Status:** Planned.

### 13.1 Objective

Establish Shopify as the first external sales channel integration.

### 13.2 Initial Integration Capabilities

The proposed integration includes:

- Authorized Shopify application setup.
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

### 13.3 Read-Only Integration Stage

The initial integration stage should prioritize read-only verification.

This may include:

- Product retrieval.
- Variant retrieval.
- External identifier mapping.
- Order retrieval where authorized.
- Inventory comparison.
- Integration permission verification.

No live inventory writes are authorized during this stage.

### 13.4 Inventory Synchronization

After the required architecture, testing and operational controls have been approved, Shopify inventory synchronization may be enabled through a separately authorized rollout.

Synchronization must respect:

- Internal authoritative inventory.
- Channel allocations.
- Safety stock buffers.
- Shopify location mappings.
- Pending external updates.
- Retry and reconciliation rules.

### 13.5 Security Requirements

Shopify OAuth, webhook verification and live integration credentials must be configured and tested before use.

Required scopes must be reviewed against the actual integration design.

Proposed scopes in existing scaffolding are not automatically approved.

Client secrets and access tokens must remain outside frontend code and Git.

### 13.6 Acceptance Criteria

The integration is ready for controlled rollout only when:

1. Required permissions are verified.
2. Product and variant mappings are accurate.
3. Order ingestion is idempotent.
4. Inventory synchronization respects allocations.
5. Failure recovery is tested.
6. Reconciliation is operational.
7. Monitoring is available.
8. Explicit rollout approval has been granted.

---

## 14. Phase 8: Controlled Production Cutover

**Status:** Planned. Not authorized.

### 14.1 Objective

Transfer inventory authority from the Excel SKU workbook to Commerce Hub through a controlled, validated and approved process.

### 14.2 Cutover Preconditions

The cutover must not proceed until:

- Inventory transactions are reliable.
- Order reservations are verified.
- Channel allocations are tested.
- Safety stock calculations are validated.
- Relevant integrations are operationally ready.
- Migration reconciliation is complete.
- Backup and recovery procedures are verified.
- Authorization and tenant-isolation reviews are complete.
- Monitoring is operational.
- Explicit approval has been obtained.

### 14.3 Cutover Execution

The approved execution plan must define:

1. Final authoritative inventory snapshot.
2. Operational transition window.
3. Final data import.
4. Inventory reconciliation.
5. Channel allocation initialization.
6. Controlled synchronization enablement.
7. Monitoring and discrepancy handling.
8. Post-cutover acceptance.

### 14.4 Recovery Planning

A recovery plan must address:

- Failed imports.
- Incorrect stock quantities.
- Integration outages.
- Duplicate orders.
- Synchronization discrepancies.
- Unexpected stock movements.
- Partial cutover failure.

### 14.5 Acceptance Criteria

The cutover is complete only when:

1. Inventory authority has been explicitly transferred.
2. Reconciliation has been accepted.
3. Approved integrations operate correctly.
4. Monitoring confirms expected behavior.
5. Operational ownership is established.
6. Final acceptance is recorded.

Until that point, the Excel SKU workbook remains authoritative.

---

## 15. Phase 9: Myntra and Additional Marketplace Integrations

**Status:** Planned, subject to feasibility.

### 15.1 Myntra Integration

Myntra is the next planned marketplace integration after Shopify.

Implementation depends on:

- Available seller APIs.
- Partner permissions.
- Authorized credentials.
- Supported order retrieval methods.
- Supported inventory update methods.
- Marketplace fulfillment rules.
- Integration testing.

The implementation must not assume that Myntra provides every required API capability.

Where direct APIs are unavailable, alternative workflows must be evaluated separately.

### 15.2 Other Marketplaces

Potential future integrations include:

- AJIO.
- AJIOGRAM.
- Nykaa Fashion.
- Other authorized retail channels.

Each connector must use only capabilities permitted for the relevant seller account.

### 15.3 Reusable Connector Architecture

Marketplace integrations should share common internal contracts for:

- Authentication.
- Product mapping.
- Order ingestion.
- Inventory synchronization.
- Retry handling.
- Reconciliation.
- Monitoring.
- Error reporting.

Channel-specific rules must remain isolated within their respective adapters.

### 15.4 Acceptance Criteria

A marketplace connector is considered operational only after:

1. Technical feasibility is verified.
2. Required permissions are obtained.
3. Order mapping is validated.
4. Inventory synchronization rules are tested.
5. Failure handling is verified.
6. Operational approval is granted.

---

## 16. Phase 10: Additional Operational Functionality

**Status:** Planned.

The following capabilities remain important development priorities.

### 16.1 Business Membership Administration

Implement frontend workflows for:

- Membership listing.
- Membership details.
- Role management.
- Suspension.
- Reactivation.
- Removal.
- Invitation creation.
- Invitation management.

All actions must preserve existing backend authorization rules.

### 16.2 Business Onboarding

Implement:

- Business creation and provisioning.
- Initial owner assignment.
- Workspace setup.
- Business settings.
- Default inventory location creation.
- Authorized user management.

### 16.3 Security Hardening

Complete:

- Authentication review.
- Session management review.
- Endpoint authorization audit.
- Tenant-isolation verification.
- Input validation review.
- Credential management review.
- Audit logging.

### 16.4 Operational Readiness

Implement and verify:

- Monitoring.
- Structured error reporting.
- Backup procedures.
- Restore testing.
- Deployment procedures.
- Incident response.
- Operational documentation.

### 16.5 Product and Variant Image Management

Advanced image management remains deferred.

The future implementation should support:

- Business-scoped product and variant image associations.
- Multiple images per product and variant.
- Primary image selection.
- Display ordering.
- Secure manual uploads.
- Private object storage.
- Image metadata.
- Authorization and tenant isolation.
- Frontend previews.
- Future authorized Shopify image retrieval.

The proposed architecture is preserved in Section 21 of `docs/development-documentation_v1.8.md`.

Image management must not delay the immediate production inventory and order management foundation.

---

## 17. Phase 11: Fimonaa Finland Onboarding

**Status:** Future.

Fimonaa Finland is the planned second production business implementation.

The architecture must support independent business workspaces with strict tenant isolation.

### 17.1 Operational Requirements

Future onboarding must evaluate:

- Business-specific inventory.
- Inventory locations.
- Product and variant catalogues.
- Sales channels.
- Currency.
- Tax requirements.
- Invoicing requirements.
- User permissions.
- Country-specific operational rules.

### 17.2 Tenant Isolation

Fimonaa India and Fimonaa Finland must not share inventory records, orders or business-sensitive data unless an explicitly designed and authorized cross-business workflow permits it.

### 17.3 Acceptance Criteria

Finland onboarding must demonstrate:

1. Independent inventory authority.
2. Independent business membership.
3. Independent orders.
4. Correct country-specific configuration.
5. Verified tenant isolation.
6. Operational readiness.

---

## 18. Phase 12: Commercial SaaS Expansion

**Status:** Future.

The long-term objective is to offer Commerce Hub to other small and growing retail businesses.

### 18.1 Target Businesses

Potential customer categories include:

- Fashion retailers.
- Jewellery businesses.
- Home décor retailers.
- Independent boutiques.
- Other inventory-based retail businesses.

### 18.2 Configurable Product Attributes

The product architecture should support future industry-specific attributes without requiring a separate application for each retail category.

Potential examples include:

- Clothing sizes and colours.
- Jewellery materials and dimensions.
- Home décor dimensions and finishes.
- Category-specific product attributes.

The exact approach must be designed and validated before implementation.

### 18.3 SaaS Administration

Future capabilities may include:

- Self-service business onboarding.
- Tenant provisioning.
- Subscription plans.
- Billing.
- Usage limits.
- Workspace administration.
- Integration management.
- Operational monitoring.
- Support tools.

### 18.4 Commercial Readiness

Commercial availability requires:

- Security review.
- Data isolation verification.
- Reliable deployment.
- Backup and recovery procedures.
- Monitoring.
- Support processes.
- Tenant lifecycle management.
- Billing and subscription controls.
- Documentation.
- Operational acceptance.

Commercial SaaS functionality is outside the immediate production inventory foundation scope.

---

## 19. Historical Six-Milestone Implementation Plan

The following section preserves the original six operational workstreams for historical continuity.

These workstreams have been reorganized into the phased roadmap above.

Their presence in the historical plan does not establish implementation completion.

### Historical Milestone 1: Application Foundation

Original objectives:

- Keep the existing dashboard working while extracting shared layout and feature code.
- Centralize frontend API configuration and error handling.
- Add environment validation and database migrations before expanding the schema.
- Add automated tests for core inventory calculations and import safety.

**Current interpretation:** Parts of the application foundation have been implemented, including authentication, business workspaces, tenant-scoped inventory functionality and guarded development tooling. Remaining requirements must be verified during the codebase gap analysis.

### Historical Milestone 2: Inventory Operations

Original objectives:

- Build a searchable, filterable, sortable and paginated SKU inventory view.
- Verify database columns and opening-balance provenance.
- Define stock movement records.
- Implement transactional stock adjustments.
- Track physical, reserved and available inventory.
- Add idempotency, audit history and reconciliation.
- Avoid unauthorized opening-balance imports and external stock writes.

**Current interpretation:** Inventory search, filtering and pagination have been implemented. Production inventory transactions, reservations and reconciliation remain planned.

### Historical Milestone 3: Internal Catalogue

Original objectives:

- Define internal product and variant records.
- Maintain SKU mappings.
- Support size, colour, barcode and product status.
- Preserve the Excel workbook during transition.
- Introduce internal catalogue authority only after validation.

The original plan subsequently proposed Product and Variant Image Management as the next development deliverable.

That proposal included:

- Business-scoped image associations.
- Multiple images per product and variant.
- Primary image selection.
- Display ordering.
- Secure manual uploads.
- Private object storage.
- Image metadata and source attribution.
- Backend authorization.
- Frontend image previews.
- Future read-only Shopify image retrieval.
- Image lifecycle management.
- Automated security and tenant-isolation tests.

**Current interpretation:** The catalogue remains part of the production foundation, while advanced image management has been deferred.

The historical image management proposal remains documented in detail in development documentation v1.8.

### Historical Milestone 4: Read-Only Channel Integrations

Original objectives:

- Confirm Shopify store details and application setup.
- Implement secure authentication.
- Verify webhooks.
- Support pagination, checkpoints and duplicate-event handling.
- Import and reconcile approved product, variant and order data.
- Avoid unauthorized Shopify inventory modifications.
- Obtain authorized seller API documentation for marketplaces.

**Current interpretation:** Read-only integration remains an appropriate initial verification stage before enabling controlled synchronization.

### Historical Milestone 5: Orders, Fulfillment and Returns

Original objectives:

- Build a unified order view.
- Implement SKU mapping.
- Track reservations.
- Track processing and dispatch.
- Handle cancellations and returns.
- Record auditable inventory movements.
- Respect marketplace-specific fulfillment rules.

**Current interpretation:** Centralized order management has become a core prerequisite for reliable multichannel inventory synchronization.

### Historical Milestone 6: Controlled Synchronization and Operations

Original objectives:

- Test channel adapters independently.
- Keep stock writes disabled until approved.
- Add per-channel enablement.
- Implement retries and error queues.
- Introduce reconciliation.
- Add monitoring, backups and restore testing.
- Establish production rollout procedures.

**Current interpretation:** Synchronization reliability and operational controls are mandatory prerequisites for live integration enablement and production cutover.

---

## 20. Engineering Quality and Acceptance Requirements

Every implementation phase must meet appropriate quality standards.

### 20.1 Backend Requirements

- TypeScript type safety.
- Clear service responsibilities.
- Tenant-scoped data access.
- Input validation.
- Transaction safety.
- Idempotency where required.
- Auditable state changes.
- Structured error handling.
- Automated tests.

### 20.2 Frontend Requirements

- Clear business workspace context.
- Intuitive navigation.
- Accessible controls.
- Responsive layouts.
- Appropriate loading states.
- Empty states.
- Error handling.
- Permission-aware interfaces.
- Accurate inventory status visibility.

The frontend should remain clean, modern and suitable for everyday business operations.

### 20.3 Inventory Requirements

- Accurate stock calculations.
- No double deductions.
- No unauthorized negative stock.
- Transactional reservations.
- Correct allocation accounting.
- Safety buffer enforcement.
- Reconciliation.
- Auditability.

### 20.4 Integration Requirements

- Verified authentication.
- Authorized permissions.
- Idempotent processing.
- Retry handling.
- Failure monitoring.
- Reconciliation.
- Controlled enablement.
- Recovery procedures.

### 20.5 Security Requirements

- Tenant isolation.
- Role-based authorization.
- Protected credentials.
- Secure API access.
- Audit logging.
- Database safety.
- Production deployment review.

### 20.6 Verification Requirements

Each completed phase should record:

1. Implementation scope.
2. Relevant commits.
3. Automated test results.
4. Manual verification.
5. Database changes.
6. Security considerations.
7. Known limitations.
8. Outstanding work.
9. Acceptance decision.

Historical test results must not be presented as newly executed tests.

---

## 21. Immediate Next Engineering Actions

The next development session should begin with the existing-codebase gap analysis.

### Action 1: Verify the Development Baseline

Confirm:

- Current Git branch.
- Latest merged implementation.
- Repository status.
- Existing development configuration.
- Database safety boundaries.

Do not execute database-writing commands during this verification.

### Action 2: Inspect Existing Domain Models

Review:

- Product entities.
- Variant entities.
- SKU identifiers.
- Inventory entities.
- Existing stock quantity calculations.
- Business relationships.
- Database migrations.

### Action 3: Inspect Existing Inventory Services

Determine:

- Current inventory read behavior.
- Existing mutation capabilities.
- Transaction boundaries.
- Authorization rules.
- Stock adjustment logic.
- Import behavior.

### Action 4: Inspect Order and Worker Infrastructure

Review:

- Existing order-related code.
- Worker workspace.
- Redis configuration.
- Background processing capabilities.
- Integration scaffolding.

### Action 5: Prepare the Gap Analysis Report

Document:

- Existing capabilities.
- Missing capabilities.
- Reusable components.
- Required new entities.
- Required migrations.
- Security risks.
- Operational dependencies.
- Recommended implementation order.

### Action 6: Approve the First Implementation Task

Do not begin database schema modifications until the gap analysis and proposed implementation approach have been reviewed.

The first implementation task should be narrowly scoped, testable and compatible with the existing codebase.

---

## 22. Documentation and Architecture References

### 22.1 Current Development Documentation

`docs/development-documentation_v1.8.md`

**Status:** In progress on `docs/commerce-hub-architecture-v1.8`.

Sections 22 through 25 contain the approved product direction, inventory architecture, multichannel order processing strategy, Excel migration approach and proposed SaaS roadmap.

### 22.2 Latest Merged Documentation

`docs/development-documentation_v1.7.md`

Merged into `main` through PR #13 (`efc1289`).

### 22.3 Historical Documentation

- `docs/development-documentation_v1.6.md`
- `docs/development-documentation_v1.5.md`
- Earlier versioned development documentation.

Historical documentation must be preserved.

### 22.4 Architecture Decisions

- `docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`
- `docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`
- `docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`

Existing architecture decisions must not be silently rewritten.

If the approved future inventory authority requires additional architecture decisions, they should be recorded through new or explicitly reviewed ADRs.

---

## 23. Final Delivery Boundaries

This implementation plan defines the approved development direction.

It does not authorize production deployment, protected database changes, live inventory synchronization or inventory authority transfer.

The following restrictions remain mandatory:

1. The Excel SKU workbook remains authoritative until approved cutover.
2. The protected `fimonaa_commerce` database must not be modified without explicit authorization.
3. Integration tests must use the isolated test database.
4. Development fixtures must remain separate from real inventory.
5. Shopify and marketplace stock writes must remain disabled until approved.
6. Channel integrations must use authorized capabilities.
7. Tenant isolation must be preserved.
8. Inventory operations must be auditable.
9. Production cutover requires validation, reconciliation and operational approval.
10. Planned functionality must not be represented as implemented.

**Current engineering priority:** Production Inventory and Order Management Foundation.

**Immediate next activity:** Existing-codebase gap analysis.

**Initial production business:** Fimonaa India.

**Subsequent business:** Fimonaa Finland.

**Long-term direction:** A configurable, reliable and commercially viable multitenant retail operations SaaS.

---

**Fimonaa Commerce Hub**

One inventory. Every sales channel. Complete control.

**Implementation Plan Status:** Updated for development documentation v1.8.

**Updated:** 26 November 2026.

**Production readiness:** Not production ready.
