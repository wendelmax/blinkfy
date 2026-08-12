import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { logger } from '../src/lib/logger';
import request from 'supertest';

describe('observability', () => {
    it('propagates a caller request id or creates one', async () => {
        const app = createApp({ prisma: { $queryRaw: async () => [{ '?column?': 1 }] } });
        const supplied = await request(app).get('/health').set('x-request-id', 'pilot-123');
        expect(supplied.headers['x-request-id']).toBe('pilot-123');

        const generated = await request(app).get('/health');
        expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('writes structured JSON for errors', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logger.error('candidate.import_failed', { requestId: 'req-1', workspaceId: 'ws-1', error: new Error('bad csv') });
        const payload = JSON.parse(spy.mock.calls[0][0]);
        expect(payload).toMatchObject({ level: 'error', event: 'candidate.import_failed', requestId: 'req-1', workspaceId: 'ws-1' });
        expect(payload.error.message).toBe('bad csv');
        spy.mockRestore();
    });
});
