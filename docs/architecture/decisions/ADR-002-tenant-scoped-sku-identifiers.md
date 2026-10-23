# ADR-002: Tenant-Scoped SKU Identifiers

- **Status:** Accepted (implemented and validated in isolated test databases; protected main database migration pending approval)
- **Date:** 2026-10-23
- **Project:** Fimonaa Commerce Hub
- **Scope:** Fimonaa India, Fimonaa Finland and future SaaS tenants

## Context

Fimonaa Commerce Hub is being developed as a multi-business inventory platform.

Each business must maintain independently owned inventory, stock movements and product identifiers.

The original inventory schema used `inventory_skus.sku` as its primary key. This enforced global SKU uniqueness and prevented different businesses from using identical SKU codes.

ADR-001 establishes that identical human-readable SKU codes may exist across businesses without collision.

The database schema therefore requires a separate internal inventory identifier while preserving business-scoped SKU uniqueness and historical inventory relationships.

## Decision

1. Every inventory record has an internal UUID identifier named `id`.
2. `inventory_skus.id` is the primary key.
3. Human-readable SKU codes are unique within a business, enforced by `UNIQUE (business_id, sku)`.
4. Different businesses may use identical SKU codes.
5. Inventory movements retain their existing composite foreign key `(business_id, sku)`.
6. The obsolete global SKU-only foreign key is removed.
7. Opening-balance imports validate existing inventory within the target business rather than rejecting SKU codes used by other businesses.
8. Automatic rollback of the UUID migration is prohibited because restoring global SKU uniqueness could become impossible after duplicate SKU codes exist across businesses.

## Implementation

Migration:

`1792800000000-AddTenantScopedSkuIdentifiers.ts`

The migration:

1. Adds `inventory_skus.id UUID NOT NULL DEFAULT gen_random_uuid()`.
2. Assigns UUID identifiers to existing inventory records.
3. Removes `inventory_movements_sku_fkey`.
4. Replaces `PRIMARY KEY (sku)` with `PRIMARY KEY (id)`.
5. Preserves the existing `UNIQUE (business_id, sku)` constraint.
6. Preserves the composite inventory movement foreign key.

The opening-balance import service was updated to remove its obsolete global SKU collision query.

Business-specific duplicate-import and existing-inventory protections remain in place.

## Validation

The implementation was validated using isolated PostgreSQL test databases.

### Application checks

- Opening-balance import service: 11 tests passed.
- Complete API test suite: 31 tests passed across 5 suites.
- ESLint: passed.
- NestJS build: passed.
- Git whitespace check: passed.

### Database migration checks

- All five migrations were successfully applied to an isolated empty test database.
- Migration 5 was successfully applied to an isolated populated test database.
- Existing sample inventory records retained their SKU codes and stock quantities.
- Existing sample inventory movements retained their quantities and business-specific relationships.
- Existing inventory records received UUID identifiers.
- Identical SKU codes were successfully inserted for two different businesses with distinct UUID identifiers.
- The cross-business insertion test was rolled back after verification.
- PostgreSQL constraint inspection confirmed the UUID primary key, business-scoped SKU uniqueness and composite movement foreign key.
- The obsolete global SKU foreign key was confirmed absent.

These tests validate the migration against controlled test data. They do not establish that the protected main database has been migrated or that every production-scale scenario has been tested.

## Consequences and Trade-offs

### Benefits

- Independent SKU namespaces for each business.
- Stable internal UUID identity for inventory records.
- Compatibility with the multi-business architecture.
- Preservation of historical movement relationships.
- A foundation for future SaaS tenant isolation.

### Trade-offs

- Queries must use business context when resolving human-readable SKU codes.
- Existing inventory services and APIs require tenant-scoping reviews.
- Inventory movements continue referencing `(business_id, sku)` rather than the new UUID.
- Automatic migration rollback is intentionally unavailable.

## Remaining Work

1. Implement authenticated business context and membership authorization.
2. Scope inventory and dashboard queries to the authorized business.
3. Add integration tests for cross-tenant access restrictions.
4. Review existing inventory consumers for assumptions that SKU codes are globally unique.
5. Prepare and approve a backup, migration, verification and recovery plan before modifying the protected main database.
6. Continue following the inventory source-of-truth and controlled-cutover requirements established in ADR-001.

## Safety Boundary

The original `fimonaa_commerce` development database remains protected and must not be migrated or modified without explicit approval.

The existing Fimonaa India inventory baseline must be preserved.

The SKU Excel workbook remains the authoritative inventory source until a separately approved cutover.

This ADR records an implemented and test-validated architectural decision. It does not authorize production deployment, live inventory synchronization or an inventory source-of-truth change.
