import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const { validateBody } = require('../src/middleware/validateBody');
const { loginSchema } = require('../src/validation/schemas');

describe('request validation', () => {
    it('returns structured 400 errors for invalid payloads', async () => {
        const app = express();
        app.use(express.json());
        app.post('/login', validateBody(loginSchema), (_req, res) => res.json({ ok: true }));
        const response = await request(app).post('/login').send({ email: 'not-an-email', password: '' });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid request body');
        expect(response.body.errors.length).toBeGreaterThan(0);
    });
});
