# Task 5: Ledger Query and Compensating Reversal

## Delivered

- Added `GET /api/blinkfy/clients/:clientId/revenue-sharing/ledger` with an allowlisted response, tenant/client filtering, recruiter self-filtering, and newest-first ordering.
- Added owner/admin-only `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations/:allocationId/reverse`.
- Reversal locks the allocation in one transaction, rejects a missing or already-reversed allocation, appends one negative `reversal` ledger entry, sets `status` to `reversed` with `reversedAt`, and records `marketplace.revenue_reversed` with allocation, placement, and recruiter IDs only.
- Original allocation ledger entries are not updated or deleted. The existing database append-only constraint remains the enforcement boundary.
- Added integration coverage for ledger isolation/allowlist, recruiter visibility, privileged reversal, sequential and independent-client concurrency conflicts, immutable original/reversal evidence, IDs-only audit metadata, and recruiter denial.

## Verification

- `node --check apps/api/src/controllers/blinkfy/revenueSharingController.js` — passed.
- `node --check apps/api/src/routes/blinkfy/revenueSharing.js` — passed.
- `git diff --check` — passed.
- `TEST_DATABASE_URL=postgresql://user@127.0.0.1:55433/blinkfy_revenue_test npm run test --workspace=apps/api -- revenueSharing.test.js` — passed: 1 file, 16 tests, 1.31s.

## Scope / Limits

- No payment execution, provider interaction, credential handling, transfer scheduling, or mutation of original ledger evidence was added.
- Reversal is an internal compensating accounting operation only.
