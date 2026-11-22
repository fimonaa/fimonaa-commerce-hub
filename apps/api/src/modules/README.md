# API Feature Modules

This directory contains the NestJS feature modules for Fimonaa Commerce Hub.

The API uses a global `/api` prefix and enforces authentication, verified business membership, and role-based authorization for protected business routes.

**Current implementation milestone:** Business Membership Management Phase 2B, merged through PR #11 (`c852d35`).

**Production status:** Not production ready.

## Existing modules

| Module                 | Current responsibility                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                 | Login, JWT authentication, account activation invitations, business membership invitations, verified business context, and role guards |
| `business-memberships` | Business membership listing, retrieval, role updates, suspension, reactivation, and removal                                            |
| `inventory`            | Business-scoped inventory listing, filtering, search, and pagination                                                                   |
| `imports`              | Guarded opening-balance import functionality, restricted to the isolated test database                                                 |
| `dashboard`            | Dashboard functionality; tenant-scoping review remains outstanding                                                                     |
| `health`               | Health endpoint                                                                                                                        |

## Authentication and authorization

The `auth` module provides JWT authentication, invitation workflows, verified business context, and role-based authorization.

Protected business routes require a valid access token and a verified business context.

The backend must resolve the user's membership and permissions for the requested business. A client-supplied business identifier alone does not grant access.

### Account authentication and activation

| Method | Endpoint                      | Purpose                                         |
| ------ | ----------------------------- | ----------------------------------------------- |
| `POST` | `/api/auth/login`             | Authenticate a user                             |
| `POST` | `/api/auth/accept-invitation` | Accept an initial account activation invitation |
| `POST` | `/api/auth/invitations`       | Create an initial account activation invitation |

The initial account activation workflow is separate from business membership invitations.

### Business membership invitations

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

Invitation records are business-specific and include token hashes, expiration timestamps, and acceptance or revocation information.

## Business Membership Management

Business Membership Management was delivered in two stages.

### Phase 1: Read-only membership management

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

### Phase 2B: Membership lifecycle management

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

### Membership lifecycle states

The membership lifecycle supports:

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

## Database migrations

Eight TypeORM migrations are implemented in the repository.

Phase 2B introduced:

**Migration 7: Business Membership Lifecycle**

Adds membership lifecycle status, update timestamps, removal timestamps, and supporting database constraints.

**Migration 8: Business Membership Invitations**

Introduces the business membership invitation table, token hash uniqueness, invitation lifecycle timestamps, business relationships, and integrity constraints.

The presence of migrations in source control does not confirm their deployment to the protected database.

Database migration execution requires separate authorization and deployment verification.

## Planned modules and capabilities

The following modules are planned but are not implemented as completed production capabilities:

| Module             | Planned responsibility                                      |
| ------------------ | ----------------------------------------------------------- |
| `catalog`          | Internal products, variants, and SKU mapping                |
| `channels`         | External channel integration orchestration                  |
| `orders`           | Business-scoped orders and order items                      |
| `fulfillment`      | Dispatch and fulfillment workflows                          |
| `sync`             | Reconciliation, checkpoints, and controlled synchronization |
| `audit`            | Operational audit records and change history                |
| `shopify-auth`     | Approved Shopify authentication flow                        |
| `shopify-webhooks` | Verified Shopify webhook processing                         |

Further work within existing modules includes:

- Authentication hardening and session management.
- Secure invitation delivery.
- Comprehensive membership audit logging.
- Verification of last-active-owner safeguards.
- Business onboarding and initial owner provisioning.
- Inventory adjustments and movement ledger.
- Inventory reservations.
- Warehouse management.
- Endpoint authorization and tenant-isolation audits.

Planned module names describe future architecture, not implemented modules.

## Verification

The Phase 2B implementation recorded:

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

These results belong to the completed implementation milestone and do not imply production readiness.

## Safety requirements

**Protected database:** `fimonaa_commerce`

**Isolated integration-test database:** `fimonaa_commerce_import_test`

The protected database must not be modified without explicit authorization.

Do not run migrations, rollbacks, imports, seeds, destructive SQL, integration tests, or other database writes against the protected database without explicit approval.

Integration tests must target only the isolated test database.

The Excel SKU workbook remains the authoritative inventory source until an approved cutover.

No production opening-balance import or external inventory write is authorized by the current implementation.

## Documentation

For complete technical details, refer to:

- `docs/development-documentation_v1.6.md`: Current development documentation and Phase 2B implementation checkpoint.
- `docs/IMPLEMENTATION_PLAN.md`: Implementation roadmap and development priorities.
- `docs/development-documentation_v1.5.md`: Historical Phase 1 documentation.

Earlier documentation versions remain historical records.

---

**Fimonaa Commerce Hub**

**Current milestone:** Business Membership Management Phase 2B completed.

**Next proposed milestone:** Phase 2C, Business Membership Administration Frontend.

**Production status:** Not production ready.
