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
- **backend/**: Express/TypeScript API for the Omari operations workflows plus Prisma schema files documenting the longer-term data model direction.
