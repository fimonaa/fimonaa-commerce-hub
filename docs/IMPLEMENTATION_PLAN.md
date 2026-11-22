# Fimonaa Commerce Hub Implementation Plan

## Current foundation

**Implementation status as of 22 November 2026:** Fimonaa Commerce Hub has completed the backend Business Membership Management Phase 2B milestone, merged into `main` through pull request #11 (`c852d35`).

The development baseline includes business-scoped inventory authorization (PR #6), authentication and initial invitation lifecycle (PR #7), read-only business membership management (PR #9), and the expanded membership lifecycle and invitation workflows (PR #11).

**Recorded Phase 2B verification:** 348 unit tests across 31 suites and 376 integration tests across 19 suites, totaling 724 passing tests across 50 suites. TypeScript compilation, ESLint, NestJS build, and two GitHub checks passed during the implementation milestone. These checks have not been rerun as part of this documentation update.

**Implemented membership endpoints:**

- `GET /api/business-memberships`
- `GET /api/business-memberships/:membershipId`
- `PATCH /api/business-memberships/:membershipId/role`
- `POST /api/business-memberships/:membershipId/suspend`
- `POST /api/business-memberships/:membershipId/reactivate`
- `POST /api/business-memberships/:membershipId/remove`

**Implemented business membership invitation endpoints:**

- `POST /api/auth/business-membership-invitations`
- `POST /api/auth/business-membership-invitations/accept`
- `GET /api/auth/business-membership-invitations`
- `GET /api/auth/business-membership-invitations/:invitationId`
- `POST /api/auth/business-membership-invitations/:invitationId/revoke`

**Database migrations:** The documented migration sequence now includes eight TypeORM migrations. The two latest migrations introduce membership lifecycle fields and a dedicated business membership invitation table. Both explicitly prohibit automatic rollback.

**Next development priorities:** Business Membership Administration UI, authentication hardening, comprehensive audit logging, invitation delivery, endpoint authorization review, and production migration verification.

**Production readiness:** The system remains under development. No production deployment, protected-database migration, or inventory source-of-truth cutover is authorized by this milestone.

- Monorepo with React, TypeScript, Vite and Tailwind CSS frontend.
- NestJS API with PostgreSQL and Redis infrastructure.
- Historical opening-balance record in the protected PostgreSQL database: 318 SKUs and 2,027 available units. These are historical figures, not verified current live totals.
- Dashboard summary reads PostgreSQL inventory metrics; dashboard tenant isolation still requires a separate review.
- External sales channels are not connected. No marketplace stock writes are enabled.

## Safety and delivery boundaries

- The Excel SKU workbook remains the inventory source of truth until an explicitly approved cutover.
- Do not run migrations, imports, seeds, destructive SQL, integration tests, or other writes against the protected `fimonaa_commerce` database without explicit authorization.
- Automated integration tests must target only the isolated `fimonaa_commerce_import_test` database, with safety assertions intact.
- Eight TypeORM migrations are documented in the current source-controlled sequence. Their presence in Git does not establish that they have been applied to the protected database.
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
