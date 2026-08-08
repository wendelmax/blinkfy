import request from 'supertest';
import { createApp } from '../src/app';

test('GET /health returns API and database status', async () => {
    const app = createApp({
        prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) },
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', db: 'ok' });
});
