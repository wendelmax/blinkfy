# LATAM Tax Calculators (Argentina & Mexico) — Design

## Goal

Extend the existing Brazil-only tax withholding calculator so the platform computes a candidate's local tax withholding for Argentina and Mexico too, and actually uses it in the live wallet flow — today `paymentService.getWalletSummaryForUser` always runs the Brazil calculation regardless of the candidate's `taxResidence`. Closes issue #15.

## Scope

In scope:
- Two new pure calculator functions in `apps/api/src/workers/pure.js`: Argentina (Monotributo) and Mexico (RESICO), matching the existing `calculateBrazilTaxes(grossLocal)` shape.
- A dynamic dispatcher in `apps/api/src/services/taxService.js` that picks the right calculator from `CandidateProfile.taxResidence`.
- Wiring `paymentService.getWalletSummaryForUser` to look up the candidate's `taxResidence`, convert to the right local currency, and call the dispatcher instead of the hardcoded Brazil path.
- Extending exchange-rate fetching (`paymentService.js`) to support ARS and MXN alongside the existing BRL support.

Out of scope (explicitly, per issue #15 and the target user persona of independent PJ/autônomo developers):
- Argentina's general progressive "Ganancias" regime and Mexico's general progressive ISR regime — both require inputs (dependents, deductions, marital status) that don't exist in `CandidateProfile` today. Monotributo (Argentina) and RESICO (Mexico) are the simplified, gross-income-based regimes that match the platform's target persona and the existing Brazil IRRF pattern.
- Any new Prisma migration — `CandidateProfile.taxResidence` already exists (`String?`, values `brazil | argentina | mexico | other`), and `ExchangeRateLog.fromCur`/`toCur` are already free-text strings, not an enum.
- Frontend changes — no UI in `apps/web` currently consumes the wallet/payment endpoints; this is a backend-only change.
- Colombia and other LATAM countries listed in `docs/technical/latam-compliance.md` — not requested by issue #15.

## Data: tax tables (sourced 2026-08-16)

### Argentina — Monotributo, "servicios" category, effective 2026-08-01

Monotributo is not a percentage of the month's revenue — it's a **fixed monthly quota** determined by the taxpayer's category, which is set from *trailing 12-month* gross revenue. The quota bundles the integrated tax, retirement contribution (SIPA), and health insurance into one number.

| Category | Annual revenue upper limit (ARS) | Fixed monthly fee (ARS) |
| --- | ---: | ---: |
| A | 12,009,410 | 49,527 |
| B | 17,595,183 | 56,379 |
| C | 24,670,494 | 66,020 |
| D | 30,628,651 | 84,613 |
| E | 36,028,231 | 119,811 |
| F | 45,151,659 | 150,784 |
| G | 53,995,799 | 230,313 |
| H | 81,924,660 | 522,707 |
| I | 91,699,762 | 963,748 |
| J | 105,012,519 | 1,167,300 |
| K | 126,610,839 | 1,614,446 |

Source: [Monotributo 2026: tabla de categorías y cuotas vigentes — Estudio Contable Libran](https://www.estudiolibran.com.ar/monotributo). Effective from August 1, 2026; next scheduled update February 2027 per ARCA (formerly AFIP).

**Approximation for a single-month pure function:** `calculateArgentinaTaxes(grossArsMonthly)` annualizes the input (`× 12`) to find the matching category by its upper limit, then returns that category's fixed monthly fee as the month's withholding. This is a deliberate simplification of a regime that's actually based on a trailing 12-month average, not a single month's revenue — documented inline in the function.

### Mexico — RESICO personas físicas, 2026 (unchanged from 2025)

| Monthly income (MXN) | Rate |
| --- | ---: |
| 0 – 25,000 | 1.00% |
| 25,000.01 – 50,000 | 1.10% |
| 50,000.01 – 83,333.33 | 1.50% |
| 83,333.34 – 208,333.33 | 2.00% |
| 208,333.34 – 291,666.66 (annual cap 3,500,000) | 2.50% |

Source: [Tabla ISR RESICO 2026 — ResicoCalc](https://resicocalc.com/blog/tablas-isr-resico-2026), confirmed unchanged from 2025 per Anexo 8 of the RMF 2026, published in the Diario Oficial de la Federación 2025-12-28.

Unlike Brazil's IRRF (marginal brackets with a subtracted deduction), RESICO applies the bracket's rate to the **entire** month's income — no marginal calculation, no deduction. This makes `calculateMexicoTaxes` simpler than `calculateBrazilTaxes`: `tax = gross * rateForBracket(gross)`.

## API contract

### `apps/api/src/workers/pure.js`

Two new pure functions, same calling convention as `calculateBrazilTaxes(grossLocal)` (no closures over external state, safe to run in a worker thread):

```js
function calculateArgentinaTaxes(grossArs) {
  // validates grossArs is a finite number > 0 (throws otherwise)
  // annualizes, finds Monotributo category, returns:
  return {
    grossArs,
    monotributoFee: /* fixed monthly fee for the category */,
    netArs: /* grossArs - monotributoFee, floored at 0 */,
    monotributoCategory: /* 'A'..'K' */,
    taxRateEffective: /* monotributoFee / grossArs * 100, 0 if grossArs is 0 */,
    currency: 'ARS',
    complianceStatus: 'READY_FOR_MONOTRIBUTO_PAYMENT',
  };
}

function calculateMexicoTaxes(grossMxn) {
  // validates grossMxn is a finite number > 0 (throws otherwise)
  // finds the RESICO bracket, returns:
  return {
    grossMxn,
    isr: /* grossMxn * bracket rate */,
    netMxn: /* grossMxn - isr */,
    taxRateEffective: /* isr / grossMxn * 100 */,
    currency: 'MXN',
    complianceStatus: 'READY_FOR_RESICO_PAYMENT',
  };
}
```

`calculateBrazilTaxes` also gets the same input validation added (finite, `> 0`) for consistency — it currently has none.

### `apps/api/src/services/taxService.js`

A new dispatcher, alongside the existing (kept, unchanged) `exports.calculateBrazilTaxes`:

```js
// taxResidence -> { calculator, currency }
const RESIDENCE_CALCULATORS = {
  brazil:    { calculator: calculateBrazilTaxes,    currency: 'BRL' },
  argentina: { calculator: calculateArgentinaTaxes, currency: 'ARS' },
  mexico:    { calculator: calculateMexicoTaxes,    currency: 'MXN' },
};

// unrecognized/null/'other' taxResidence -> falls back to 'brazil',
// preserving today's behavior for every candidate without taxResidence set.
exports.calculateTaxesByResidence = async (taxResidence, grossLocal) => { /* ... */ };
```

Return shape is the union of the underlying calculator's country-specific fields (`irrf`/`grossBrl`, `monotributoFee`/`grossArs`/`monotributoCategory`, `isr`/`grossMxn`) **plus** a normalized set every caller can rely on regardless of country:

```js
{
  taxAmountLocal: Number,   // irrf / monotributoFee / isr
  netLocal: Number,         // netBrl / netArs / netMxn
  taxRateEffective: Number,
  currency: 'BRL' | 'ARS' | 'MXN',
  complianceStatus: String,
  regime: 'irrf' | 'monotributo' | 'resico',
  ...countrySpecificFields,
}
```

### `apps/api/src/services/paymentService.js`

- `fetchExchangeRate(toCurrency)` / `getExchangeRate(toCurrency)`: generalized to accept a target currency (default `'BRL'` to keep existing callers working unchanged). Builds the Frankfurter API URL from `toCurrency`; fallback rate resolves from `EXCHANGE_RATE_<CURRENCY>` (new: `EXCHANGE_RATE_ARS`, `EXCHANGE_RATE_MXN`), mirroring the existing `EXCHANGE_RATE` env var for BRL.
- `calculateNetSalary(grossUsd, toCurrency = 'BRL')`: same generalization — returns `{ grossUsd, grossLocal, currency, exchangeRate }` (renaming `grossBrl` to `grossLocal` + adding `currency` is a breaking shape change for this function's return value; `getWalletSummaryForUser` is its only caller in the current codebase, so this is safe).
- `getWalletSummaryForUser(userId, salaryUsd)`: loads `prisma.candidateProfile.findUnique({ where: { userId } })` to read `taxResidence`, resolves the target currency from `RESIDENCE_CALCULATORS` (falling back to `'brazil'`/`'BRL'` the same way the dispatcher does, so behavior stays in sync), calls `calculateNetSalary(amount, currency)`, then `taxService.calculateTaxesByResidence(taxResidence, currencyData.grossLocal)` instead of the hardcoded `calculateBrazilTaxes(currencyData.grossBrl)`.

## Error handling

- The three pure functions throw a `TypeError`/`RangeError`-style error for non-finite or `<= 0` gross amounts (matching the validation style already used in `revenueSplitService.js` from the previous ledger work) — callers are expected to validate user input upstream; these are internal calculation primitives, not request handlers.
- The dispatcher does **not** throw on an unrecognized `taxResidence` — falling back to Brazil is normal, expected behavior (every existing candidate without `taxResidence` set gets exactly today's behavior), not an error condition.
- `getWalletSummaryForUser` keeps the existing `tasklets.run(...)` → synchronous fallback pattern already used for `calculateBrazilTaxes`, extended to the new dispatcher call.

## Testing

No test file currently exists for `pure.js`, `taxService.js`, or `paymentService.js` — all new, TDD from scratch:

- `apps/api/test/blinkfy/pure.test.js` *(new)*: boundary tests for every Monotributo category edge (just under/at/just over each annual limit) and every RESICO bracket edge, plus rejection of zero/negative/non-finite gross for all three calculators (including the newly-added validation on `calculateBrazilTaxes`).
- `apps/api/test/blinkfy/taxService.test.js` *(new)*: dispatcher selects the correct calculator per `taxResidence` value (`brazil`, `argentina`, `mexico`), and falls back to Brazil for `null`, `'other'`, and an unrecognized string.
- `apps/api/test/blinkfy/paymentService.test.js` *(new)*: `getWalletSummaryForUser` against a real test-database `CandidateProfile` fixture per country, asserting the right currency and calculator ran; a fixture with no `CandidateProfile` row falls back to Brazil/BRL exactly like today.

## Exit criteria

- All three `taxResidence` values (`brazil`, `argentina`, `mexico`) plus the `null`/`'other'`/unrecognized fallback path are covered by passing tests.
- `npm run test --workspace=apps/api` passes with the new test files included.
- `getWalletSummaryForUser` for an Argentina or Mexico candidate returns `projections.currency` matching their residence and no longer silently reports BRL figures for non-Brazilian candidates.
