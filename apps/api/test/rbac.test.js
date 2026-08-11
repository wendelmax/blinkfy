import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

const { requireRole } = require('../src/middleware/rbac');

describe('RBAC middleware', () => {
    it('allows configured roles and rejects other roles', async () => {
        const app = express();
        app.get('/recruiter', (req, _res, next) => { req.user = { type: 'recruiter' }; next(); }, requireRole('recruiter', 'company'), (_req, res) => res.json({ ok: true }));
        app.get('/candidate', (req, _res, next) => { req.user = { type: 'recruiter' }; next(); }, requireRole('candidate'), (_req, res) => res.json({ ok: true }));

        expect((await request(app).get('/recruiter')).status).toBe(200);
        const denied = await request(app).get('/candidate');
        expect(denied.status).toBe(403);
        expect(denied.body).toEqual({ message: 'Insufficient permissions' });
    });
});
