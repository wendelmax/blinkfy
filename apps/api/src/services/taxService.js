/**
 * Tax Service (LATAM) - Uses Tasklets for CPU-bound calculations.
 */

const tasklets = require('../lib/tasklets');
const { calculateBrazilTaxes } = require('../workers/pure');

exports.calculateBrazilTaxes = async (grossBrl) => {
    try {
        return await tasklets.run(calculateBrazilTaxes, grossBrl);
    } catch (err) {
        console.error('Tasklets tax calc failed, falling back to sync:', err.message);
        return calculateBrazilTaxes(grossBrl);
    }
};
