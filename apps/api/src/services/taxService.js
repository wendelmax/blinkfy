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
// taxResidence is free-text (CandidateProfile has no enforced casing), so
// trim/lowercase before matching against RESIDENCE_CALCULATORS keys.
function resolveResidenceKey(taxResidence) {
    const key = typeof taxResidence === 'string' ? taxResidence.trim().toLowerCase() : '';
    return Object.prototype.hasOwnProperty.call(RESIDENCE_CALCULATORS, key) ? key : 'brazil';
}

exports.resolveCurrencyForResidence = (taxResidence) => (
    RESIDENCE_CALCULATORS[resolveResidenceKey(taxResidence)].currency
);

exports.calculateTaxesByResidence = async (taxResidence, grossLocal) => {
    const key = resolveResidenceKey(taxResidence);
    const { calculator, currency, regime, fields } = RESIDENCE_CALCULATORS[key];

    // Validate up front (all three pure calculators enforce this identical
    // "positive finite number" guard) so a bad-input RangeError never has to
    // round-trip through tasklets.run(). This matters because tasklets always
    // reconstructs worker errors as a plain `new Error(msg.error)` (see
    // worker.js), discarding the original RangeError subtype/stack — so an
    // `instanceof RangeError` check in the catch below would never be true,
    // and every validation rejection would otherwise still hit the
    // "Tasklets tax calc failed, falling back to sync" log below, exactly
    // the misleading-log problem this fix exists to prevent.
    if (typeof grossLocal !== 'number' || !Number.isFinite(grossLocal) || grossLocal <= 0) {
        throw new RangeError('grossLocal must be a positive finite number');
    }

    let result;
    try {
        result = await tasklets.run(calculator, grossLocal);
    } catch (err) {
        console.error('Tasklets tax calc failed, falling back to sync:', err.message);
        result = calculator(grossLocal);
    }

    return { ...result, ...fields(result), currency, regime };
};
