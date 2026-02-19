/**
 * Pure functions for Tasklets workers.
 * Must be fully self-contained (no closures over external state).
 */

function calculateBrazilTaxes(grossBrl) {
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
    calculateEScore,
    processGitHubRepos,
};
