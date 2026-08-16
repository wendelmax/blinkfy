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
