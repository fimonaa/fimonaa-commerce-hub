# FIMONAA COMMERCE HUB

**Development record | Architecture, inventory baseline, business workspaces, migrations, Swagger, testing and next steps**

**Documentation snapshot:** 22 October 2026. Based on project discussion and terminal outputs shared to that point. This is a record of verified work and stated design decisions, not an audit of current repository contents.

> **Historical snapshot (v1.0).** This document reproduces the *first* development documentation supplied as a PDF. Its statuses, migration counts, test counts and next steps describe the earlier checkpoint, **not** the later v1.1 milestone. Consult v1.1 for subsequent work.

## At a glance

| At a glance | Current position at this snapshot |
|---|---|
| Project | Inventory-first, multi-business commerce platform |
| Backend / frontend | NestJS + PostgreSQL + Redis / React + TypeScript + Vite |
| Existing inventory | 318 SKUs; 2,027 available units; 318 movements; 1 opening-balance import |
| Workspace test | Three migrations applied and tested |
| Original development DB | Not migrated to business-workspace schema |
| Automated tests | 18 passed across 3 suites |
| Next engineering task | Make opening-balance import business-aware and secure |

### How to use this document

Read Sections 1–3 for the project overview, Sections 4–7 for the implementation record, Sections 8–10 for reproducible verification and safety rules, and Section 11 for next steps. Commands are examples for the local development setup; confirm environment variables and database names before executing.

## 1. Purpose and product direction

Fimonaa Commerce Hub is intended to be a centralized inventory-first operations platform. It begins with Fimonaa India and Fimonaa Finland and is designed to accommodate additional businesses in the future. A single backend and frontend will serve multiple business workspaces while preserving strict data separation.

- **Fimonaa India:** owns all currently imported inventory.
- **Fimonaa Finland:** has its own workspace and starts with zero inventory.
- **Future businesses:** architecture should support additional tenants without rewriting core inventory models.
- **Controlled transfers:** any future movement between businesses must be explicitly authorized and auditable.
- **Excel:** remains the source of truth during development until a planned, reconciled cutover.

## 2. Technology and local project

| Layer | Selected technology / location |
|---|---|
| Backend | NestJS 11; TypeScript; TypeORM 0.3.31 |
| Database | PostgreSQL 16, Docker container `fimonaa-commerce-postgres` |
| Cache / infrastructure | Redis 7 |
| Frontend | React 19; TypeScript; Vite 8; Tailwind CSS 4 |
| API entry point | `apps/api/src/main.ts` |
| Application module | `apps/api/src/modules/app.module.ts` |
| TypeORM data source | `apps/api/src/database/data-source.ts` |
| Migration directory | `apps/api/src/database/migrations/` |
| Repository | `github.com/fimonaa/fimonaa-commerce-hub` (repository reference) |
| Local root | `~/workspace/fimonaa-commerce-hub` |
| Feature branch | `feature/business-workspaces-migrations` |

The backend uses the `/api` global prefix, validation middleware, CORS configuration and a TypeORM configuration with schema synchronization disabled (`synchronize: false`). Database structure is managed through migrations.

## 3. Initial inventory and API foundation

The project already had an Excel opening-balance import workflow and inventory API before the business-workspace work. The import reads the `SKU Generator` worksheet, validates SKU codes, product names and whole-number stock quantities, and records available stock as the opening balance. Initial Stock is preserved as metadata; historical orders, returns and Shopify inventory are not recreated by this import.

| Inventory baseline | Verified count |
|---|---:|
| Inventory SKUs | 318 |
| Available stock units | 2,027 |
| Inventory movement records | 318 |
| Opening-balance import records | 1 |

Existing API capabilities include inventory listing with search, stock-status filtering and pagination, plus a dashboard summary endpoint. The import API includes workbook validation and an opening-balance import route. Existing API routes are not yet business-scoped or authenticated for multi-tenant use.

## 4. Business-workspace architecture decisions

### 4.1 Workspace entities

The first migration creates `businesses`, `users` and `business_memberships`. Businesses have a unique slug and status; memberships associate a user with a business and role. Planned roles include `owner`, `admin`, `inventory_manager`, `operator` and `viewer`.

The planned authorization model allows a user to access one or several businesses only through explicit memberships. A client-supplied business ID or slug must never be trusted without server-side authorization.

### 4.2 Inventory ownership

The second migration adds a required `business_id` to `inventory_skus` and `inventory_movements`. Existing inventory is assigned to Fimonaa India. Foreign keys and composite constraints ensure that a movement belongs to the same business as its SKU.

**Known interim limitation:** `inventory_skus` still has a globally unique `sku` primary key. The additional `(business_id, sku)` constraint improves ownership consistency but does not yet permit two businesses to use the same SKU code. This must be revisited if overlapping SKU namespaces are needed.

### 4.3 Import history ownership

The third migration adds `business_id` to `inventory_opening_balance_imports`, assigns the existing record to India, and changes uniqueness from `import_key` alone to `(business_id, import_key)`. This permits the same workbook hash to be recorded for separate businesses while prohibiting a duplicate within the same business.

Business-specific uniqueness does not itself enforce one opening-balance import per business. That additional safety rule must remain in application logic or be represented by an explicit database rule.

## 5. Chronological implementation record

| Phase | Work completed / evidence |
|---|---|
| Foundation | NestJS API, React frontend, PostgreSQL and Redis selected and initialized; inventory import and inventory API established. |
| Safety preparation | Original development inventory backed up to a local custom-format dump; backup verification performed with `pg_restore` in Docker. |
| Test databases | Created a migration test DB and a restored workspace test DB containing baseline inventory. |
| Migration 1 | Business, user and membership tables created; up/down tested on migration test DB. |
| Seed | India and Finland business rows inserted using idempotent seed script; repeated seed execution tested. |
| Migration 2 | Existing SKUs and movements assigned to India; ownership constraints added; up/down/reapply tested. |
| Swagger | Compatible NestJS Swagger 11 installed; `/api/docs` rendered successfully in development. |
| Migration 3 | Opening-balance import history assigned to India; up/down/reapply tested successfully. |
| Quality checks | API build passed; ESLint passed; Jest 18/18 tests passed. |

## 6. Migration files and their behavior

| Migration | Up action / Down action |
|---|---|
| `1761070000000-CreateBusinessWorkspace.ts` | **Up:** create `businesses`, `users`, `business_memberships` with constraints. **Down:** remove those workspace tables (subject to dependencies). |
| `1792600000000-AddBusinessOwnershipToInventory.ts` | **Up:** add `business_id` to SKUs and movements, backfill India, enforce NOT NULL, foreign keys, composite relationship and indexes. **Down:** remove ownership constraints, indexes and columns. |
| `1792700000000-AddBusinessOwnershipToOpeningBalanceImports.ts` | **Up:** add `business_id` to import history, backfill India, enforce ownership and business-scoped import-key uniqueness. **Down:** restore original global import-key uniqueness and remove ownership column. |

### Important migration sequencing

The workspace migration must run first; business seed data must exist before migrations that backfill inventory and import ownership. The latter migrations look up the Fimonaa India workspace by slug and fail if it is absent. The seed is therefore an explicit prerequisite, not an automatic consequence of running `migration:run`.

### Migration 3 rollback protection

The third migration checks for duplicate `import_key` values across businesses before restoring the old globally unique constraint. If duplicates exist, rollback fails safely rather than silently deleting data. Other rollbacks can still remove business ownership information and should not be treated as universally safe once live multi-business activity begins.

## 7. Swagger API documentation

Installed `@nestjs/swagger` 11.4.7, compatible with NestJS 11. Swagger was configured in `apps/api/src/main.ts` and shown successfully at the local development route `/api/docs`, under a non-production environment guard.

| Observed Swagger group | Observed endpoint |
|---|---|
| Health | `GET /api/health` |
| Dashboard | `GET /api/dashboard/summary` |
| Inventory | `GET /api/inventory` |
| InventoryImport | `GET /api/inventory-import/validate-local` |
| InventoryImport | `POST /api/inventory-import/validate` |
| InventoryImport | `POST /api/inventory-import/import-opening-balance` |

**Security note:** Swagger displaying an endpoint proves route discovery, not that the endpoint was exercised or secured. The state-changing import endpoint must not be executed casually from Swagger and must be protected before any deployment. DTO and response documentation may still need enhancement.

## 8. Test environments, backups and data safety

| Database | Purpose / known status at this snapshot |
|---|---|
| `fimonaa_commerce` | Original development database. Inventory baseline present; business-workspace migrations not applied. |
| `fimonaa_commerce_migration_test` | Isolated database for migration behavior; previously reverted to an empty workspace-migration state. |
| `fimonaa_commerce_workspace_test` | Restored inventory copy. All three migrations applied; India and Finland workspace records present. |

A local backup was created before workspace migrations at `backups/fimonaa_pre_migrations_20261021_195919.dump`. The `backups/` directory is ignored by Git. The backup was checked using Docker `pg_restore`; the Mac host did not have `pg_restore` installed. The exact backup filename is historical and should not be assumed to represent a current backup of future changes.

### Verified data preservation

| Checkpoint | Observed result |
|---|---|
| After migration 2 ownership assignment | India: 318 SKUs, 2,027 units, 318 movements; Finland: 0 |
| After migration 2 rollback | 318 SKUs, 2,027 units, 318 movements, 1 import |
| After migration 2 reapplication | Migration succeeded; TypeORM marked it executed |
| After migration 3 application | India: 1 import / 318 SKUs / 2,027 units; Finland: 0 imports |
| After migration 3 application, total data | 318 SKUs, 2,027 units, 318 movements, 1 import |
| After migration 3 rollback/reapplication | Both operations committed successfully; all three migrations shown executed |

### Safety principles

- Do not run experimental migrations against `fimonaa_commerce`.
- Use explicit `DATABASE_URL` overrides when targeting a test database.
- Maintain a verified backup and restore plan before main database changes.
- Do not rerun opening-balance imports without an approved reconciliation plan.
- Keep Excel as the agreed source of truth until controlled cutover.
- Never store production credentials in documentation or Git.

## 9. Reproducible local commands

These commands document the workflow used at this historical checkpoint. Replace the example test database connection with your actual local configuration. The example password below is a local-development placeholder only.

### Build, lint and tests

```bash
npm --workspace apps/api run build
npm --workspace apps/api run lint
npm --workspace apps/api run test -- --runInBand
```

### Migration status and execution on workspace test database

```bash
DATABASE_URL='postgresql://fimonaa:local_dev_change_me@localhost:5432/fimonaa_commerce_workspace_test' \
  npm --workspace apps/api run migration:show

DATABASE_URL='postgresql://fimonaa:local_dev_change_me@localhost:5432/fimonaa_commerce_workspace_test' \
  npm --workspace apps/api run migration:run
```

### Rollback only the most recently applied migration

> **Warning:** Historical example only; do not execute casually. `migration:revert` targets the last applied migration. Confirm `migration:show` first and never use it casually on databases containing newer business-specific inventory.

```bash
DATABASE_URL='postgresql://fimonaa:local_dev_change_me@localhost:5432/fimonaa_commerce_workspace_test' \
  npm --workspace apps/api run migration:revert
```

### Read-only baseline integrity check

```bash
docker exec -it fimonaa-commerce-postgres psql \
  -U fimonaa -d fimonaa_commerce_workspace_test \
  -c "SELECT
    (SELECT COUNT(*) FROM inventory_skus) AS sku_count,
    (SELECT COALESCE(SUM(available_stock), 0) FROM inventory_skus) AS stock,
    (SELECT COUNT(*) FROM inventory_movements) AS movements,
    (SELECT COUNT(*) FROM inventory_opening_balance_imports) AS imports;"
```

### Review local changes

```bash
git status --short
git diff --stat
git ls-files --others --exclude-standard
git diff --check
```

## 10. Source files and Git working state

| Path | Role |
|---|---|
| `apps/api/src/main.ts` | Application bootstrap and development Swagger setup |
| `apps/api/src/database/data-source.ts` | Standalone TypeORM migration data source |
| `apps/api/src/database/seed-businesses.ts` | Idempotent India/Finland workspace seed |
| `apps/api/src/database/migrations/` | Three versioned workspace/ownership migrations |
| `apps/api/src/modules/imports/inventory-opening-balance.service.ts` | Excel validation and opening-balance import implementation; not yet updated for `business_id` |
| `apps/api/src/modules/inventory/inventory.service.ts` | Inventory list/search/status/pagination; not yet business-scoped |
| `apps/api/package.json` | Migration scripts and Swagger dependency |
| `package-lock.json` | Dependency lockfile |
| `.gitignore` | Includes `backups/` exclusion |

Last shared Git status included modified `.gitignore`, `apps/api/package.json`, `apps/api/src/main.ts` and `package-lock.json`, plus an untracked `apps/api/src/database/` directory. The third migration was created afterward. This historical document does not assert these files were committed; no commit confirmation had been supplied at that checkpoint.

### Test outcomes

| Check | Evidence |
|---|---|
| Build | `nest build` completed successfully |
| Lint | `eslint` completed without reported errors |
| Jest | 3 suites passed; 18 tests passed |
| Swagger | UI screenshot confirmed route discovery |
| Migration 2 | Up, down and re-up successful |
| Migration 3 | Up, down and re-up successful |

The existing Jest suites cover inventory service, inventory controller and inventory query DTO. They do not yet prove business-scoped authorization, import compatibility or end-to-end multi-tenant isolation.

## 11. Outstanding work and recommended order

| Priority | Next work | Acceptance criterion |
|---:|---|---|
| 1 | Update opening-balance import service | Remove runtime table creation; require business ownership on imports, SKUs and movements; preserve transaction, validation and one-time safeguards. |
| 2 | Protect import operation | No unauthenticated caller can import inventory or select an arbitrary business. Keep endpoint disabled/restricted until authorization is ready. |
| 3 | Business-scoped inventory and dashboard APIs | All reads filter by authorized business; no cross-business leakage. |
| 4 | Authentication and memberships | Self-managed secure session authentication, user roles and membership enforcement. |
| 5 | Business-scoped import and access tests | Automated negative tests for cross-business access and duplicate imports. |
| 6 | Migration readiness review | Document seed prerequisite, verify fresh setup path and backup/rollback plan. |
| 7 | Git review and commits | Review tracked/untracked diff; separate meaningful commits; merge only after tests and security review. |
| 8 | Controlled main DB rollout | Back up, reconcile against Excel, seed, migrate and verify with explicit approval. |

### Import service issues identified

- At this checkpoint, creates inventory tables with `CREATE TABLE IF NOT EXISTS` at runtime; migrations should own schema creation.
- At this checkpoint, inserts SKUs, movements and import history without `business_id`, which will fail against the migrated schema.
- At this checkpoint, checks for previous SKUs/imports globally; checks must be scoped to the target business.
- At this checkpoint, uses a global advisory lock; business-scoped locking is preferable once imports are business-specific.
- Relies on a configured workbook path and exposes an import operation; authorization and operational controls remain necessary.

### Design topics intentionally deferred

- Whether SKU codes must be unique globally or only inside a business.
- Business-to-business inventory transfer ledger and approvals.
- Marketplace integrations, Shopify synchronization and cutover from Excel.
- Tenant onboarding and public registration, which are future goals rather than current capabilities.

## 12. Plain-language summary

We started with an inventory system that knew about products and stock but not about separate businesses. We created the structure for business workspaces, marked all existing stock as belonging to Fimonaa India, and associated its original import history with India. We practiced those changes on a copy of the database, tested the undo steps, and confirmed that all 318 SKUs and 2,027 units remained intact. The original development database was left alone. The next task is to teach the API to use this new structure safely.

---

*Documentation boundary:* This Markdown file transcribes the first PDF's historical development snapshot. It does not claim that business-aware APIs, authorization, production migration, or Git commits were complete at that point. For later verified work, see Development Documentation v1.1.
