/**
 * Pure functions for Tasklets workers.
 * Must be fully self-contained (no closures over external state).
 */

function calculateBrazilTaxes(grossBrl) {
    if (typeof grossBrl !== 'number' || !Number.isFinite(grossBrl) || grossBrl <= 0) {
        throw new RangeError('grossBrl must be a positive finite number');
    }
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
        deduction = 158.4;
    }

    const irrf = grossBrl * rate - deduction;
    const netBrl = grossBrl - irrf;

    return {
        grossBrl,
        irrf: Math.max(0, irrf),
        netBrl: Math.max(0, netBrl),
        taxRateEffective: grossBrl > 0 ? (Math.max(0, irrf) / grossBrl) * 100 : 0,
        currency: 'BRL',
        complianceStatus: 'READY_FOR_DARF',
    };
}

function calculateArgentinaTaxes(grossArs) {
    if (typeof grossArs !== 'number' || !Number.isFinite(grossArs) || grossArs <= 0) {
        throw new RangeError('grossArs must be a positive finite number');
    }

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

    const annualizedArs = grossArs * 12;
    // Above category K there is no Monotributo category (the taxpayer must
    // switch to "Responsable Inscripto"); this calculator caps at K rather
    // than modeling that separate regime, and flags outOfRegimeRange so
    // callers know the figure understates the real (progressive) tax burden.
    const matchedCategory = MONOTRIBUTO_CATEGORIES.find((c) => annualizedArs <= c.annualLimitArs);
    const outOfRegimeRange = !matchedCategory;
    const bracket = matchedCategory || MONOTRIBUTO_CATEGORIES[MONOTRIBUTO_CATEGORIES.length - 1];

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
        outOfRegimeRange,
    };
}

function calculateMexicoTaxes(grossMxn) {
    if (typeof grossMxn !== 'number' || !Number.isFinite(grossMxn) || grossMxn <= 0) {
        throw new RangeError('grossMxn must be a positive finite number');
    }

    // RESICO personas físicas (Mexico) applies the bracket's rate to the ENTIRE
    // month's income (non-marginal), unlike Brazil's IRRF. Rates unchanged for
    // 2026 per Anexo 8 of the RMF 2026 (source:
    // https://resicocalc.com/blog/tablas-isr-resico-2026). Top bracket's
    // eligibility cap is 3,500,000 MXN annual (~291,666.66/month); the rate
    // table's Infinity upper limit is for rate lookup only — the actual
    // eligibility cap is enforced separately below via outOfRegimeRange.
    const RESICO_BRACKETS = [
        { limitMxn: 25000, rate: 0.01 },
        { limitMxn: 50000, rate: 0.011 },
        { limitMxn: 83333.33, rate: 0.015 },
        { limitMxn: 208333.33, rate: 0.02 },
        { limitMxn: Infinity, rate: 0.025 },
    ];

    const RESICO_ANNUAL_ELIGIBILITY_CAP_MXN = 3500000;
    const bracket = RESICO_BRACKETS.find((b) => grossMxn <= b.limitMxn);
    const isr = grossMxn * bracket.rate;

    return {
        grossMxn,
        isr,
        netMxn: grossMxn - isr,
        taxRateEffective: bracket.rate * 100,
        currency: 'MXN',
        complianceStatus: 'READY_FOR_RESICO_PAYMENT',
        outOfRegimeRange: grossMxn * 12 > RESICO_ANNUAL_ELIGIBILITY_CAP_MXN,
    };
}

function calculateEScore(technicalScore, salaryDemand, marketAverage) {
    if (!marketAverage || marketAverage <= 0) return Math.min(100, technicalScore);
    const delta = marketAverage / Math.max(1, salaryDemand);
    return Math.min(100, Math.round(technicalScore * Math.min(delta, 1.5)));
}

function processGitHubRepos(reposData) {
    const { login, user, repos } = reposData;
    const repoList = Array.isArray(repos) ? repos : [];
    const publicRepos = repoList.filter((r) => !r.private);
    const totalRepos = publicRepos.length;

    const langCount = {};
    for (const repo of publicRepos) {
        if (repo.language) {
            langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        }
    }
    const topLanguages = Object.entries(langCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

    const withDesc = publicRepos.filter((r) => r.description).length;
    const now = Date.now();
    const recentActive = publicRepos.filter((r) => {
        const updated = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        return now - updated < 180 * 24 * 60 * 60 * 1000;
    }).length;

    const cleanCode = totalRepos === 0 ? 70 : Math.min(95, 70 + Math.floor((withDesc / totalRepos) * 25));
    const architectureDesign = totalRepos === 0 ? 70 : Math.min(95, 70 + Math.floor((recentActive / Math.max(1, totalRepos)) * 25));
    const consistency = totalRepos === 0 ? 70 : Math.min(90, 70 + topLanguages.length * 4);
    const testCoverage = totalRepos === 0 ? 50 : Math.min(85, 50 + Math.floor(totalRepos * 2));

    const auditMetrics = { cleanCode, testCoverage, architectureDesign, consistency };
    const efficiencyIndex = Math.min(100, Math.round(
        (auditMetrics.cleanCode + auditMetrics.testCoverage + auditMetrics.architectureDesign + auditMetrics.consistency) / 4
    ));

    return {
        username: login,
        totalRepos,
        topLanguages,
        auditMetrics,
        efficiencyIndex,
    };
}

module.exports = {
    calculateBrazilTaxes,
    calculateArgentinaTaxes,
    calculateMexicoTaxes,
    calculateEScore,
    processGitHubRepos,
};
