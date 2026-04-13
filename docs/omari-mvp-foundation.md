# Omari Inventory MVP Foundation

## Product Goal

Build a focused inventory operations app for Omari that does four things well:

1. Receive goods at HQ.
2. Maintain live HQ stock.
3. Issue items to branches or people.
4. Keep a complete audit trail with documents.

This repository already contains parts of that workflow. The purpose of this document is to define the MVP clearly so the next build steps stay aligned.

## MVP Scope

The first usable Omari app must support the following end-to-end workflow:

`Receive at HQ -> Store in HQ stock -> Issue out from HQ -> Review movement and documents`

### In Scope

- Supplier master data used during receiving.
- Branch master data used during issue-out.
- Item master data with serialized and non-serialized support.
- Manual and batch receiving at HQ.
- HQ stock view based on real transactions.
- Issue-out to a branch or directly to a person.
- Attachment upload for receipts and issue-out records.
- User attribution for stock actions.
- Dashboard metrics based on receipts, stock, and issue-out activity.

### Out of Scope for MVP

- Full branch inventory management.
- Purchase order management.
- Finance dashboards from the original tutorial dataset.
- Returns, repairs, disposals, and stock adjustments beyond the basic schema hooks.
- Complex approval workflows.
- Mobile app support.

## Current Repository Direction

### Core Omari Modules to Keep Building

- `frontend/src/screens/receiving`
- `frontend/src/screens/inventory`
- `frontend/src/screens/transfers`
- `frontend/src/screens/suppliers`
- `frontend/src/screens/users`
- `backend/src/routes/operationsRoutes.ts`
- `backend/src/lib/operationsData.ts`

### Legacy Tutorial Modules to Park

- Tutorial-style products catalog flows.
- Tutorial-style expenses flows.
- Tutorial-style finance summaries and charts.
- Placeholder settings that are not connected to real user data.

These can stay in the repo temporarily, but they should not drive the Omari roadmap.

## Source of Truth Decision

The current application mixes:

- file-backed tutorial data
- operational inventory data
- an older Prisma schema that models a retail dashboard instead of Omari operations

For the Omari build, the long-term source of truth should be a single Prisma schema that represents the operational domain clearly. To avoid breaking the current prototype during Step 1, the target schema is defined in:

- `backend/prisma/schema.omari.prisma`

The existing `backend/prisma/schema.prisma` is retained temporarily as a legacy tutorial artifact until we switch the app over during the build steps.

## Core Domain Model

The Omari MVP should be built around these entities:

- `User`
  Records who received stock, issued stock, and uploaded documents.
- `Supplier`
  Used when logging receipts into HQ.
- `Branch`
  Used when issuing stock to branch destinations.
- `StockLocation`
  Represents HQ storage locations. Branch-side balances are not part of MVP yet.
- `ItemCategory`
  Groups items such as laptops, network devices, stationery, and tablets.
- `Item`
  Defines the stockable thing, including whether it is serialized.
- `ItemSupplier`
  Connects items to suppliers for preferred sourcing and traceability.
- `Receipt`
  Header record for a delivery received at HQ.
- `ReceiptLine`
  Line items captured under a receipt.
- `SerialAsset`
  Tracks serial numbers for items that must be individually controlled.
- `IssueOut`
  Header record for stock leaving HQ.
- `IssueOutLine`
  Individual lines or serial assets issued under an issue-out transaction.
- `Attachment`
  Supports receipt and issue-out documents.
- `StockMovement`
  Inventory ledger used to derive live HQ stock.

## Business Rules

### Receiving

- Each receipt must record supplier, arrival date, signed by, received by, and document status.
- Each receipt line must record item, quantity, unit cost, total cost, and HQ storage location.
- Serialized items must produce serial asset records.
- Receiving creates positive stock movements into HQ.

### HQ Stock

- HQ stock is derived from movements, not entered manually.
- Serialized availability is derived from serial asset status.
- Low-stock alerts come from item reorder levels and current HQ balance.

### Issue Out

- Issue-out can target either a branch or a named person.
- Only available HQ stock can be issued.
- Serialized items must be issued using a valid available serial number.
- Issue-out creates negative stock movements from HQ.
- Issued serial assets remain traceable through the issue-out record even though branch inventory is not yet modeled.

### Audit Trail

- Every receipt and issue-out can have attachments.
- Every stock-affecting action should be attributable to a user.
- Dashboard metrics should come from real operational records, not tutorial seed summaries.

## Module Targets By Build Step

### Step 2: Receiving

- Create receipt API and persistence.
- Manual receipt form.
- Batch upload flow.
- Receipt attachments.

### Step 3: Live HQ Stock

- Stock derived from receipts and issues.
- HQ stock summary and table.
- Serialized and non-serialized calculations.
- Low-stock indicators.

### Step 4: Issue Out

- Create issue-out API using the Omari schema.
- Link issue-out to real items, branches, users, and serial assets.
- Preserve documents and notes.

### Step 5: Dashboard and Audit

- Real dashboard metrics.
- Activity summaries.
- Pending document review counts.
- Stock movement and issue history reports.

## Definition of Done for Step 1

Step 1 is complete when:

- the MVP is written down clearly
- the Omari domain entities are defined
- the repo has a visible target schema for the build
- the team can begin Step 2 without guessing how stock should work
