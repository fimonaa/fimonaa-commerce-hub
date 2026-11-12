# API Feature Modules

This directory contains NestJS feature modules for Fimonaa Commerce Hub. The API uses a global `/api` prefix and verifies business membership and role for protected business routes.

## Existing modules

| Module | Current responsibility |
|---|---|
| `auth` | Login, JWT authentication, invitations, verified business context, and role guards |
| `business-memberships` | Read-only business membership listing and individual retrieval for owners and admins |
| `inventory` | Business-scoped inventory listing, filtering, search, and pagination |
| `imports` | Guarded opening-balance import functionality, restricted to the isolated test database |
| `dashboard` | Dashboard functionality; tenant-scoping review remains outstanding |
| `health` | Health endpoint |

The membership endpoints are `GET /api/business-memberships` and `GET /api/business-memberships/:membershipId`. Responses include only `id`, `userId`, `email`, `status`, `role`, and `createdAt`. The implementation merged through PR #9 (`5de2992`) and did not add a database migration.

## Planned modules and capabilities

- `catalog`: internal products, variants, and SKU mapping.
- `channels`: external channel integration orchestration.
- `orders`: business-scoped orders and order items.
- `fulfillment`: dispatch and fulfillment workflows.
- `sync`: reconciliation, checkpoints, and controlled synchronization.
- `audit`: operational audit records and change history.
- `shopify-auth`: approved Shopify authentication flow.
- `shopify-webhooks`: verified Shopify webhook processing.

Further work within existing modules includes inventory adjustments, movement ledger, reservations, warehouse support, membership creation and role changes, removal, last-owner safeguards, and authentication hardening. Planned names describe future architecture, not implemented modules.

## Safety requirements

The protected `fimonaa_commerce` database must not be modified without explicit authorization. Integration tests must use only `fimonaa_commerce_import_test`. The Excel SKU workbook remains the inventory source of truth until an approved cutover. No production import or external inventory write is authorized by the current implementation.

See `docs/development-documentation_v1.5.md` for the complete development checkpoint and `docs/IMPLEMENTATION_PLAN.md` for the operational roadmap.
