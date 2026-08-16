# Task 4 — Allocation Preview and Confirmation

Base: `f21e4583fb8709f8e57fe7f1ce07d224d3c4f19e`

## RED evidence

1. Added the preview tests before creating the revenue-sharing route or controller.
2. Ran:

   ```sh
   TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api -- revenueSharing.test.js
   ```

   Result: two authorized preview assertions failed with `expected 404 to be 200`; the routes did not yet exist. The scoped-negative case already returned `404` as intended.
3. Implemented only preview routing/controller behavior. The focused run passed `3/3` tests.
4. Added confirmation, idempotency, audit, and independent-connection concurrency tests before adding `POST /allocations`.
5. Re-ran the same focused command. Result: `3` failures: authorized confirmation returned `404`, and the independent Prisma connection race produced `[404, 404]` rather than `[201, 409]`.

The initial sandboxed run could not create Vitest's temporary `/tmp/.../ssr` directory. The recorded RED commands above were then run with the required local-test permission and reached the actual assertions.

## Implementation

- Added the client/workspace-scoped `revenue-sharing` router with preview and allocation confirmation endpoints for `owner`, `admin`, and `recruiter` workspace members.
- Preview looks up the tenant-scoped `MarketplacePlacement`; for recruiters its persisted `recruiterUserId` must match the caller. The request body recruiter ID is never used. It returns the pure Task 1 split, normalized currency, `confirmed: false`, and `transferred: false`, without database writes.
- Confirmation repeats the server-side split calculation inside a Prisma transaction after locking the marketplace placement row with `FOR UPDATE`. It rejects non-confirmed rows (including any future cancelled status), creates the pending allocation, creates its positive allocation ledger entry, and records `marketplace.revenue_allocated` atomically.
- Allocation uniqueness conflicts map to `409`. The response explicitly reports `transferred: false`; no payment or transfer service is called.
- Audit metadata contains only `placementId`, `recruiterUserId`, and `allocationId`.

## Files

- `apps/api/src/controllers/blinkfy/revenueSharingController.js` (new)
- `apps/api/src/routes/blinkfy/revenueSharing.js` (new)
- `apps/api/src/routes/blinkfy/index.js` (modified)
- `apps/api/test/blinkfy/revenueSharing.test.js` (new)

## Verification

Focused feature run after implementation:

```sh
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api -- revenueSharing.test.js
```

Result: `1` file passed, `8` tests passed.

Related regression run:

```sh
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api -- revenueSplitService.test.js revenueSharingSchema.test.js marketplacePlacements.test.js revenueSharing.test.js
```

Result: `4` files passed, `39` tests passed.

Also ran `git diff --check` with no whitespace errors.

## Self-review

- All monetary amounts in the controller flow remain Task 1 integer minor-unit values; no float conversion is introduced.
- Currency normalization, the `7000/3000` defaults, BPs total validation, and Blinkfy residual rule remain centralized in `calculateRevenueSplit`.
- Both endpoints enforce workspace and client scope; recruiter access returns `404` for another recruiter's placement.
- Confirmation locks the placement row and relies on allocation uniqueness as the final idempotency barrier. The test starts requests via two distinct `PrismaClient` instances and observes exactly one allocation, ledger entry, and audit event.
- The diff has no legacy `Placement`, `WalletTransaction`, or payment-service import/use.
- API audits have IDs-only metadata and no payment credentials, tax data, or amount payloads.

## Concerns

- The current schema exposes only `MarketplacePlacementStatus.confirmed`; it has no `cancelled` value. The controller defensively rejects every status other than `confirmed`, but a concrete cancelled-placement API path cannot be exercised until the schema adds that lifecycle value.
- This task intentionally does not implement transfer execution, payment-provider integration, or ledger query/reversal functionality; those are outside Task 4.
