# Omari Inventory App

This repository powers the Omari HQ inventory workflow: receiving goods into HQ, tracking live stock across locations, issuing serialized assets to branches or people, and keeping a document-backed audit trail.

## Current Scope

- Receiving register with manual and batch intake
- Live HQ stock with per-location balances
- Issue-out, acknowledgement, and return workflows
- Operations dashboard backed by real audit data

## Key References

- MVP foundation: `docs/omari-mvp-foundation.md`
- Target Omari schema: `backend/prisma/schema.omari.prisma`

## Project Structure

- **frontend/**: Next.js application with route wrappers in `src/app`, route-level screens in `src/screens`, shared UI in `src/components`, and API/store code in `src/services`.
- **backend/**: Express/TypeScript API for the Omari operations workflows, wired for MySQL across runtime, schema bootstrap, and regression testing.

## Database Runtime

- Runtime target: MySQL
- Backend env template: `backend/.env.example`
- Verified during regression and smoke testing with MySQL 8.0
- Current backend driver expects an application user configured with `mysql_native_password`
- Bootstrap schema and seed baseline data explicitly with `cd backend && npm run db:bootstrap`
- Verify schema readiness before deploys with `cd backend && npm run db:verify`
- Normal runtime and verification are fail-fast: they do not create the database, tables, or repair data implicitly

The backend now expects MySQL credentials to be configured before startup. Runtime API startup no longer creates or repairs tables implicitly; bootstrap and verification happen through the explicit backend scripts above. Regression coverage also runs against ephemeral MySQL instances, so the repo uses one database engine end to end.
