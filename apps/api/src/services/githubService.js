/**
 * GitHub service: real API + Tasklets for repo analysis (CPU-bound).
 */

const tasklets = require('../lib/tasklets');
const { processGitHubRepos } = require('../workers/pure');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function githubRequest(path) {
    const url = `https://api.github.com${path}`;
    const headers = {
        Accept: 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
    };
    const res = await fetch(url, { headers });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    }
    return res.json();
}

async function analyzeUserRepos(username) {
    if (!username || !username.trim()) {
        return {
            username: '',
            totalRepos: 0,
            topLanguages: [],
            auditMetrics: { cleanCode: 0, testCoverage: 0, architectureDesign: 0, consistency: 0 },
            efficiencyIndex: 0,
        };
    }

    const login = username.trim().replace(/^@/, '');
    const user = await githubRequest(`/users/${login}`);
    if (!user) {
        return {
            username: login,
            totalRepos: 0,
            topLanguages: [],
            auditMetrics: { cleanCode: 70, testCoverage: 50, architectureDesign: 70, consistency: 70 },
            efficiencyIndex: 60,
        };
    }

    const repos = await githubRequest(`/users/${login}/repos?per_page=100&sort=updated`);
    const repoList = Array.isArray(repos) ? repos : [];

    let result;
    try {
        result = await tasklets.run(processGitHubRepos, { login, repos: repoList });
    } catch (err) {
        console.warn('Tasklets repo analysis failed, sync fallback:', err.message);
        result = processGitHubRepos({ login, repos: repoList });
    }
    result.efficiencyIndex = Math.min(100, result.efficiencyIndex);
    return result;
}

function calculateEScore(technicalScore, salaryDemand, marketAverage) {
    if (!marketAverage || marketAverage <= 0) return Math.min(100, technicalScore);
    const delta = marketAverage / Math.max(1, salaryDemand);
    return Math.min(100, Math.round(technicalScore * Math.min(delta, 1.5)));
}

exports.analyzeUserRepos = analyzeUserRepos;
exports.calculateEScore = calculateEScore;
