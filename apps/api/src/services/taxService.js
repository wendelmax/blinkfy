/**
 * Tax Service (LATAM)
 * Calculates local tax obligations for candidates (Contractor model).
 */

exports.calculateBrazilTaxes = (grossBrl) => {
    // Basic simulation of Carnê-Leão (IRRF) for individual contractors in Brazil
    // Note: Most devs use PJ (CNPJ) which has lower taxes, but we'll mock a default flow.

    let rate = 0;
    let deduction = 0;

    if (grossBrl > 4664.68) {
        rate = 0.275;
        deduction = 893.66;
    } else if (grossBrl > 3751.06) {
        rate = 0.225;
        deduction = 662.77;
    } else if (grossBrl > 2826.66) {
        rate = 0.15;
        deduction = 369.63;
    } else if (grossBrl > 2112) {
        rate = 0.075;
        deduction = 158.40;
    }

    const irrf = (grossBrl * rate) - deduction;
    const netBrl = grossBrl - irrf;

    return {
        grossBrl,
        irrf: Math.max(0, irrf),
        netBrl: Math.max(0, netBrl),
        taxRateEffective: grossBrl > 0 ? (Math.max(0, irrf) / grossBrl) * 100 : 0,
        currency: 'BRL',
        complianceStatus: 'READY_FOR_DARF'
    };
};
