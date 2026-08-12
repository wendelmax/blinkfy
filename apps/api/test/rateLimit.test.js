import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const { createAuthRateLimit } = require('../src/middleware/authRateLimit');

describe('authentication rate limit', () => {
    it('returns 429 after the configured number of attempts', async () => {
        const app = express();
        app.post('/login', createAuthRateLimit({ max: 2, windowMs: 60_000 }), (_req, res) => res.status(401).json({ message: 'Invalid credentials' }));

        expect((await request(app).post('/login')).status).toBe(401);
        expect((await request(app).post('/login')).status).toBe(401);
        const blocked = await request(app).post('/login');

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({ message: 'Too many authentication attempts. Try again later.' });
        expect(blocked.headers['ratelimit-limit']).toBeDefined();
    });
});
