# Fimonaa Commerce Hub
## Development Documentation - Version 1.1

**Status:** Development baseline / not production-ready  
**Updated:** 22 October 2026  
**Repository:** `fimonaa/fimonaa-commerce-hub`  
**Feature branch:** `feature/business-workspaces-migrations`  
**Verified commit:** `c1047c7` - `feat(api): add business workspaces and inventory ownership migrations`

> **Safety notice:** Do not run migrations, imports, seed scripts, or destructive SQL against the main development database or the real India inventory without an explicit review and authorization. All experiments should use disposable databases or controlled restored copies.

## 1. Executive summary

Version 1.1 records the successful completion of the **business-workspace and inventory-ownership database foundation**. Four TypeORM migrations have been added and committed, with support for both a new, empty SaaS installation and the controlled migration of legacy inventory. The opening-balance import service is now business-aware and transactional; its HTTP import endpoint deliberately remains disabled pending authentication and membership authorization.

The API build, lint, and all **31 unit tests across five suites** passed. Clean initialization and several PostgreSQL integrity checks passed on isolated databases. The feature branch was pushed successfully; it has **not** been merged into `main`. These checks establish a development checkpoint, **not** production readiness or complete tenant security.

## 2. Product direction and scope

Fimonaa Commerce Hub is an **inventory-first, multi-business SaaS** for commerce operations. The platform must support independently created business tenants, their users and memberships, inventory, opening balances, and future order/return and marketplace integrations. Fimonaa India and Fimonaa Finland are initial example businesses under one owner, **not hardcoded tenants or required records in every installation**.

### Core design principles

- Every business owns its operational records.
- A user may have different roles in different businesses.
- Database constraints complement, but do not replace, API authentication and authorization.
- Historical India inventory must be preserved through controlled migrations.
- Inventory movements and opening balances must be auditable and transactionally consistent.
- The Excel SKU workbook remains the source of truth until a separately approved cutover.

## 3. Technical stack and repository

| Layer | Technology / detail |
|---|---|
| Backend | NestJS 11, TypeScript |
| Database / ORM | PostgreSQL 16, TypeORM 0.3.31 |
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Supporting service | Redis |
| Testing | Jest unit tests; manual PostgreSQL integration checks |
| API documentation | Swagger / OpenAPI outside production at `/api/docs` |
| Working branch | `feature/business-workspaces-migrations` |
| Migration tracking | `typeorm_migrations` |

Relevant paths:

```text
apps/api/src/database/data-source.ts
apps/api/src/database/migrations/
apps/api/src/database/seed-businesses.ts
apps/api/src/modules/imports/inventory-import.controller.ts
apps/api/src/modules/imports/inventory-opening-balance.service.ts
apps/api/src/modules/imports/__tests__/
apps/api/src/main.ts
```

## 4. Data model and tenancy

### Business identity and membership

- `businesses`: business workspace records, including active status.
- `users`: platform users.
- `business_memberships`: joins users to businesses with roles such as `owner`, `admin`, `inventory_manager`, `operator`, and `viewer`.

### Inventory and import ownership

- `inventory_skus`: SKU master and available stock; now includes `business_id`.
- `inventory_movements`: stock movement audit records; now includes `business_id`.
- `inventory_opening_balance_imports`: import audit/history; now includes `business_id`.
- Composite inventory relationship constraints prevent a movement from referencing a SKU owned by a different business.
- Opening-balance import-key uniqueness is scoped to `(business_id, import_key)`.

**Known schema limitation:** `inventory_skus.sku` remains the **global primary key**. As a result, two businesses cannot yet hold the same SKU string, despite the added `(business_id, sku)` uniqueness and composite relationship protection. Correct this in a **new, separately reviewed migration**; do not rewrite committed migration history.

## 5. Migration inventory

| Order | Migration file | Purpose |
|---|---|---|
| 1 | `1761070000000-CreateBusinessWorkspace.ts` | Creates businesses, users, memberships |
| 2 | `1761080000000-CreateFoundationalInventoryTables.ts` | Creates inventory tables when absent; preserves existing tables |
| 3 | `1792600000000-AddBusinessOwnershipToInventory.ts` | Adds/backfills ownership for SKUs and movements, FKs and indexes |
| 4 | `1792700000000-AddBusinessOwnershipToOpeningBalanceImports.ts` | Adds/backfills import ownership and business-scoped import uniqueness |

### Fresh installation behavior

The migrations can initialize an **empty database without automatically creating Fimonaa India or Finland**. The optional `seed-businesses.ts` script is not part of mandatory SaaS installation. This avoids tying general platform initialization to specific brand tenants.

### Legacy inventory behavior

When historical inventory exists, ownership migrations require the expected India business record for controlled backfill. The India inventory baseline used in testing was **318 SKUs and 2,027 available units**. These counts are a verification baseline, not permission to modify production or main development inventory.

### Migration configuration

The standalone CLI data source disables `synchronize` and `migrationsRun`, uses `typeorm_migrations`, and loads TypeScript migration files from `src/database/migrations/*.ts`. The CLI works in the tested TypeScript development workflow. **Compiled JavaScript migration discovery/deployment remains to be validated** before production use.

## 6. Database environments and safety boundaries

| Database | Purpose | Safety rule |
|---|---|---|
| `fimonaa_commerce` | Main development DB containing historical India inventory | **Do not migrate or alter without explicit approval** |
| `fimonaa_commerce_migration_test` | Earlier isolated empty migration test | Test only |
| `fimonaa_commerce_workspace_test` | Restored copy of India inventory; ownership migration testing | Preserve for reference; do not casually mutate |
| `fimonaa_commerce_import_test` | Disposable clean-install / constraint test DB | Safe test target; verify connection first |

A pre-migration database backup was created at:

```text
backups/fimonaa_pre_migrations_20261021_195919.dump
```

The backup was restore-tested and is excluded from Git by `backups/` in `.gitignore`. Database backups may contain business data and must not be committed. A successful backup is not a substitute for verifying the current target database before each command.

## 7. Opening-balance import behavior

**HTTP endpoint:** `POST /api/inventory-import/import-opening-balance`  
**Current behavior:** always throws `ForbiddenException`; importing is disabled until authentication and business membership/permission checks are implemented.

The underlying service accepts an explicit `businessId` and performs the following:

1. Validates the business ID format and configured workbook path.
2. Reads the `SKU Generator` worksheet and validates all populated SKU rows before database writes.
3. Calculates a SHA-256 workbook import key and inventory totals.
4. Begins one PostgreSQL transaction and obtains a business-scoped advisory transaction lock.
5. Checks that the business exists and is active.
6. Rejects a second opening balance if the business already has inventory or import history.
7. Rejects incoming SKU strings already present globally (current primary-key limitation).
8. Inserts business-owned import history, SKU records, and opening-balance movements together.
9. Returns an import summary only after successful transactional work.

**Semantics:** Current Available Stock becomes the opening quantity; Initial Stock is retained as metadata. The service does not reconstruct historical orders or returns and does not modify Shopify inventory.

**Security caveat:** A UUID and active-business check are **not authorization**. The service must only be invoked after verifying the caller's membership and permission. The validation-only endpoint remains available without equivalent protection and needs security review before deployment; local path exposure should be eliminated or restricted.

## 8. Verification results

### Automated API checks

| Check | Observed result |
|---|---|
| `git diff --cached --check` | Clean |
| NestJS build | Passed |
| ESLint | Passed |
| Jest | **5 suites passed; 31 tests passed** |

Test suites included opening-balance service, import controller, inventory service, inventory controller, and inventory query DTO.

### Database migration checks

- Clean installation on `fimonaa_commerce_import_test`: **all four migrations applied** and recorded in `typeorm_migrations`.
- Clean database remained business-neutral: **0 businesses, 0 SKUs, 0 movements, 0 import-history rows**.
- Existing-inventory migration checks used `fimonaa_commerce_workspace_test`, a separate restored India inventory copy; India baseline remained **318 SKUs / 2,027 units**, Finland had 0.

### Manual PostgreSQL integrity checks

The following tests were run using synthetic records inside `BEGIN` / `ROLLBACK` transactions on the disposable test database:

1. Created two synthetic businesses and inserted a SKU for Business A; verified ownership, then rolled back.
2. Attempted a Business B movement against Business A's SKU; rejected by `inventory_movements_business_sku_fkey`.
3. Attempted `available_stock = -5`; rejected by `inventory_skus_available_stock_check`; original stock remained unchanged.
4. Reused an import key in two different businesses successfully; a duplicate within one business was rejected by `inventory_opening_balance_imports_business_key_unique`.

**Interpretation:** These checks verify selected schema constraints and transactional cleanup, **not end-to-end authentication or production multi-tenancy**. Automated database integration regression tests are still required.

## 9. Rollback review and restrictions

| Migration | Current rollback behavior | Risk / policy |
|---|---|---|
| Business workspace | Drops memberships, users, businesses | Destructive if reached; add data-aware guards before production |
| Foundational inventory | Always refuses automatic rollback | Intentional protection for possibly pre-existing tables |
| Inventory ownership | Drops business constraints/columns without deleting inventory rows | Loses ownership metadata; guard against multi-business data |
| Import ownership | Refuses rollback when global import-key uniqueness cannot be restored; otherwise removes business ownership | Can lose ownership metadata even when successful |

**Do not run `migration:revert` against the main development database or India workspace-test copy.** The foundational migration intentionally makes a complete automated rollback impossible. Any future rollback requires a reviewed plan, verified backup, explicit database target, and business-data preservation checks. PostgreSQL transactional DDL reduces partial-change risk but does not make destructive rollback semantically safe.

## 10. Git milestone and delivery state

```text
Branch: feature/business-workspaces-migrations
Commit: c1047c7
Message: feat(api): add business workspaces and inventory ownership migrations
Files committed: 14
Remote: origin/feature/business-workspaces-migrations
Push: successful
Main branch merge: not performed
```

The commit includes the four migrations, TypeORM CLI configuration, optional business seed, import-service/controller changes, unit tests, Swagger setup, package updates, and a Git ignore rule for local backups.

## 11. Open issues and production blockers

| Priority | Item | Required outcome |
|---|---|---|
| P0 | Authentication and membership authorization | Enforce caller identity, business membership and role on every protected endpoint |
| P0 | Business-scoped inventory APIs | Every read/write scoped to authorized tenant; negative access tests |
| P0 | Secure import and validation endpoints | Keep import disabled until guarded; restrict local validation/path exposure |
| P1 | Tenant-scoped SKU identity | Permit duplicate SKU strings across businesses; update dependent foreign keys safely |
| P1 | Automated PostgreSQL integration tests | Repeatable migration, FK, stock constraint, isolation and rollback checks |
| P1 | Deployment migration strategy | Verify compiled JS migration discovery and explicit production execution |
| P1 | Rollback hardening | Protect populated business/ownership data against destructive reversals |
| P1 | Legacy schema compatibility | Validate migration assumptions against backed-up historical schemas |
| P2 | Business onboarding / workspace UX | Create and select tenants without brand-specific hardcoding |
| P2 | Inventory reconciliation and cutover | Plan workbook-to-database source-of-truth transition separately |

## 12. Recommended next development sequence

**Milestone A - Tenant-scoped SKU migration planning.** Inspect all primary-key and foreign-key dependencies and API query assumptions. Design a new migration that allows `(business_id, sku)` as a tenant-unique identifier without losing India records. Test on disposable and restored-copy databases first.

**Milestone B - Identity and access.** Add authentication, membership resolution, role guards, and tenant-scoped service boundaries. Confirm users cannot access or mutate other businesses' records even when they know the UUID.

**Milestone C - Repeatable integration and deployment checks.** Automate PostgreSQL constraint/migration tests, test compiled migration execution, and add explicit database-target safeguards.

**Milestone D - Controlled import enablement.** Only after authorization, data-model changes, and test coverage are in place, design a reviewed opening-balance workflow with dry-run validation, audit logging, and operator confirmation.

## 13. Safe developer command reference

Commands below are **illustrative**. Verify working directory, environment variables and target database before executing migration or seed commands.

```bash
# From the repository root - non-destructive checks
npm --workspace apps/api run build
npm --workspace apps/api run lint
npm --workspace apps/api run test -- --runInBand

git status --short
git log -1 --oneline

# Inspect migration status ONLY after verifying DATABASE_URL
# npm --workspace apps/api run migration:show

# Do not run migration:run, migration:revert, or seed:businesses
# against the main database without explicit approval.
```

## 14. Version history and acceptance record

| Version | Milestone | State |
|---|---|---|
| v1.0 | Earlier project development documentation | Previous reference; not revalidated for this edition |
| **v1.1** | Business workspaces, inventory ownership migrations, protected import service, clean-init and integrity tests, Git checkpoint | **Completed development checkpoint** |

**Acceptance basis:** terminal outputs and database test results reported during the development session, including commit `c1047c7` and successful push. This document is a development record, not an independent audit of the remote repository or a production release approval.

---

*Fimonaa Commerce Hub - Development Documentation v1.1 | 22 October 2026*
