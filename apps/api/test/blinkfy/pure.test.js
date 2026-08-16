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
