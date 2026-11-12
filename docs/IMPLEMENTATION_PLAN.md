# Fimonaa Commerce Hub Implementation Plan

## Current foundation

**Implementation status as of 12 November 2026:** Development baseline includes business-scoped inventory authorization (PR #6), authentication and invitation lifecycle (PR #7), and read-only business membership management (PR #9). The v1.4 documentation milestone was merged through PR #8. The system is not production ready.

**Recorded verification:** 163 unit tests across 23 suites and 96 integration tests across 11 suites (259 total) for the PR #9 milestone. This is historical verification, not a new test execution.

**Implemented membership endpoints:** `GET /api/business-memberships` and `GET /api/business-memberships/:membershipId`. Both require authenticated owner/admin access in the verified business context. They are read-only and do not introduce schema changes.

**Next security and membership work:** Membership provisioning, creation, role changes, removal, last-active-owner safeguards, invitation delivery and redesign, refresh tokens, logout/revocation, password recovery, rate limiting, and an endpoint authorization audit.

- Monorepo with React, TypeScript, Vite and Tailwind CSS frontend.
- NestJS API with PostgreSQL and Redis infrastructure.
- Historical opening-balance record in the protected PostgreSQL database: 318 SKUs and 2,027 available units. These are historical figures, not verified current live totals.
- Dashboard summary reads PostgreSQL inventory metrics; dashboard tenant isolation still requires a separate review.
- External sales channels are not connected. No marketplace stock writes are enabled.

## Safety and delivery boundaries

- The Excel SKU workbook remains the inventory source of truth until an explicitly approved cutover.
- Do not run migrations, imports, seeds, destructive SQL, integration tests, or other writes against the protected `fimonaa_commerce` database without explicit authorization.
- Automated integration tests must target only the isolated `fimonaa_commerce_import_test` database, with safety assertions intact.
- Six TypeORM migrations exist in source control. PR #9 adds none; source control presence does not establish deployment to the protected database.
- The six operational milestones below are planning workstreams. Completion of the authentication and membership milestones does not mark them complete.

## Milestone 1: Application foundation
- Keep the existing dashboard working while extracting shared layout and feature code.
- Centralise frontend API configuration and error handling.
- Add environment validation and database migrations before expanding the schema.
- Add automated tests for core inventory calculations and import safety.

## Milestone 2: Inventory operations
- Build a searchable, filterable, sortable and paginated SKU inventory view.
- Verify the current database columns and opening balance provenance before designing inventory fields.
- Define stock movement records and transactional adjustment operations.
- Track available, reserved and physical stock distinctly where the business rules require it.
- Add idempotency, audit history and reconciliation checks.
- Do not rerun the opening balance import or write stock to external channels as part of this milestone.

## Milestone 3: Internal catalogue
- Define internal product and variant records, SKU mappings, size, colour, barcode and product status.
- Keep the Excel workbook as the catalogue preparation source during the transition.
- Make Commerce Hub the internal source of truth only after catalogue workflows and validation are ready.

## Milestone 4: Read-only channel integrations
- Confirm Shopify store details and app setup.
- Implement secure authentication, verified webhooks, pagination, checkpoints and duplicate-event handling.
- Import and reconcile product, variant and approved order data without modifying Shopify inventory.
- Obtain authorised seller API documentation and credentials for Myntra, AJIO and Nykaa Fashion before implementing adapters.

## Milestone 5: Orders, fulfillment and returns
- Build a unified order view and SKU mapping workflow.
- Track reservation, processing, dispatch, cancellation and return states.
- Record stock changes through auditable inventory movements.
- Handle marketplace-managed fulfillment based on each channel's documented capabilities.

## Milestone 6: Controlled synchronisation and operations
- Test each channel adapter independently with stock writes disabled.
- Add explicit per-channel enablement, retry handling, sync error queue and reconciliation.
- Enable external inventory writes only after user approval, successful tests and verified channel rules.
- Add monitoring, backups, restore tests and production rollout procedures.