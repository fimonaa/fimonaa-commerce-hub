# ADR-001: Inventory Source of Truth and Controlled Cutover

- **Status:** Accepted (architecture decision; implementation pending)
- **Date:** 2026-10-23
- **Project:** Fimonaa Commerce Hub
- **Scope:** Fimonaa India and Fimonaa Finland initially; future SaaS tenants by design

## Context

Fimonaa currently uses its SKU Excel workbook as the authoritative record for inventory. Commerce Hub is being developed as an inventory-first, multi-business platform that will eventually synchronize sellable stock to Shopify stores and approved marketplaces. The initial India baseline recorded in development is 318 SKUs and 2,027 available units; Finland begins with no inventory. Those figures are a historical development baseline, not a claim about current live stock.

A premature change in inventory authority could cause overselling, missed orders, inconsistent marketplace stock or incorrect inventory balances. Marketplace APIs may be delayed, restricted or unavailable.

## Decision

1. **Current authority:** The Fimonaa SKU Excel workbook remains the source of truth until an explicitly approved cutover. Commerce Hub's development database and imported opening balances are not automatically authoritative.
2. **Future authority:** Commerce Hub will become the central inventory authority **per business** and publish calculated available-to-sell quantities to connected Shopify stores and marketplaces.
3. **Business isolation:** India and Finland have independently owned SKUs, warehouses, movements, orders and integrations. Identical human-readable SKU codes may exist in different businesses without collision.
4. **Inventory integrity:** All stock changes must be traceable through auditable movements and business-specific stock records. Reservations, adjustments, returns and fulfillment events must be processed idempotently.
5. **Integration model:** Inbound orders and relevant events are validated and recorded centrally; outbound stock publication is asynchronous, retriable, observable and reconciled. Channel-specific buffers and allocations may be used to reduce overselling.
6. **No premature activation:** Do not enable live inventory writes to Shopify or marketplaces, rerun opening-balance imports, or change the main inventory database without explicit authorization and an approved operational plan.
7. **Future SaaS:** Design for tenant separation from the start, but defer public tenant onboarding, subscription billing and broad marketplace coverage until the Fimonaa-first system is proven.

## Proposed transition stages

1. **Excel-authoritative development:** Build and test business-scoped inventory models and import validation in isolated environments.
2. **Read-only channel integration:** Connect Shopify India and Finland for catalog/order observation without publishing stock changes.
3. **Reconciliation:** Compare Excel, Commerce Hub and channel quantities, investigate discrepancies, and establish stock/reservation rules.
4. **Shadow operation:** Process events and calculate proposed available-to-sell quantities without updating channels; compare results and measure discrepancies.
5. **Controlled cutover:** With explicit approval, verified backups, a documented rollback plan and monitoring, designate Commerce Hub as inventory authority for a clearly scoped business/channel set.
6. **Operational expansion:** Add approved marketplace connectors and ongoing reconciliation, alerts and recovery procedures.

## Cutover acceptance criteria

- Inventory reconciled to an approved, time-stamped Excel baseline and physical/operational adjustments.
- Business membership authorization and cross-tenant isolation tested.
- Inventory ledger, reservations and idempotent order/event processing tested.
- Marketplace/store credentials and permitted API operations verified.
- Retry, rate-limit handling, reconciliation, observability and alerting exercised.
- Backups restored successfully in a test environment; rollback and incident ownership documented.
- Explicit business-owner approval recorded for the scope and time of cutover.

## Consequences and trade-offs

- **Benefits:** A single operational inventory authority, better auditability, centralized multichannel stock management and a reusable SaaS foundation.
- **Costs:** Additional complexity for asynchronous synchronization, reservation logic, channel mappings, marketplace approval and ongoing monitoring.
- **Risk:** Temporary channel stock divergence is possible; design must minimize, detect and reconcile it rather than assume instantaneous consistency.

## Near-term engineering priorities

1. Tenant-scoped SKU identity and foreign-key integrity in isolated test databases.
2. Authentication, memberships and business-scoped APIs.
3. Inventory ledger, warehouses, reservations and reconciliation tooling.
4. Shopify read-only pilots followed by controlled integration tests.

## Safety boundary

The original `fimonaa_commerce` development database must not be migrated or altered without explicit approval. Excel remains authoritative until the cutover is completed and signed off. This ADR records a decision; it does **not** imply that any live synchronization or database cutover has happened.
