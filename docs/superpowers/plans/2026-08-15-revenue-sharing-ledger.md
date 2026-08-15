# Revenue Sharing Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant, auditable placement revenue allocation ledger with deterministic recruiter/platform splits and compensating reversals, without moving money.

**Architecture:** Introduce `MarketplacePlacement` as the tenant-safe source record connected to `CandidateApplication`, leaving the legacy floating-point payment models untouched. A pure calculation service owns validation and rounding; controllers persist placement, allocation, ledger, and audit records transactionally behind client-scoped routes.

**Tech Stack:** Node.js CommonJS, Express, Prisma, PostgreSQL, Vitest, Supertest, Docker Compose.

## Global Constraints

- Store monetary values as integer minor units and currencies as uppercase ISO 4217 codes.
- Store shares as integer basis points totaling exactly `10000`; default to recruiter `7000` and platform `3000`.
- Allocate rounding residuals to Blinkfy.
- Never initiate payments, accept payment credentials, or mutate the legacy `Placement` and `WalletTransaction` models.
- Require workspace/client isolation, human authorization, transactional writes, idempotency, and non-sensitive audit metadata.
- Keep Dependabot remediation as the final M5 release gate tracked by issue #137, in a separate change set from financial-domain implementation.

---

### Task 1: Deterministic Revenue Split Domain

**Files:**
- Create: `apps/api/src/services/blinkfy/revenueSplitService.js`
- Test: `apps/api/test/blinkfy/revenueSplitService.test.js`

**Interfaces:**
- Produces: `calculateRevenueSplit({ currency, grossAmountMinor, recruiterBasisPoints?, platformBasisPoints? })`
- Returns: `{ currency, grossAmountMinor, recruiterBasisPoints, platformBasisPoints, recruiterAmountMinor, platformAmountMinor, confirmed: false, transferred: false }`

- [ ] **Step 1: Write failing tests for the default split and residual rule**

```js
const { calculateRevenueSplit } = require('../../src/services/blinkfy/revenueSplitService');

test('uses the 70/30 default and assigns the residual to Blinkfy', () => {
  expect(calculateRevenueSplit({ currency: 'brl', grossAmountMinor: 101 })).toEqual({
    currency: 'BRL', grossAmountMinor: 101,
    recruiterBasisPoints: 7000, platformBasisPoints: 3000,
    recruiterAmountMinor: 70, platformAmountMinor: 31,
    confirmed: false, transferred: false,
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test --workspace=apps/api -- revenueSplitService.test.js`

Expected: FAIL because `revenueSplitService` does not exist.

- [ ] **Step 3: Add validation tests**

Test that zero, negative, non-integer, and greater-than-safe-integer amounts fail; malformed currencies fail; non-integer basis points fail; and shares not totaling `10000` fail.

- [ ] **Step 4: Implement the pure calculation service**

Use `Number.isSafeInteger`, `/^[A-Z]{3}$/`, integer basis-point validation, `Math.floor(grossAmountMinor * recruiterBasisPoints / 10000)`, and subtraction for the platform amount. Do not import Prisma or mutate input.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm run test --workspace=apps/api -- revenueSplitService.test.js`

Expected: PASS with all split and validation cases.

Commit: `feat: add deterministic revenue split domain`

---

### Task 2: Multi-Tenant Placement and Ledger Schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260815010000_marketplace_revenue_sharing/migration.sql`
- Test: `apps/api/test/blinkfy/revenueSharingSchema.test.js`

**Interfaces:**
- Produces Prisma models: `MarketplacePlacement`, `PlacementRevenueAllocation`, `PlacementRevenueLedgerEntry`
- Produces enums: `MarketplacePlacementStatus`, `RevenueAllocationStatus`, `RevenueLedgerEntryKind`
- Extends `ApplicationStage` with terminal stage `hired`

- [ ] **Step 1: Write a failing database constraint test**

Create a workspace, client, recruiter, shortlisted application, and marketplace placement. Attempt to create two allocations with the same `placementId`; assert the second write rejects. Attempt an allocation whose basis points do not total `10000`; assert PostgreSQL rejects it.

- [ ] **Step 2: Run the schema test and verify RED**

Run: `npm run test --workspace=apps/api -- revenueSharingSchema.test.js`

Expected: FAIL because the Prisma models do not exist.

- [ ] **Step 3: Add Prisma models and relations**

Add tenant relations to `Workspace` and `Client`; add a named recruiter relation to `User`; connect `MarketplacePlacement.applicationId` uniquely to `CandidateApplication`; connect one optional allocation to each placement; and connect ledger entries to their allocation. Store money and basis points as Prisma `Int` and currency as `String @db.Char(3)`.

- [ ] **Step 4: Add SQL constraints and indexes**

The migration must enforce:

```sql
CHECK ("grossAmountMinor" > 0),
CHECK ("recruiterBasisPoints" BETWEEN 0 AND 10000),
CHECK ("platformBasisPoints" BETWEEN 0 AND 10000),
CHECK ("recruiterBasisPoints" + "platformBasisPoints" = 10000),
CHECK ("recruiterAmountMinor" >= 0),
CHECK ("platformAmountMinor" >= 0),
CHECK ("recruiterAmountMinor" + "platformAmountMinor" = "grossAmountMinor")
```

Add unique indexes for marketplace placement by application, original allocation by placement, and reversal entry by allocation plus kind.

- [ ] **Step 5: Reset the disposable test database, run migrations, generate Prisma, and verify GREEN**

Run: `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate reset --force --schema apps/api/prisma/schema.prisma`

Run: `npx prisma generate --schema apps/api/prisma/schema.prisma`

Run: `npm run test --workspace=apps/api -- revenueSharingSchema.test.js`

Expected: PASS, including uniqueness and check constraints.

- [ ] **Step 6: Commit**

Commit: `feat: add multi-tenant revenue ledger schema`

---

### Task 3: Marketplace Placement Confirmation

**Files:**
- Create: `apps/api/src/controllers/blinkfy/marketplacePlacementsController.js`
- Create: `apps/api/src/routes/blinkfy/marketplacePlacements.js`
- Modify: `apps/api/src/routes/blinkfy/index.js`
- Modify: `apps/api/src/controllers/blinkfy/applicationsController.js`
- Test: `apps/api/test/blinkfy/marketplacePlacements.test.js`

**Interfaces:**
- Produces: `POST /api/blinkfy/clients/:clientId/placements`
- Consumes: `{ applicationId, recruiterUserId }`
- Returns: `{ placement: { id, applicationId, recruiterUserId, status: 'confirmed', createdAt } }`

- [ ] **Step 1: Write failing authorization and lifecycle tests**

Test that an owner/admin can confirm a shortlisted application, a recruiter cannot confirm placements, an application outside the active client/workspace returns `404`, a non-shortlisted application returns `422`, and a repeated application returns `409`.

- [ ] **Step 2: Run the focused API test and verify RED**

Run: `npm run test --workspace=apps/api -- marketplacePlacements.test.js`

Expected: FAIL with `404` because the route is absent.

- [ ] **Step 3: Implement the client-scoped router and controller**

Mount the router at `/clients/:clientId/placements`. Apply `requireWorkspaceRole('owner', 'admin')` followed by `requireClientAccess`. Query the application through `clientId` and `candidate.workspaceId`. Validate the recruiter has an active membership in the same workspace with role `recruiter`, `admin`, or `owner`.

- [ ] **Step 4: Persist placement, hired transition, and audit atomically**

Within one Prisma transaction, lock the application row, re-check `stage === 'shortlisted'`, create `MarketplacePlacement`, update `CandidateApplication.stage` to `hired`, set a new `hiredAt`, and record `marketplace.placement_confirmed` with IDs only. Map unique constraint `P2002` to `409`.

- [ ] **Step 5: Run focused and pipeline tests**

Run: `npm run test --workspace=apps/api -- marketplacePlacements.test.js pipeline.test.js`

Expected: PASS, including existing stage transition tests and new terminal `hired` serialization.

- [ ] **Step 6: Commit**

Commit: `feat: confirm multi-tenant marketplace placements`

---

### Task 4: Allocation Preview and Confirmation

**Files:**
- Create: `apps/api/src/controllers/blinkfy/revenueSharingController.js`
- Create: `apps/api/src/routes/blinkfy/revenueSharing.js`
- Modify: `apps/api/src/routes/blinkfy/index.js`
- Test: `apps/api/test/blinkfy/revenueSharing.test.js`

**Interfaces:**
- Produces: `POST /api/blinkfy/clients/:clientId/revenue-sharing/preview`
- Produces: `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations`
- Consumes calculation service from Task 1 and models from Tasks 2–3.

- [ ] **Step 1: Write failing preview tests**

Assert that preview uses the placement recruiter, normalizes currency, returns the deterministic split with `confirmed: false` and `transferred: false`, creates no allocation, and rejects placements outside client/workspace scope.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test --workspace=apps/api -- revenueSharing.test.js`

Expected: FAIL with `404` because revenue-sharing routes are absent.

- [ ] **Step 3: Implement preview**

Owners/admins may preview any placement in the client. Recruiters may preview only when `placement.recruiterUserId === req.user.id`. Ignore any recruiter ID supplied by the request body; the persisted placement is authoritative.

- [ ] **Step 4: Add failing confirmation tests**

Assert allocation plus ledger entry plus audit are created in one transaction; the stored amounts equal the preview; status is `pending`; `transferred` is false; duplicate sequential and concurrent requests produce only one allocation; and unauthorized recruiters receive `404`.

- [ ] **Step 5: Implement transactional confirmation**

Lock the marketplace placement row, reject canceled placements, calculate again on the server, create `PlacementRevenueAllocation`, create the positive `allocation` ledger entry, and record `marketplace.revenue_allocated`. Return `201`; map uniqueness conflicts to `409`. Do not call payment services.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm run test --workspace=apps/api -- revenueSharing.test.js`

Expected: PASS for preview, confirmation, concurrency, authorization, and audit cases.

Commit: `feat: add revenue allocation preview and confirmation`

---

### Task 5: Ledger Query and Compensating Reversal

**Files:**
- Modify: `apps/api/src/controllers/blinkfy/revenueSharingController.js`
- Modify: `apps/api/src/routes/blinkfy/revenueSharing.js`
- Modify: `apps/api/test/blinkfy/revenueSharing.test.js`

**Interfaces:**
- Produces: `GET /api/blinkfy/clients/:clientId/revenue-sharing/ledger`
- Produces: `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations/:allocationId/reverse`

- [ ] **Step 1: Write failing ledger isolation tests**

Create entries for two workspaces and clients. Assert list returns only the active client entries, newest first, with placement/recruiter IDs, amounts, currency, status, and timestamps. Assert recruiter users see only their own entries while owner/admin users see all client entries.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test --workspace=apps/api -- revenueSharing.test.js`

Expected: FAIL because list and reversal handlers are absent.

- [ ] **Step 3: Implement ledger listing**

Select only documented fields. Do not include candidate profile, payment credentials, tax documents, provider identifiers, or arbitrary audit metadata.

- [ ] **Step 4: Write failing reversal tests**

Assert owner/admin reversal creates one negative ledger entry, marks the allocation `reversed`, preserves the original entry, records `marketplace.revenue_reversed`, and returns `409` for a second or concurrent reversal. Assert recruiters receive `403`.

- [ ] **Step 5: Implement compensating reversal transaction**

Lock the allocation row, confirm client/workspace ownership and non-reversed status, create the negative `reversal` entry, set `status = 'reversed'` and `reversedAt`, and record the audit event. Never delete or update the original ledger entry.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm run test --workspace=apps/api -- revenueSharing.test.js`

Expected: PASS for isolation, ownership, reversal, idempotency, and immutable evidence.

Commit: `feat: add revenue ledger queries and reversals`

---

### Task 6: Documentation, Full Verification, and M5 Handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-15-revenue-sharing-ledger-design.md`
- Create: `.superpowers/sdd/2026-08-15-revenue-sharing-ledger/verification.md`

**Interfaces:**
- Documents endpoint contracts, guardrails, migrations, verification evidence, and the separation from payment execution.

- [ ] **Step 1: Document the feature and non-payment boundary**

Add the four endpoints, role matrix, default split, residual rule, state model, and explicit statement that no funds are transferred. Document that legacy `Placement`, `WalletTransaction`, and `paymentService.js` are unchanged.

- [ ] **Step 2: Run database verification**

Run: `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`

Run: `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate status --schema apps/api/prisma/schema.prisma`

Expected: migrations apply successfully and schema is up to date.

- [ ] **Step 3: Run the complete repository verification**

Run: `npm run test --workspace=apps/api`

Run: `npm run test --workspace=apps/web`

Run: `npm run build --workspace=packages/shared`

Run: `npm run build --workspace=apps/web`

Run: `docker compose build api web`

Expected: every command exits `0` with no failing test or build.

- [ ] **Step 4: Record evidence and review the diff**

Record exact commands, pass counts, migration status, and commit SHAs in the verification file. Run `git diff --check` and confirm no payment-provider call, secret, floating-point financial field, or unrelated refactor entered the change.

- [ ] **Step 5: Commit and update issue #24**

Commit: `docs: verify recruiter revenue sharing ledger`

Comment on #24 with the endpoint matrix, verification evidence, and explicit remaining dependency on #9 for escrow/payments. Close #24 only if all exit criteria in the approved design are satisfied.

- [ ] **Step 6: Start the final security gate separately**

After the revenue-sharing PR is merged, execute issue #137 in its own branch and PR. Inventory and remediate Dependabot alerts, rerun the complete verification suite, and do not close M5 while a critical/high alert lacks an approved time-bounded exception.
