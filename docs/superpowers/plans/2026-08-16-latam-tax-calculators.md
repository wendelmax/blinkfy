# LATAM Tax Calculators (Argentina & Mexico) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Brazil-only tax withholding calculator to cover Argentina (Monotributo) and Mexico (RESICO), and wire the live wallet flow (`paymentService.getWalletSummaryForUser`) to use the right calculator and currency for each candidate's `taxResidence` instead of always assuming Brazil. Closes issue #15.

**Architecture:** Two new pure calculator functions in `apps/api/src/workers/pure.js` (worker-thread safe, no closures), a dynamic dispatcher in `apps/api/src/services/taxService.js` keyed by `taxResidence`, and a generalized multi-currency exchange-rate path in `apps/api/src/services/paymentService.js`.

**Tech Stack:** Node.js CommonJS, Vitest, Prisma (no schema changes — `CandidateProfile.taxResidence` and `ExchangeRateLog.fromCur`/`toCur` already exist as free-text fields).

## Global Constraints

- No Prisma migration in this plan — `taxResidence` (`String?`) and `ExchangeRateLog.fromCur`/`toCur` (`String`) already support the new values without schema changes.
- Argentina implements **Monotributo** (fixed monthly quota by category), not the general progressive "Ganancias" regime. Mexico implements **RESICO personas físicas** (flat rate per monthly-income bracket, non-marginal), not the general progressive ISR regime. Both match the platform's target persona (independent PJ/autônomo developers) and the existing Brazil IRRF calculator's `calculateX(grossLocal)` calling convention.
- Tax table sources (verified 2026-08-16): Monotributo table effective 2026-08-01 from [Estudio Contable Libran](https://www.estudiolibran.com.ar/monotributo); RESICO table confirmed unchanged for 2026 from [ResicoCalc](https://resicocalc.com/blog/tablas-isr-resico-2026), per Anexo 8 of the RMF 2026.
- No frontend changes — no UI in `apps/web` currently consumes the wallet/payment endpoints.
- Branch: `feat/latam-tax-calculators-15` (already created off `main` at `6a2324f`; design doc already committed at `c2a4019`).

---

### Task 1: Argentina and Mexico pure calculators, plus Brazil input validation

**Files:**
- Modify: `apps/api/src/workers/pure.js`
- Test: `apps/api/test/blinkfy/pure.test.js` (new)

**Interfaces:**
- Produces: `calculateArgentinaTaxes(grossArs)` → `{ grossArs, monotributoFee, netArs, monotributoCategory, taxRateEffective, currency: 'ARS', complianceStatus: 'READY_FOR_MONOTRIBUTO_PAYMENT' }`
- Produces: `calculateMexicoTaxes(grossMxn)` → `{ grossMxn, isr, netMxn, taxRateEffective, currency: 'MXN', complianceStatus: 'READY_FOR_RESICO_PAYMENT' }`
- Modifies: `calculateBrazilTaxes(grossBrl)` gains the same input validation as the two new functions (currently has none).

- [ ] **Step 1: Write failing validation tests for all three calculators**

```js
const {
    calculateBrazilTaxes,
    calculateArgentinaTaxes,
    calculateMexicoTaxes,
} = require('../../src/workers/pure');

describe('gross amount validation', () => {
    test.each([
        ['calculateBrazilTaxes', calculateBrazilTaxes],
        ['calculateArgentinaTaxes', calculateArgentinaTaxes],
        ['calculateMexicoTaxes', calculateMexicoTaxes],
    ])('%s rejects zero, negative, and non-finite gross amounts', (_name, fn) => {
        expect(() => fn(0)).toThrow(RangeError);
        expect(() => fn(-100)).toThrow(RangeError);
        expect(() => fn(NaN)).toThrow(RangeError);
        expect(() => fn(Infinity)).toThrow(RangeError);
        expect(() => fn('1000')).toThrow(RangeError);
    });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test --workspace=apps/api -- pure.test.js`

Expected: FAIL — `calculateArgentinaTaxes`/`calculateMexicoTaxes` are not exported yet, and `calculateBrazilTaxes` doesn't currently validate its input (calling it with `0`/`-100`/`NaN`/`Infinity`/a string does not throw today).

- [ ] **Step 3: Add validation to `calculateBrazilTaxes` and implement the two new calculators**

In `apps/api/src/workers/pure.js`, add at the top of the file (before `calculateBrazilTaxes`):

```js
function assertPositiveFiniteGross(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new RangeError(`${label} must be a positive finite number`);
    }
}
```

Add validation as the first line of `calculateBrazilTaxes`:

```js
function calculateBrazilTaxes(grossBrl) {
    assertPositiveFiniteGross(grossBrl, 'grossBrl');
    let rate = 0;
    // ...unchanged from here
```

Add the Argentina calculator, right after `calculateBrazilTaxes`:

```js
// Monotributo (Argentina) is a fixed monthly quota per category, not a
// percentage of the month's revenue. Category is set from trailing 12-month
// gross revenue; this pure function approximates that by annualizing a
// single month's gross (x12). Table effective 2026-08-01, "servicios"
// category (source: https://www.estudiolibran.com.ar/monotributo).
const MONOTRIBUTO_CATEGORIES = [
    { category: 'A', annualLimitArs: 12009410, monthlyFeeArs: 49527 },
    { category: 'B', annualLimitArs: 17595183, monthlyFeeArs: 56379 },
    { category: 'C', annualLimitArs: 24670494, monthlyFeeArs: 66020 },
    { category: 'D', annualLimitArs: 30628651, monthlyFeeArs: 84613 },
    { category: 'E', annualLimitArs: 36028231, monthlyFeeArs: 119811 },
    { category: 'F', annualLimitArs: 45151659, monthlyFeeArs: 150784 },
    { category: 'G', annualLimitArs: 53995799, monthlyFeeArs: 230313 },
    { category: 'H', annualLimitArs: 81924660, monthlyFeeArs: 522707 },
    { category: 'I', annualLimitArs: 91699762, monthlyFeeArs: 963748 },
    { category: 'J', annualLimitArs: 105012519, monthlyFeeArs: 1167300 },
    { category: 'K', annualLimitArs: 126610839, monthlyFeeArs: 1614446 },
];

function calculateArgentinaTaxes(grossArs) {
    assertPositiveFiniteGross(grossArs, 'grossArs');

    const annualizedArs = grossArs * 12;
    // Above category K there is no Monotributo category (the taxpayer must
    // switch to "Responsable Inscripto"); this calculator caps at K rather
    // than modeling that separate regime.
    const bracket = MONOTRIBUTO_CATEGORIES.find((c) => annualizedArs <= c.annualLimitArs)
        || MONOTRIBUTO_CATEGORIES[MONOTRIBUTO_CATEGORIES.length - 1];

    const monotributoFee = bracket.monthlyFeeArs;
    const netArs = Math.max(0, grossArs - monotributoFee);

    return {
        grossArs,
        monotributoFee,
        netArs,
        monotributoCategory: bracket.category,
        taxRateEffective: (monotributoFee / grossArs) * 100,
        currency: 'ARS',
        complianceStatus: 'READY_FOR_MONOTRIBUTO_PAYMENT',
    };
}

// RESICO personas físicas (Mexico) applies the bracket's rate to the ENTIRE
// month's income (non-marginal), unlike Brazil's IRRF. Rates unchanged for
// 2026 per Anexo 8 of the RMF 2026 (source:
// https://resicocalc.com/blog/tablas-isr-resico-2026). Top bracket's
// eligibility cap is 3,500,000 MXN annual (~291,666.66/month); this
// calculator does not enforce that cap, only the rate.
const RESICO_BRACKETS = [
    { limitMxn: 25000, rate: 0.01 },
    { limitMxn: 50000, rate: 0.011 },
    { limitMxn: 83333.33, rate: 0.015 },
    { limitMxn: 208333.33, rate: 0.02 },
    { limitMxn: Infinity, rate: 0.025 },
];

function calculateMexicoTaxes(grossMxn) {
    assertPositiveFiniteGross(grossMxn, 'grossMxn');

    const bracket = RESICO_BRACKETS.find((b) => grossMxn <= b.limitMxn);
    const isr = grossMxn * bracket.rate;

    return {
        grossMxn,
        isr,
        netMxn: grossMxn - isr,
        taxRateEffective: bracket.rate * 100,
        currency: 'MXN',
        complianceStatus: 'READY_FOR_RESICO_PAYMENT',
    };
}
```

Update `module.exports` at the bottom of the file to add `calculateArgentinaTaxes` and `calculateMexicoTaxes`:

```js
module.exports = {
    calculateBrazilTaxes,
    calculateArgentinaTaxes,
    calculateMexicoTaxes,
    calculateEScore,
    processGitHubRepos,
};
```

- [ ] **Step 4: Run and verify GREEN**

Run: `npm run test --workspace=apps/api -- pure.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing boundary tests for the Monotributo category table**

Add to `pure.test.js`:

```js
describe('calculateArgentinaTaxes (Monotributo)', () => {
    test('category A: at and just under the annual limit', () => {
        // annualLimitArs 12009410 / 12 = 1000784.1666...
        expect(calculateArgentinaTaxes(1000784.16).monotributoCategory).toBe('A');
    });

    test('crosses into category B just over the category A annual limit', () => {
        expect(calculateArgentinaTaxes(1000784.17).monotributoCategory).toBe('B');
    });

    test('caps at category K above the highest annual limit', () => {
        expect(calculateArgentinaTaxes(20000000).monotributoCategory).toBe('K');
        expect(calculateArgentinaTaxes(20000000).monotributoFee).toBe(1614446);
    });

    test('returns net gross minus the fixed monthly fee, floored at zero', () => {
        const result = calculateArgentinaTaxes(30000);
        expect(result.monotributoFee).toBe(49527);
        expect(result.netArs).toBe(0);
        expect(result.currency).toBe('ARS');
        expect(result.complianceStatus).toBe('READY_FOR_MONOTRIBUTO_PAYMENT');
    });
});
```

- [ ] **Step 6: Run and verify RED, then confirm it was already GREEN from Step 3's implementation**

Run: `npm run test --workspace=apps/api -- pure.test.js`

Expected: these new tests PASS immediately (the implementation from Step 3 already covers this behavior) — this step exists to add regression coverage for the boundary logic, not to drive new implementation. If any of these fail, fix `calculateArgentinaTaxes` until they pass.

- [ ] **Step 7: Write tests for the RESICO bracket table**

Add to `pure.test.js`:

```js
describe('calculateMexicoTaxes (RESICO)', () => {
    test.each([
        [25000, 0.01],
        [25000.01, 0.011],
        [50000, 0.011],
        [50000.01, 0.015],
        [83333.33, 0.015],
        [83333.34, 0.02],
        [208333.33, 0.02],
        [208333.34, 0.025],
        [500000, 0.025],
    ])('gross %f MXN applies rate %f', (grossMxn, expectedRate) => {
        const result = calculateMexicoTaxes(grossMxn);
        expect(result.isr).toBeCloseTo(grossMxn * expectedRate, 6);
        expect(result.taxRateEffective).toBeCloseTo(expectedRate * 100, 6);
    });

    test('returns net gross minus ISR, currency MXN', () => {
        const result = calculateMexicoTaxes(40000);
        expect(result.isr).toBeCloseTo(440, 6);
        expect(result.netMxn).toBeCloseTo(39560, 6);
        expect(result.currency).toBe('MXN');
        expect(result.complianceStatus).toBe('READY_FOR_RESICO_PAYMENT');
    });
});
```

- [ ] **Step 8: Run and verify GREEN**

Run: `npm run test --workspace=apps/api -- pure.test.js`

Expected: PASS, all tests including Steps 1, 5, and 7.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/workers/pure.js apps/api/test/blinkfy/pure.test.js
git commit -m "feat: add Argentina and Mexico tax calculators"
```

---

### Task 2: Dynamic tax calculator dispatcher

**Files:**
- Modify: `apps/api/src/services/taxService.js`
- Test: `apps/api/test/blinkfy/taxService.test.js` (new)

**Interfaces:**
- Consumes: `calculateBrazilTaxes`, `calculateArgentinaTaxes`, `calculateMexicoTaxes` from `../workers/pure` (Task 1).
- Produces: `exports.resolveCurrencyForResidence(taxResidence)` → `'BRL' | 'ARS' | 'MXN'`.
- Produces: `exports.calculateTaxesByResidence(taxResidence, grossLocal)` → the calculator's own fields plus `{ taxAmountLocal, netLocal, currency, regime }`.
- Keeps: `exports.calculateBrazilTaxes(grossBrl)` unchanged (existing callers, if any outside this plan, keep working).

- [ ] **Step 1: Write failing dispatcher tests**

Create `apps/api/test/blinkfy/taxService.test.js`:

```js
const taxService = require('../../src/services/taxService');

describe('resolveCurrencyForResidence', () => {
    test.each([
        ['brazil', 'BRL'],
        ['argentina', 'ARS'],
        ['mexico', 'MXN'],
        ['other', 'BRL'],
        [null, 'BRL'],
        [undefined, 'BRL'],
        ['unknown-country', 'BRL'],
    ])('%s -> %s', (taxResidence, expectedCurrency) => {
        expect(taxService.resolveCurrencyForResidence(taxResidence)).toBe(expectedCurrency);
    });
});

describe('calculateTaxesByResidence', () => {
    test('dispatches to the Argentina calculator for taxResidence "argentina"', async () => {
        const result = await taxService.calculateTaxesByResidence('argentina', 30000);
        expect(result.currency).toBe('ARS');
        expect(result.regime).toBe('monotributo');
        expect(result.taxAmountLocal).toBe(result.monotributoFee);
        expect(result.netLocal).toBe(result.netArs);
    });

    test('dispatches to the Mexico calculator for taxResidence "mexico"', async () => {
        const result = await taxService.calculateTaxesByResidence('mexico', 40000);
        expect(result.currency).toBe('MXN');
        expect(result.regime).toBe('resico');
        expect(result.taxAmountLocal).toBe(result.isr);
        expect(result.netLocal).toBe(result.netMxn);
    });

    test('falls back to the Brazil calculator for an unrecognized taxResidence', async () => {
        const result = await taxService.calculateTaxesByResidence('atlantis', 3000);
        expect(result.currency).toBe('BRL');
        expect(result.regime).toBe('irrf');
        expect(result.taxAmountLocal).toBe(result.irrf);
        expect(result.netLocal).toBe(result.netBrl);
    });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test --workspace=apps/api -- taxService.test.js`

Expected: FAIL — `resolveCurrencyForResidence` and `calculateTaxesByResidence` are not exported yet.

- [ ] **Step 3: Implement the dispatcher**

Replace the full contents of `apps/api/src/services/taxService.js` with:

```js
/**
 * Tax Service (LATAM) - Uses Tasklets for CPU-bound calculations.
 */

const tasklets = require('../lib/tasklets');
const {
    calculateBrazilTaxes,
    calculateArgentinaTaxes,
    calculateMexicoTaxes,
} = require('../workers/pure');

const RESIDENCE_CALCULATORS = {
    brazil: {
        calculator: calculateBrazilTaxes,
        currency: 'BRL',
        regime: 'irrf',
        fields: (r) => ({ taxAmountLocal: r.irrf, netLocal: r.netBrl }),
    },
    argentina: {
        calculator: calculateArgentinaTaxes,
        currency: 'ARS',
        regime: 'monotributo',
        fields: (r) => ({ taxAmountLocal: r.monotributoFee, netLocal: r.netArs }),
    },
    mexico: {
        calculator: calculateMexicoTaxes,
        currency: 'MXN',
        regime: 'resico',
        fields: (r) => ({ taxAmountLocal: r.isr, netLocal: r.netMxn }),
    },
};

// Unrecognized, null, or 'other' taxResidence falls back to 'brazil',
// preserving today's behavior for every candidate without taxResidence set.
function resolveResidenceKey(taxResidence) {
    return Object.prototype.hasOwnProperty.call(RESIDENCE_CALCULATORS, taxResidence)
        ? taxResidence
        : 'brazil';
}

exports.resolveCurrencyForResidence = (taxResidence) => (
    RESIDENCE_CALCULATORS[resolveResidenceKey(taxResidence)].currency
);

exports.calculateBrazilTaxes = async (grossBrl) => {
    try {
        return await tasklets.run(calculateBrazilTaxes, grossBrl);
    } catch (err) {
        console.error('Tasklets tax calc failed, falling back to sync:', err.message);
        return calculateBrazilTaxes(grossBrl);
    }
};

exports.calculateTaxesByResidence = async (taxResidence, grossLocal) => {
    const key = resolveResidenceKey(taxResidence);
    const { calculator, currency, regime, fields } = RESIDENCE_CALCULATORS[key];

    let result;
    try {
        result = await tasklets.run(calculator, grossLocal);
    } catch (err) {
        console.error('Tasklets tax calc failed, falling back to sync:', err.message);
        result = calculator(grossLocal);
    }

    return { ...result, ...fields(result), currency, regime };
};
```

- [ ] **Step 4: Run and verify GREEN**

Run: `npm run test --workspace=apps/api -- taxService.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/taxService.js apps/api/test/blinkfy/taxService.test.js
git commit -m "feat: dispatch tax calculation by candidate taxResidence"
```

---

### Task 3: Multi-currency wallet integration

**Files:**
- Modify: `apps/api/src/services/paymentService.js`
- Test: `apps/api/test/blinkfy/paymentService.test.js` (new)

**Interfaces:**
- Consumes: `taxService.resolveCurrencyForResidence`, `taxService.calculateTaxesByResidence` (Task 2).
- Modifies: `getExchangeRate(toCurrency = 'BRL')` (was `getExchangeRate()`, BRL-only).
- Modifies: `calculateNetSalary(grossUsd, toCurrency = 'BRL')` → now returns `{ grossUsd, grossLocal, currency, exchangeRate }` (was `{ grossUsd, grossBrl, exchangeRate }`; `calculateNetSalary` has no callers outside this file today, so this is not a breaking change for any existing consumer).
- Modifies: `getWalletSummaryForUser(userId, salaryUsd)` now looks up the candidate's `taxResidence` and uses the matching currency/calculator instead of hardcoded Brazil/BRL.

- [ ] **Step 1: Write failing multi-currency wallet tests**

Create `apps/api/test/blinkfy/paymentService.test.js`. This hits a real test database (same pattern as `revenueSharing.test.js`), so it needs `TEST_DATABASE_URL`/`DATABASE_URL` set when run.

```js
const { PrismaClient } = require('@prisma/client');
const { disconnectPrisma } = require('../../src/lib/prisma');
const paymentService = require('../../src/services/paymentService');

const prisma = new PrismaClient();
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function createUserWithProfile(taxResidence) {
    const user = await prisma.user.create({
        data: {
            email: `payment-service-${runId}-${taxResidence || 'none'}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: 'Payment Service Test User',
            userType: 'candidate',
        },
    });
    if (taxResidence !== undefined) {
        await prisma.candidateProfile.create({
            data: { userId: user.id, taxResidence },
        });
    }
    return user;
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

describe('getWalletSummaryForUser currency selection', () => {
    test('an Argentina candidate gets ARS projections, not BRL', async () => {
        const user = await createUserWithProfile('argentina');

        const summary = await paymentService.getWalletSummaryForUser(user.id, 1000);

        expect(summary.projections.currency).toBe('ARS');
        expect(summary.projections.regime).toBe('monotributo');
        expect(summary.projections).not.toHaveProperty('grossBrl');
    });

    test('a Mexico candidate gets MXN projections', async () => {
        const user = await createUserWithProfile('mexico');

        const summary = await paymentService.getWalletSummaryForUser(user.id, 1000);

        expect(summary.projections.currency).toBe('MXN');
        expect(summary.projections.regime).toBe('resico');
    });

    test('a candidate with no profile row falls back to Brazil/BRL, exactly like today', async () => {
        const user = await createUserWithProfile(undefined);

        const summary = await paymentService.getWalletSummaryForUser(user.id, 1000);

        expect(summary.projections.currency).toBe('BRL');
        expect(summary.projections.regime).toBe('irrf');
    });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `TEST_DATABASE_URL='postgresql://admin:password@localhost:5433/blinkfy_test' DATABASE_URL='postgresql://admin:password@localhost:5433/blinkfy_test' npm run test --workspace=apps/api -- paymentService.test.js`

Expected: FAIL — every candidate currently gets `currency: 'BRL'` regardless of `taxResidence` (the Argentina and Mexico assertions fail; `grossBrl` is still present today).

- [ ] **Step 3: Generalize exchange-rate fetching and wire the dispatcher into `getWalletSummaryForUser`**

Replace `apps/api/src/services/paymentService.js` lines 1-81 (everything from the top through the end of `getWalletSummaryForUser`) with:

```js
/**
 * Payment service: exchange rate (API or env), net salary, wallet persistence.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXCHANGE_RATE_APIS = {
    BRL: process.env.EXCHANGE_RATE_API || 'https://api.frankfurter.app/latest?from=USD&to=BRL',
    ARS: process.env.EXCHANGE_RATE_API_ARS || 'https://api.frankfurter.app/latest?from=USD&to=ARS',
    MXN: process.env.EXCHANGE_RATE_API_MXN || 'https://api.frankfurter.app/latest?from=USD&to=MXN',
};

const EXCHANGE_RATE_FALLBACKS = {
    BRL: parseFloat(process.env.EXCHANGE_RATE) || 5.5,
    ARS: parseFloat(process.env.EXCHANGE_RATE_ARS) || 1000,
    MXN: parseFloat(process.env.EXCHANGE_RATE_MXN) || 18,
};

async function fetchExchangeRate(toCurrency = 'BRL') {
    try {
        const res = await fetch(EXCHANGE_RATE_APIS[toCurrency]);
        if (!res.ok) throw new Error('Rate API error');
        const data = await res.json();
        const rate = data?.rates?.[toCurrency] ?? data?.rates?.[toCurrency.toLowerCase()];
        if (rate != null) {
            await prisma.exchangeRateLog.create({
                data: { fromCur: 'USD', toCur: toCurrency, rate, source: 'api' },
            }).catch(() => null);
            return rate;
        }
    } catch (err) {
        console.warn(`Exchange rate API failed for ${toCurrency}, using fallback:`, err.message);
    }
    const fallback = EXCHANGE_RATE_FALLBACKS[toCurrency];
    await prisma.exchangeRateLog.create({
        data: { fromCur: 'USD', toCur: toCurrency, rate: fallback, source: 'env' },
    }).catch(() => null);
    return fallback;
}

async function getExchangeRate(toCurrency = 'BRL') {
    const last = await prisma.exchangeRateLog.findFirst({
        where: { fromCur: 'USD', toCur: toCurrency },
        orderBy: { createdAt: 'desc' },
    });
    const maxAgeMs = 60 * 60 * 1000;
    if (last && (Date.now() - last.createdAt.getTime() < maxAgeMs)) return last.rate;
    return fetchExchangeRate(toCurrency);
}

exports.getExchangeRate = getExchangeRate;

exports.calculateNetSalary = async (grossUsd, toCurrency = 'BRL') => {
    const rate = await getExchangeRate(toCurrency);
    const grossLocal = grossUsd * rate;
    return { grossUsd, grossLocal, currency: toCurrency, exchangeRate: rate };
};

exports.getWalletSummaryForUser = async (userId, salaryUsd) => {
    const amount = parseFloat(salaryUsd) || 0;
    const taxService = require('./taxService');
    const [transactions, candidateProfile] = await Promise.all([
        prisma.walletTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }),
        prisma.candidateProfile.findUnique({ where: { userId } }),
    ]);
    const balanceUsd = transactions.reduce((sum, t) => {
        if (t.status !== 'completed') return sum;
        return sum + (t.type === 'withdrawal' ? -t.amountUsd : t.amountUsd);
    }, 0);
    const pendingEscrow = transactions
        .filter((t) => t.status === 'pending' && t.type !== 'withdrawal')
        .reduce((sum, t) => sum + t.amountUsd, 0);
    const projectionAmount = amount > 0 ? amount : (balanceUsd > 0 ? balanceUsd : 5000);
    const taxResidence = candidateProfile?.taxResidence;
    const currency = taxService.resolveCurrencyForResidence(taxResidence);
    const currencyData = await exports.calculateNetSalary(projectionAmount, currency);
    const taxData = await taxService.calculateTaxesByResidence(taxResidence, currencyData.grossLocal);
    return {
        wallet: { balanceUsd, availableForWithdrawal: Math.max(0, balanceUsd * 0.9), pendingEscrow },
        projections: { ...currencyData, ...taxData },
        fees: { platformSpread: 0.02, transferFeeUsd: 15 },
        transactions: transactions.map((t) => ({
            id: t.id,
            type: t.type,
            description: t.description,
            amount: t.type === 'withdrawal' ? -t.amountUsd : t.amountUsd,
            date: t.createdAt.toISOString().slice(0, 10),
            status: t.status,
        })),
    };
};
```

Leave the rest of the file (`getRecruiterEarnings` and everything after it) unchanged.

- [ ] **Step 4: Run and verify GREEN**

Run: `TEST_DATABASE_URL='postgresql://admin:password@localhost:5433/blinkfy_test' DATABASE_URL='postgresql://admin:password@localhost:5433/blinkfy_test' npm run test --workspace=apps/api -- paymentService.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/paymentService.js apps/api/test/blinkfy/paymentService.test.js
git commit -m "feat: select wallet currency and tax calculator from candidate taxResidence"
```

---

### Task 4: Full verification and PR

**Files:** none (verification only).

- [ ] **Step 1: Run the complete API test suite**

Run: `TEST_DATABASE_URL='postgresql://admin:password@localhost:5433/blinkfy_test' DATABASE_URL='postgresql://admin:password@localhost:5433/blinkfy_test' npm run test --workspace=apps/api`

Expected: exits `0`; test count is the pre-existing 216 plus the new tests added in Tasks 1-3 (pure.test.js, taxService.test.js, paymentService.test.js).

- [ ] **Step 2: Run the web test suite and both builds (this branch didn't touch apps/web or packages/shared, so this reconfirms nothing else regressed)**

Run: `npm run test --workspace=apps/web`

Run: `npm run build --workspace=packages/shared`

Run: `npm run build --workspace=apps/web`

Expected: all exit `0`, same counts/routes as the `main` baseline (36 web tests, 8 routes).

- [ ] **Step 3: Push and open a PR**

```bash
git push -u origin feat/latam-tax-calculators-15
```

Open a PR against `main` via `gh pr create`, summarizing the two new calculators, the dispatcher, the wallet wiring, and the tax-table sources. Link issue #15. After merge, invoke the finishing-a-development-branch skill's cleanup (already established pattern in this branch's history: `git checkout main && git pull && git branch -D feat/latam-tax-calculators-15`).
