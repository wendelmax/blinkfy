# Task 2 Report: Multi-Tenant Placement and Revenue Ledger Schema

## Result

Implemented the Task 2 schema from base commit `36aad20` without modifying the legacy `Placement`, `WalletTransaction`, or payment service code.

The migration adds:

- `MarketplacePlacement` with exact `recruiterUserId` naming and default `confirmed` status.
- `PlacementRevenueAllocation` with tenant identifiers, integer minor-unit amounts, basis points, `pending | available | reversed` status, `availableAt`, and `reversedAt`.
- `PlacementRevenueLedgerEntry` with `allocation | reversal` kinds and recruiter/platform minor-unit amounts.
- The terminal `ApplicationStage.hired` value and nullable `CandidateApplication.hiredAt`.

## Database Guarantees

- Composite foreign keys bind placement workspace/client/application/recruiter membership.
- Composite foreign keys bind allocation workspace/client/recruiter fields to its placement and workspace membership.
- All new foreign keys use `ON DELETE RESTRICT` and `ON UPDATE NO ACTION`, preserving the evidence chain.
- PostgreSQL enforces positive gross amounts, basis-point ranges and total, 70/30 defaults, deterministic truncation, platform residual, nonnegative allocation amounts, exact amount totals, uppercase three-letter currencies, same-currency ledger entries, status timestamps, and ledger signs/magnitudes.
- Unique indexes enforce one placement per application, one allocation per placement, and one ledger entry of each kind per allocation (therefore one reversal).
- Ledger rows reject all `UPDATE` and `DELETE` operations.
- Allocation tenant, currency, gross, basis-point, and split fields become immutable after the first ledger entry while lifecycle status/timestamps remain mutable.

## TDD Evidence

RED:

`TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test --workspace=apps/api -- revenueSharingSchema.test.js`

After resetting the database to the base migrations, all seven tests failed for the expected missing contracts: `ApplicationStage.hired` was invalid and the new Prisma models were absent.

GREEN:

`TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run test --workspace=apps/api -- revenueSharingSchema.test.js`

Result: 1 file passed, 7 tests passed.

The focused tests cover tenant mismatches, exact lifecycle/default values, check constraints, placement/allocation/ledger uniqueness, one reversal, same currency, signs and magnitudes, allocation immutability, append-only ledger behavior, cascading parent deletions stopped by exact RESTRICT constraints, and NO ACTION updates.

The RESTRICT helper explicitly accepts:

- PostgreSQL 15 Prisma `P2003`.
- PostgreSQL 15 `PrismaClientUnknownRequestError` with SQLSTATE `23503`.
- PostgreSQL 18 `PrismaClientUnknownRequestError` with SQLSTATE `23001`.

Every accepted shape must expose the exact expected constraint name; no generic foreign-key match is accepted.

## Verification

- Final disposable database: `postgresql://user@127.0.0.1:55433/blinkfy_revenue_test`.
- Prisma validate: passed.
- Disposable database reset: passed; all 23 migrations applied, including `20260815010000_marketplace_revenue_sharing`.
- Prisma Client generation 5.22.0: passed.
- Relevant regression set (`revenueSharingSchema`, `revenueSplitService`, `workspace`, `pipeline`): 4 files passed, 33 tests passed.
- Full API suite: 69 files passed, 192 tests passed.
- Migration status: database schema up to date.
- `git diff --check`: passed.
- New PostgreSQL identifiers: all at most 63 bytes.
- Schema self-review: 103 additions and zero removals; legacy financial models remain byte-identical.

## Concerns

- Migration-to-schema diff still reports three pre-existing, unrelated divergences: the `candidates(workspaceId, userId)` index, the `fit_score_snapshots.policyVersion` database default, and the `message_suggestions(sourceMessageId)` index. Task 2 introduced no additional drift.
- The approved exact placement lifecycle currently contains only `confirmed`. If cancellation becomes an approved placement state, it requires a later enum migration and behavior design.
