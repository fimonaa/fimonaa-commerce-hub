# Fimonaa Commerce Hub

Fimonaa Commerce Hub is an inventory-first, multi-business commerce operations platform under development for Fimonaa India, Fimonaa Finland, and potential future business workspaces.

**Status:** The backend includes authentication, invitations, business-scoped authorization, inventory listing, read-only business membership management, and guarded opening-balance import functionality. It is **not production-ready**. The Excel SKU workbook remains the inventory source of truth until an explicitly approved cutover.

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

The application also provides business-scoped inventory listing and a protected opening-balance import endpoint.

Read-only business membership management was merged through PR #9 (`5de2992`):

| Method | Route | Access | Response |
|---|---|---|---|
| `GET` | `/api/business-memberships` | Authenticated owner or admin | `{ "items": BusinessMember[] }` |
| `GET` | `/api/business-memberships/:membershipId` | Authenticated owner or admin | `BusinessMember` or `404` |

The membership identifier must be a UUID. Both routes use the verified `X-Business-Id` context. The response contains `id`, `userId`, `email`, `status`, `role`, and `createdAt`; sensitive user fields are excluded. These endpoints do not create, modify, or remove memberships. Invalid membership UUIDs return `400`; missing or invalid authentication returns `401`; insufficient role permissions return `403`; and unknown or cross-business membership IDs return `404`. The import feature is disabled by default and its service is restricted to the isolated integration-test database.

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

The read-only membership milestone merged through PR #9 (`5de2992`) recorded **163 passing unit tests across 23 suites** and **96 passing integration tests across 11 suites** (**259 total**). The milestone added 12 membership unit tests and 13 membership HTTP integration tests. TypeScript compilation, ESLint, API build, and two GitHub CI checks passed. These are recorded milestone results, not a claim of a fresh test run or production readiness.

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

The inventory authorization milestone merged through PR #6 (`d4e5296`), authentication and invitations through PR #7 (`d1c25be`), v1.4 documentation through PR #8 (`537bc9f`), and read-only business membership management through PR #9 (`5de2992`).

Business membership management Phase 1 is complete. Membership creation, provisioning, role updates, removal, and last-active-owner safeguards remain pending. These mutating operations require separate design and testing.

Additional work includes authentication hardening, endpoint authorization audits, database deployment and recovery verification, controlled inventory operations, business onboarding, orders and returns, and integrations.

## Shopify and marketplace integration

Shopify OAuth, webhook handling, and live integration credentials must be configured and tested before use. Review required scopes and permissions against the actual integration design; do not treat the scaffold's proposed scopes as approved. Keep client secrets and access tokens out of frontend code and Git.

Live stock writes require an approved design for inventory reservations, idempotency, reconciliation, and operational recovery. Marketplace connectors must use only capabilities authorized for the relevant seller account.

## Documentation

- `docs/development-documentation_v1.5.md`: latest implementation and development checkpoint. Earlier versions, including v1.4, remain historical records.
- `docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`: Excel authority and controlled cutover.
- `docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`: tenant-scoped inventory identity.
- `docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`: authentication, invitations, and authorization decisions (merged through PR #8).

Earlier development-documentation versions remain historical records.
