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
