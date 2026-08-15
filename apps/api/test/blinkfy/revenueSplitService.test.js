const { calculateRevenueSplit } = require('../../src/services/blinkfy/revenueSplitService');

describe('calculateRevenueSplit', () => {
    it('uses the 70/30 default and assigns the residual to Blinkfy', () => {
        expect(calculateRevenueSplit({ currency: 'brl', grossAmountMinor: 101 })).toEqual({
            currency: 'BRL', grossAmountMinor: 101,
            recruiterBasisPoints: 7000, platformBasisPoints: 3000,
            recruiterAmountMinor: 70, platformAmountMinor: 31,
            confirmed: false, transferred: false,
        });
    });

    it('supports custom shares with integer truncation and residual allocation', () => {
        expect(calculateRevenueSplit({
            currency: 'USD', grossAmountMinor: 101,
            recruiterBasisPoints: 3333, platformBasisPoints: 6667,
        })).toEqual({
            currency: 'USD', grossAmountMinor: 101,
            recruiterBasisPoints: 3333, platformBasisPoints: 6667,
            recruiterAmountMinor: 33, platformAmountMinor: 68,
            confirmed: false, transferred: false,
        });
    });

    it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
        'rejects invalid gross amount %s',
        (grossAmountMinor) => {
            expect(() => calculateRevenueSplit({ currency: 'BRL', grossAmountMinor })).toThrow();
        },
    );

    it.each(['BR', 'brl ', 'US1', '', null, 123])('rejects malformed currency %s', (currency) => {
        expect(() => calculateRevenueSplit({ currency, grossAmountMinor: 100 })).toThrow();
    });

    it.each([
        { recruiterBasisPoints: 7000.5 },
        { platformBasisPoints: 2999.5 },
        { recruiterBasisPoints: 7001, platformBasisPoints: 3000 },
        { recruiterBasisPoints: 7000, platformBasisPoints: 2999 },
    ])('rejects invalid basis points %o', (shares) => {
        expect(() => calculateRevenueSplit({ currency: 'BRL', grossAmountMinor: 100, ...shares })).toThrow();
    });
});
