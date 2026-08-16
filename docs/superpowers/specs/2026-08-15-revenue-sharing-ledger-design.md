# Revenue Sharing Ledger Design

## Goal

Create an auditable foundation for splitting placement revenue between a recruiter and Blinkfy without transferring money, initiating payouts, or depending on a billing provider.

## Scope

The first release calculates allocation previews, confirms one immutable allocation per placement, exposes the resulting ledger, and supports compensating reversals. Payments, withdrawals, escrow, tax calculation, invoices, currency conversion, and provider credentials remain outside this design.

## Financial Representation

- Store all monetary amounts as integer minor units. `10000` BRL minor units represents BRL 100.00.
- Store currency as an uppercase ISO 4217 code. Each allocation and reversal uses exactly one currency.
- Store shares in basis points. The recruiter and platform shares must be integers from `0` through `10000` and must sum to `10000`.
- The platform default is recruiter `7000` and platform `3000` basis points.
- A placement may override the default before allocation confirmation. Confirmed allocations never inherit later default changes.
- Calculate the recruiter amount with integer truncation: `floor(grossAmountMinor * recruiterBasisPoints / 10000)`.
- Allocate the residual minor units to Blinkfy: `platformAmountMinor = grossAmountMinor - recruiterAmountMinor`.

## Domain Model

`MarketplacePlacement` is the multi-tenant source record for revenue allocation. It is separate from the legacy `Placement` model, which uses floating-point USD fields and has no workspace/client ownership. A marketplace placement contains `workspaceId`, `clientId`, `applicationId`, `recruiterUserId`, `status`, and timestamps. The application must belong to the same client and workspace and must be in the `shortlisted` stage before an owner or admin confirms the placement. Confirmation moves the application to a new terminal `hired` stage in the same transaction. There is at most one marketplace placement per application.

The legacy `Placement` and `WalletTransaction` models are not read, written, or migrated by this feature.

`PlacementRevenueAllocation` is append-only business evidence with:

- `id`
- `workspaceId`
- `clientId`
- `placementId`
- `recruiterUserId`
- `currency`
- `grossAmountMinor`
- `recruiterBasisPoints`
- `platformBasisPoints`
- `recruiterAmountMinor`
- `platformAmountMinor`
- `status`: `pending`, `available`, or `reversed`
- `availableAt`
- `reversedAt`
- `createdAt`

There is at most one original allocation per `workspaceId + placementId`. A reversal does not mutate financial amounts. It transitions the allocation to `reversed` and creates an append-only reversal ledger entry referencing the original allocation.

`PlacementRevenueLedgerEntry` contains:

- `id`
- `allocationId`
- `kind`: `allocation` or `reversal`
- `recruiterAmountMinor`: positive for allocation and negative for reversal
- `platformAmountMinor`: positive for allocation and negative for reversal
- `currency`
- `createdAt`

Database constraints enforce positive gross amounts, valid basis-point totals, same-currency ledger entries, and allocation idempotency.

## API

All endpoints are workspace- and client-scoped and require recruiter/admin authorization.

### Preview

`POST /api/blinkfy/clients/:clientId/revenue-sharing/preview`

Input:

```json
{
  "placementId": "placement_123",
  "recruiterUserId": "user_123",
  "currency": "BRL",
  "grossAmountMinor": 1000000,
  "recruiterBasisPoints": 7000
}
```

Output includes both calculated amounts and `confirmed: false`, `transferred: false`. Previewing never persists an allocation or audit event.

### Confirm allocation

`POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations`

The input matches the preview contract. Confirmation calculates the amounts again on the server, creates the allocation and allocation ledger entry in one transaction, and records a non-sensitive audit event. A repeated placement returns `409` without creating another entry.

The initial status is `pending`. This endpoint never initiates a payment.

### List ledger

`GET /api/blinkfy/clients/:clientId/revenue-sharing/ledger`

Returns allocation and reversal entries ordered newest first. Responses expose monetary values, currency, status, placement identifier, recruiter identifier, and timestamps. They do not expose payment credentials, tax documents, or unrelated candidate data.

### Reverse allocation

`POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations/:allocationId/reverse`

Creates one compensating ledger entry and marks the allocation `reversed` in one transaction. Reversing an already reversed allocation returns `409`. Reversal does not delete or rewrite prior ledger evidence.

## State Transitions

`pending -> available -> reversed` is the complete state graph. The first implementation creates `pending` allocations and supports `pending -> reversed`. Moving funds to `available` belongs to the future escrow/retention policy and is not exposed until that policy is approved.

## Authorization and Audit

- Workspace owners and admins may preview, confirm, list, and reverse.
- Recruiters may preview, confirm, and list allocations only when they are the allocation recruiter and have access to the client.
- Recruiters may not reverse allocations.
- Every confirmation and reversal records actor, workspace, client, allocation, placement, currency, amounts, and basis points.
- Audit metadata excludes bank details, card data, tax documents, provider secrets, and candidate private data.

## Failure Handling

- Reject non-integer, zero, or negative gross amounts with `422`.
- Reject malformed ISO currency codes with `422`.
- Reject non-integer basis points or totals other than `10000` with `422`.
- Return `404` when the placement, recruiter, client, or allocation is outside the authorized scope.
- Return `409` for duplicate allocation or reversal.
- Transaction failures create no partial allocation, ledger entry, or success audit event.

## Testing

Unit tests verify default and overridden splits, integer truncation, residual allocation, invalid amounts, currency normalization, and invalid basis points. API tests verify workspace/client isolation, recruiter ownership, admin reversal, duplicate protection, transactional persistence, audit metadata, and absence of payment side effects. Migration tests verify uniqueness and financial check constraints.

## Exit Criteria

- Allocation preview and confirmation return identical deterministic amounts.
- One placement cannot create two original allocations under concurrency.
- Reversal preserves the original evidence and creates exactly one compensating entry.
- Authorization and tenant isolation tests pass.
- The complete API suite, Prisma migration deployment, shared build, web build, and Docker build pass.
- No endpoint transfers funds or accepts payment credentials.

## Post-MVP Boundaries

Provider checkout, escrow funding, retention windows, payout availability, withdrawals, chargebacks, taxation, invoices, KYC, and multi-currency conversion are separate M5 capabilities that consume this ledger after their own approval and security review.

## Implemented Contract and Non-Payment Boundary

The implemented routes are all scoped by workspace and client access:

| Endpoint | Owner / admin | Recruiter | Result |
| --- | --- | --- | --- |
| `POST /api/blinkfy/clients/:clientId/revenue-sharing/preview` | Allowed | Allowed only for the recruiter's own marketplace placement | Calculates only; does not persist an allocation or audit event. |
| `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations` | Allowed | Allowed only for the recruiter's own marketplace placement | Creates the pending allocation, its positive ledger entry, and an audit event atomically. |
| `GET /api/blinkfy/clients/:clientId/revenue-sharing/ledger` | Allowed | Allowed only for allocations attributed to that recruiter | Returns allowlisted ledger evidence newest first. |
| `POST /api/blinkfy/clients/:clientId/revenue-sharing/allocations/:allocationId/reverse` | Allowed | Denied | Appends one negative compensating entry and changes the allocation to `reversed` atomically. |

Workspace viewers are not authorized for these routes. A recruiter attempting to
address another recruiter's placement or allocation receives the scoped
not-found behavior rather than cross-tenant data. Duplicate allocation or
reversal attempts return `409`.

The default allocation is recruiter `7000` and Blinkfy `3000` basis points.
The recruiter amount is `floor(grossAmountMinor * recruiterBasisPoints / 10000)`
and Blinkfy receives the residual: `grossAmountMinor - recruiterAmountMinor`.
All amounts are integer minor units. The state model is
`pending -> available -> reversed`; this release creates `pending` allocations
and exposes `pending -> reversed` only. Making funds `available` remains a
future escrow/retention-policy decision.

This ledger does **not** transfer, reserve, charge, withdraw, or pay funds.
Preview and confirmation responses explicitly report `transferred: false`.
There is no provider integration or payment credential input in these routes.
The legacy `Placement`, `WalletTransaction`, and `paymentService.js` code paths
are unchanged and are neither read nor written by the ledger.
