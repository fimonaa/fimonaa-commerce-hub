# Fimonaa Commerce Hub

Starter monorepo for Fimonaa's private commerce operations platform.

## Initial architecture

- `apps/api`: NestJS backend API
- `apps/web`: Angular frontend placeholder and setup notes
- `apps/worker`: background job worker placeholder
- `libs/domain`: shared domain contracts
- `infrastructure`: local PostgreSQL and Redis services
- `docs`: integration setup notes

This is a foundation scaffold, not yet a production-ready OMS. Shopify credentials and real OAuth/webhook handling must be configured and tested before using live data.

## Prerequisites

- Node.js 22 LTS
- npm
- Docker Desktop

## Start infrastructure

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

PostgreSQL is exposed locally on `localhost:5432`; Redis on `localhost:6379`.

## Backend setup

```bash
cd apps/api
cp .env.example .env
npm install
npm run start:dev
```

The API listens on `http://localhost:3000`. Health check: `GET /health`.

## Frontend setup

Create the Angular app using the current Angular CLI:

```bash
npx @angular/cli@latest new web --directory apps/web --routing --style=scss --standalone --skip-git
```

Then add the dashboard modules described in `docs/IMPLEMENTATION_PLAN.md`.

## Shopify app setup

Use the Shopify Dev Dashboard to create the app. For local development, configure the app URL and OAuth callback only after the backend is running behind a stable HTTPS development tunnel. Never use a placeholder callback URL as a working URL.

Initial candidate scopes to review:
- `read_products`
- `read_inventory`
- `write_inventory`
- `read_orders`
- `read_locations`

Confirm current Shopify API requirements and protected customer data access before requesting scopes. Store secrets only in backend environment variables or a secret manager.

## Important implementation notes

- Never put Shopify client secrets or access tokens in frontend code or source control.
- Do not enable live stock writes until inventory reservation, idempotency and reconciliation tests pass.
- Each marketplace connector must implement only capabilities documented and authorized for that seller account.
