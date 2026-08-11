/**
 * GitHub service: real API + Tasklets for repo analysis (CPU-bound).
 */

const tasklets = require('../lib/tasklets');
const { processGitHubRepos } = require('../workers/pure');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RETRY_ATTEMPTS = Math.max(0, Number.parseInt(process.env.GITHUB_RETRY_ATTEMPTS || '3', 10));
const RETRY_DELAY_MS = Math.max(0, Number.parseInt(process.env.GITHUB_RETRY_DELAY_MS || '250', 10));
const CACHE_TTL_MS = Math.max(0, Number.parseInt(process.env.GITHUB_CACHE_TTL_MS || '30000', 10));
const responseCache = new Map();
let sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelay(response, attempt) {
    const retryAfter = response?.headers?.get?.('retry-after');
    if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) return Math.min(30000, Math.max(0, seconds * 1000));
        const date = Date.parse(retryAfter);
        if (Number.isFinite(date)) return Math.min(30000, Math.max(0, date - Date.now()));
    }
    return Math.min(30000, RETRY_DELAY_MS * (2 ** attempt));
}

async function githubRequest(path) {
    const cached = responseCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const url = `https://api.github.com${path}`;
    const headers = {
        Accept: 'application/vnd.github.v3+json',
        ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
    };
    let lastError;
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
        let res;
        try {
            res = await fetch(url, { headers });
        } catch (error) {
            lastError = error;
            if (attempt === RETRY_ATTEMPTS) break;
            await sleep(retryDelay(null, attempt));
            continue;
        }
        if (res.ok) {
            const value = await res.json();
            if (CACHE_TTL_MS > 0) responseCache.set(path, { value, expiresAt: Date.now() + CACHE_TTL_MS });
            return value;
        }
        if (res.status === 404) return null;
        if (![429, 500, 502, 503, 504].includes(res.status)) {
            throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
        }
        lastError = new Error(`GitHub API ${res.status}: ${res.statusText}`);
        if (attempt < RETRY_ATTEMPTS) await sleep(retryDelay(res, attempt));
    }
    const stale = responseCache.get(path);
    if (stale) return stale.value;
    throw lastError || new Error('GitHub API request failed');
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
// Kept private in production; exported only to make retry behavior deterministic in tests.
exports.githubRequestForTest = githubRequest;
exports.__setSleepForTest = (fn) => { sleep = fn; };
