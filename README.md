# Fimonaa Commerce Hub

Fimonaa Commerce Hub is an inventory-first, multi-business commerce operations platform under development for Fimonaa India, Fimonaa Finland, and potential future business workspaces.

**Status:** The backend includes authentication, business-scoped authorization, inventory listing, and guarded opening-balance import functionality. It is **not production-ready**. The Excel SKU workbook remains the inventory source of truth until an explicitly approved cutover.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/api` | NestJS and TypeScript backend API |
| `apps/web` | React 19, TypeScript 6, Vite 8 and Tailwind CSS 4 frontend |
| `apps/worker` | Background worker workspace |
| `libs/domain` | Shared domain contracts |
| `infrastructure` | Local PostgreSQL and Redis configuration |
| `docs` | Development documentation, implementation notes, and architecture decisions |

The frontend uses React 19, TypeScript 6, Vite 8 and Tailwind CSS 4. Start it from the repository root with `npm run dev -w apps/web` and build it with `npm run build -w apps/web`.

## Prerequisites

- Node.js 22 LTS
- npm
- Docker Desktop

## Local infrastructure

From the repository root:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

The initial local configuration exposes PostgreSQL on `localhost:5432` and Redis on `localhost:6379`. Confirm ports against the current Compose configuration if it has changed.

## Backend setup

From the repository root, prepare the backend environment:

```bash
cp apps/api/.env.example apps/api/.env
```

Review the database configuration before starting the API. Then run:

```bash
npm install
npm run dev:api
```

Review `.env.example` before starting. **The normal `DATABASE_URL` may point to the protected `fimonaa_commerce` database.** Confirm the target and use an appropriate development database. Starting the API does not authorize migrations, imports, seeds, or any writes to protected inventory.

The API uses the `/api` global prefix. Its documented authentication endpoints are:

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Verify credentials and issue a 15-minute JWT access token |
| `POST` | `/api/auth/accept-invitation` | Public | Activate an invited account with a single-use invitation token |
| `POST` | `/api/auth/invitations` | Authenticated owner or admin | Create an invitation for an existing invited user with membership in the selected business |

Protected business routes use a bearer token and an `X-Business-Id` header. The backend verifies the user's active membership and role for the requested business; the header alone does not grant access.

The application also provides business-scoped inventory listing and a protected opening-balance import endpoint. The import feature is disabled by default and its service is restricted to the isolated integration-test database.

The backend health endpoint is `GET /api/health`. Swagger/OpenAPI documentation is documented at `/api/docs` outside production.

## Authentication and authorization

The merged authentication milestone includes:

- Argon2id password hashing and credential verification.
- Signed JWT access tokens with a 15-minute lifetime.
- Database-backed business membership and role resolution.
- Owner/admin invitation creation and transactional, single-use invitation acceptance.
- SHA256-hashed invitation tokens in storage, with a 24-hour expiration.

The current invitation flow requires an existing user with `invited` status and an existing business membership. It does not create new users or memberships. Refresh tokens, logout/revocation, password recovery, rate limiting, and secure invitation delivery remain pending.

## Database and inventory safety

**Protected database:** `fimonaa_commerce`

**Isolated integration-test database:** `fimonaa_commerce_import_test`

Do not run migrations, rollbacks, imports, seeds, destructive SQL, integration tests, or other database writes against the protected database without explicit authorization. TypeORM schema synchronization is disabled (`synchronize: false`).

Six TypeORM migrations are implemented in the repository, including tenant-scoped SKU identifiers and user invitations. Their presence in source control does **not** confirm deployment to the protected database. Migration 5 and migration 6 require explicit deployment review; both refuse automatic rollback.

The Excel SKU workbook remains authoritative. Live Shopify or marketplace stock writes, production opening-balance imports, and inventory cutover are not approved.

## Verification

The authentication implementation merged through PR #7 (`d1c25be`) recorded **151 passing unit tests** and **83 passing integration tests** (234 total). These are milestone results, not a claim of a fresh test run or production readiness.

Non-database-writing build checks from the repository root:

```bash
npm run build:api
npm run build -w apps/web
```

Additional TypeScript test compilation check from `apps/api`:

```bash
npx tsc --project tsconfig.test.json --noEmit
```

Integration tests require verified local `.env.test` and `TEST_DATABASE_URL` configuration targeting only `fimonaa_commerce_import_test`. Do not run them until the database safety checks have been confirmed.

## Development status and next steps

The inventory authorization milestone was merged through PR #6 (`d4e5296`), followed by authentication and invitations through PR #7 (`d1c25be`).

Business membership management is the next engineering priority. Initial read-only service work is checkpointed on `feature/business-membership-management` at `47acd8e`, but its controller, module integration, and tests remain unfinished and unmerged.

Additional work includes authentication hardening, endpoint authorization audits, database deployment and recovery verification, controlled inventory operations, business onboarding, orders and returns, and integrations.

## Shopify and marketplace integration

Shopify OAuth, webhook handling, and live integration credentials must be configured and tested before use. Review required scopes and permissions against the actual integration design; do not treat the scaffold's proposed scopes as approved. Keep client secrets and access tokens out of frontend code and Git.

Live stock writes require an approved design for inventory reservations, idempotency, reconciliation, and operational recovery. Marketplace connectors must use only capabilities authorized for the relevant seller account.

## Documentation

- `docs/development-documentation_v1.4.md`: current implementation and development checkpoint.
- `docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`: Excel authority and controlled cutover.
- `docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`: tenant-scoped inventory identity.
- `docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`: authentication, invitations, and authorization decisions (documentation branch; pending merge).

Earlier development-documentation versions remain historical records.
