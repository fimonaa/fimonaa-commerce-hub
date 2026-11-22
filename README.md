# Fimonaa Commerce Hub

Fimonaa Commerce Hub is an inventory-first, multi-business commerce operations platform under development for Fimonaa India, Fimonaa Finland, and potential future business workspaces.

**Current milestone:** Business Membership Management Phase 2B, merged through PR #11 (`c852d35`).

**Status:** The backend includes authentication, account activation, business membership invitations, business-scoped authorization, inventory listing, membership lifecycle administration, and guarded opening-balance import functionality.

**Production readiness:** The platform is **not production ready**.

The Excel SKU workbook remains the authoritative inventory source until an explicitly approved cutover.

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

From the repository root, prepare the backend environment:

```bash
cp apps/api/.env.example apps/api/.env
```

Review the database configuration before starting the API.

Then run:

```bash
npm install
npm run dev:api
```

**Database safety:** The normal `DATABASE_URL` may point to the protected `fimonaa_commerce` database.

Confirm the target and use an appropriate development database.

Starting the API does not authorize migrations, imports, seeds or writes to protected inventory.

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

| Milestone                               | Reference                    | Status      |
| --------------------------------------- | ---------------------------- | ----------- |
| Business-scoped inventory authorization | PR #6, `d4e5296`             | Merged      |
| Authentication and initial invitations  | PR #7, `d1c25be`             | Merged      |
| Development Documentation v1.4          | PR #8, `537bc9f`             | Merged      |
| Business Membership Management Phase 1  | PR #9, `5de2992`             | Merged      |
| Development Documentation v1.5          | PR #10, `f757124`            | Merged      |
| Business Membership Management Phase 2B | PR #11, `c852d35`            | Merged      |
| Development Documentation v1.6          | Current documentation branch | In progress |

### Recommended next milestone

**Phase 2C: Business Membership Administration Frontend**

Build the frontend experience for authorized users to manage:

- Business memberships.
- Member roles.
- Membership suspension and reactivation.
- Membership removal.
- Business membership invitations.
- Invitation acceptance and revocation.

The frontend must use the existing backend authorization model and verified business context.

### Additional development priorities

Further work includes:

1. Business onboarding and initial owner provisioning.
2. Authentication and session security hardening.
3. Comprehensive authorization and tenant-isolation audits.
4. Membership and invitation audit logging.
5. Database deployment and recovery verification.
6. Controlled inventory import and reconciliation.
7. Inventory ledger and warehouse management.
8. Orders and returns.
9. Shopify and marketplace integrations.
10. Approved inventory source-of-truth cutover.

These remain separate development milestones.

## Shopify and marketplace integration

Shopify OAuth, webhook handling and live integration credentials must be configured and tested before use.

Review required scopes and permissions against the actual integration design.

Do not treat the scaffold's proposed scopes as approved.

Keep client secrets and access tokens out of frontend code and Git.

Live stock writes require an approved design for inventory reservations, idempotency, reconciliation and operational recovery.

Marketplace connectors must use only capabilities authorized for the relevant seller account.

## Documentation

The repository maintains versioned development documentation.

**Current development documentation:**

`docs/development-documentation_v1.6.md`

This document covers the completed Phase 2B implementation, authentication, membership lifecycle, invitations, migrations, testing, database safety and future development priorities.

**Implementation plan:**

`docs/IMPLEMENTATION_PLAN.md`

**Historical development documentation:**

`docs/development-documentation_v1.5.md`

Earlier versions remain historical records.

**Architecture decisions:**

- `docs/architecture/decisions/ADR-001-inventory-source-of-truth.md`: Excel authority and controlled cutover.
- `docs/architecture/decisions/ADR-002-tenant-scoped-sku-identifiers.md`: Tenant-scoped inventory identity.
- `docs/architecture/decisions/ADR-003-authentication-and-business-authorization.md`: Authentication, invitations and authorization decisions.

Historical architecture decisions must be preserved unless separately reviewed.

---

**Fimonaa Commerce Hub**

Inventory-first commerce operations for multiple businesses.

**Current development milestone:** Business Membership Management Phase 2B completed.

**Next proposed milestone:** Phase 2C, Business Membership Administration Frontend.

**Production status:** Not production ready.
