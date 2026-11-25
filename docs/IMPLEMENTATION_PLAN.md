# Fimonaa Commerce Hub Implementation Plan

## Current foundation

### Current development checkpoint: 25 November 2026

Development has progressed beyond the merged backend Business Membership Management Phase 2B milestone.

The active development branch is `feature/business-membership-frontend`, with the latest recorded implementation commit `0a1b0ce`.

**Implemented frontend functionality:**

- Typed authenticated API client.
- Authentication context and session management.
- Login page.
- Business workspace selection.
- Authenticated application navigation.
- Tenant-scoped dashboard.
- Inventory listing with name and SKU search.
- Inventory stock-status filtering.
- Inventory pagination and improved empty states.

**Implemented backend and development tooling:**

- Business-scoped dashboard and inventory APIs.
- Guarded local development launcher.
- Separate development database configuration.
- Synthetic development authentication fixtures.
- Synthetic development inventory fixtures.

The synthetic inventory dataset contains 45 records across two demonstration businesses, with overlapping SKU identifiers to support tenant-isolation testing.

**Latest recorded verification:**

- 379 backend tests passed across 36 suites.
- 17 development script tests passed.
- API TypeScript compilation passed.
- Manual frontend checks passed for workspace access, tenant isolation, inventory searching, filtering and pagination.

These results are separate from the historical Phase 2B verification of 724 passing tests. They must not be combined or represented as a fresh comprehensive test run.

**Current implementation boundaries:**

The authenticated frontend workspace and inventory functionality are implemented on the development branch. This does not establish that the branch has been merged into `main`.

Frontend business membership administration, including invitation management and membership lifecycle controls, remains planned work.

**Next recommended milestone:** Product and Variant Image Management Foundation.

The next milestone should establish secure business-scoped image associations, manual image uploads, storage, metadata, primary image selection, ordering and frontend previews.

Read-only Shopify product and variant image retrieval can follow after the internal image architecture has been implemented and verified.

No live Shopify inventory synchronization, marketplace stock writes, protected-database migrations or inventory source-of-truth cutover are authorized.

### Historical backend milestone: 22 November 2026

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
- The original dashboard implementation read PostgreSQL inventory metrics without completed tenant-isolation verification. Subsequent development on feature/business-membership-frontend introduced business-scoped dashboard APIs and frontend workspace integration. Manual tenant-isolation checks passed in the development environment. A comprehensive authorization and security audit remains required before production deployment.
- External sales channels are not connected. No marketplace stock writes are enabled.

## Safety and delivery boundaries

- The Excel SKU workbook remains the inventory source of truth until an explicitly approved cutover.
- Do not run migrations, imports, seeds, destructive SQL, integration tests, or other writes against the protected `fimonaa_commerce` database without explicit authorization.
- Automated integration tests must target only the isolated `fimonaa_commerce_import_test` database, with safety assertions intact.
- Eight TypeORM migrations are documented in the current source-controlled sequence. Their presence in Git does not establish that they have been applied to the protected database.
- The six operational milestones below are planning workstreams. Completion of the authentication and membership milestones does not mark them complete.

### Local development database safeguards

The project uses three distinct PostgreSQL database environments:

| Database                       | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `fimonaa_commerce`             | Protected database containing historical inventory records |
| `fimonaa_commerce_dev`         | Approved local development database                        |
| `fimonaa_commerce_import_test` | Isolated integration-test database                         |

Local development must use the Git-ignored configuration file `apps/api/.env.development.local`.

The guarded development launcher is:

`node apps/api/scripts/run-local-dev.cjs <command>`

Supported commands include `api`, `migration:show`, `migration:run`, `seed:dev-auth`, and `seed:dev-inventory`.

The launcher validates the database configuration and prevents accidental execution against an unauthorized database.

Migrations and seeds are database-writing operations. They must be reviewed before execution, even when targeting the approved development database.

The standard `apps/api/.env` file may contain protected database configuration and must not be overwritten or used as the default local development environment.

Development fixtures are synthetic and must never be treated as authoritative Fimonaa inventory.

No protected-database migrations, imports, seeds, destructive operations or inventory modifications are authorized by this implementation plan.

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

### Next development deliverable: Product and Variant Image Management

Implement a secure image management foundation that supports both manually uploaded images and future retrieval from Shopify.

**Data architecture:**

- Associate images with a business, product and, where applicable, a specific product variant.
- Support multiple images per product and variant.
- Support primary image selection and display ordering.
- Store image metadata, including source, content type, file size and storage reference.
- Preserve source attribution for images retrieved from external channels.
- Define image ownership and deletion rules.

**Backend implementation:**

- Introduce business-scoped image entities and database migrations.
- Implement secure image upload and retrieval endpoints.
- Validate file types, file sizes and access permissions.
- Use private object storage with controlled image access.
- Prevent cross-business image access or modification.
- Implement safe replacement and deletion workflows.
- Add automated tests covering authorization, validation and tenant isolation.

**Frontend implementation:**

- Display product and variant image thumbnails.
- Support manual image uploads.
- Allow authorized users to select primary images and manage image ordering.
- Provide appropriate loading, empty and error states.
- Ensure image management works within the selected business workspace.

**Future Shopify image retrieval:**

- Retrieve approved product and variant image information through authorized Shopify APIs.
- Map Shopify product and variant identifiers to internal catalogue records.
- Preserve image source metadata and external identifiers.
- Avoid duplicate image records during repeated imports.
- Support reconciliation when Shopify images are changed or removed.
- Keep Shopify image retrieval read-only until a separate integration design has been reviewed.

**Implementation boundaries:**

- Do not modify Shopify inventory quantities.
- Do not enable marketplace stock synchronization.
- Do not run migrations against the protected database.
- Do not replace the Excel SKU workbook as the authoritative inventory source.
- Do not introduce production storage credentials before the storage architecture has been approved.

Image management should be implemented incrementally, beginning with data modelling, authorization rules and storage design, followed by backend APIs, frontend functionality and integration tests.

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
