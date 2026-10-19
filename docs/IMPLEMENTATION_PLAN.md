# Fimonaa Commerce Hub Implementation Plan

## Current foundation
- Monorepo with React, TypeScript, Vite and Tailwind CSS frontend.
- NestJS API with PostgreSQL and Redis infrastructure.
- Opening balance imported into PostgreSQL: 318 SKUs and 2,027 available units.
- Dashboard summary reads live inventory metrics from PostgreSQL.
- External sales channels are not connected. No marketplace stock writes are enabled.

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