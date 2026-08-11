import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const servicePath = '../../src/services/githubService';

describe('githubService resilience', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('GITHUB_RETRY_ATTEMPTS', '2');
    vi.stubEnv('GITHUB_RETRY_DELAY_MS', '0');
    vi.stubEnv('GITHUB_CACHE_TTL_MS', '60000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('retries transient 503 responses and returns the successful response', async () => {
    const responses = [
      { ok: false, status: 503, statusText: 'Unavailable', headers: new Headers(), json: async () => ({}) },
      { ok: true, status: 200, headers: new Headers(), json: async () => ({ login: 'ada' }) },
    ];
    global.fetch = vi.fn(async () => responses.shift());
    const service = await import(servicePath);

    await expect(service.githubRequestForTest('/users/ada')).resolves.toEqual({ login: 'ada' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('uses Retry-After for rate limits and falls back to the last cached success', async () => {
    vi.stubEnv('GITHUB_CACHE_TTL_MS', '1');
    const sleep = vi.fn(async () => {});
    const responses = [
      { ok: true, status: 200, headers: new Headers(), json: async () => ({ login: 'ada', name: 'Ada' }) },
      { ok: false, status: 429, statusText: 'Too Many Requests', headers: new Headers({ 'retry-after': '1' }), json: async () => ({}) },
      { ok: false, status: 429, statusText: 'Too Many Requests', headers: new Headers({ 'retry-after': '1' }), json: async () => ({}) },
      { ok: false, status: 429, statusText: 'Too Many Requests', headers: new Headers({ 'retry-after': '1' }), json: async () => ({}) },
    ];
    global.fetch = vi.fn(async () => responses.shift());
    const service = await import(servicePath);
    service.__setSleepForTest(sleep);

    await expect(service.githubRequestForTest('/users/ada')).resolves.toEqual({ login: 'ada', name: 'Ada' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(service.githubRequestForTest('/users/ada')).resolves.toEqual({ login: 'ada', name: 'Ada' });
    expect(sleep).toHaveBeenCalledWith(1000);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('does not cache or retry a not-found response', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found', headers: new Headers(), json: async () => ({}) }));
    const service = await import(servicePath);

    await expect(service.githubRequestForTest('/users/missing')).resolves.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
