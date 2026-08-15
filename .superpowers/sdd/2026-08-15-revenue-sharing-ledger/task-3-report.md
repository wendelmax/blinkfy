# Task 3 Report: Marketplace Placement Confirmation

## Result

Implemented `POST /api/blinkfy/clients/:clientId/placements` for owner/admin-confirmed marketplace placements. The endpoint confirms only shortlisted applications belonging to the active client/workspace, attributes the placement to an eligible workspace recruiter, moves the application to terminal `hired`, and writes an ID-only audit event in one transaction.

## TDD Evidence

### RED

Command:

```bash
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api -- marketplacePlacements.test.js
```

Before production code, the new integration suite had 5 expected failures: the confirmation, authorization, lifecycle, and repeat-confirmation requests received `404` because the placement route was absent. The client/workspace isolation test already expected `404` and passed.

### GREEN

The same focused command passed with 1 file and 6 tests after implementation.

## Implementation

- Added a client-scoped placement router with `requireWorkspaceRole('owner', 'admin')` followed by `requireClientAccess`.
- Added `marketplacePlacementsController` with request validation and an initial client/candidate-workspace-scoped application lookup, preventing cross-client and cross-workspace discovery.
- The transaction locks the application row with `SELECT ... FOR UPDATE`, checks an existing placement first for repeat `409`, rechecks the scoped application and `shortlisted` stage, verifies the target user's same-workspace membership has `recruiter`, `admin`, or `owner` role, then creates `MarketplacePlacement`, sets `CandidateApplication.stage` to `hired` with `hiredAt`, and records `marketplace.placement_confirmed`.
- A database unique conflict (`P2002`) is mapped to `409`; the pre-lock and in-transaction existing-placement checks make repeated requests deterministic as well.
- Added `hiredAt` to application serialization so pipeline consumers see the terminal state timestamp.
- No transfer, credential, legacy `Placement`, legacy `WalletTransaction`, or `paymentService.js` behavior was touched.

## Tests and Verification

```bash
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api -- marketplacePlacements.test.js pipeline.test.js
```

Passed: 2 files, 14 tests.

```bash
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api
```

Passed: 70 files, 200 tests.

```bash
git diff --check
```

Passed with no whitespace errors.

## Files Changed

- `apps/api/src/controllers/blinkfy/marketplacePlacementsController.js` (new)
- `apps/api/src/routes/blinkfy/marketplacePlacements.js` (new)
- `apps/api/src/routes/blinkfy/index.js`
- `apps/api/src/controllers/blinkfy/applicationsController.js`
- `apps/api/test/blinkfy/marketplacePlacements.test.js` (new)
- `.superpowers/sdd/2026-08-15-revenue-sharing-ledger/task-3-report.md` (this report)

## Self-Review

- Checked authorization ordering and confirmed that client access runs after owner/admin workspace authorization.
- Checked all application reads include both active `clientId` and candidate `workspaceId`; the transaction repeats that scoped lookup after acquiring the lock.
- Checked repeated requests cannot create more than one row: application row lock plus existing-placement check handle the normal path, and `P2002` handles the unique-index race.
- Checked audit metadata contains only `applicationId` and `recruiterUserId`; tenant, actor, entity, and action IDs are passed as audit columns.
- Checked all requested lifecycle behavior is covered by integration tests: owner/admin success, recruiter denial, tenant isolation, non-shortlisted rejection, invalid recruiter membership rejection, hired serialization, atomic persistence, audit, and repeat conflict.

## Concerns

None. The schema has no separate membership-active field, so an existing `WorkspaceMembership` is treated as active, consistent with the established authorization middleware and placement foreign key.
