const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../../src/app');
const { disconnectPrisma } = require('../../src/lib/prisma');
const { createAnalyticsController } = require('../../src/controllers/blinkfy/analyticsController');

const prisma = new PrismaClient();
const app = createApp({ prisma });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function token(user) {
    return `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'development_secret')}`;
}

async function context(label = 'analytics') {
    const user = await prisma.user.create({ data: { email: `${label}-${runId}-${Math.random()}@example.test`, fullName: label, userType: 'recruiter' } });
    const workspace = await prisma.workspace.create({ data: { name: `${label} workspace ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `${label} client ${runId}` } });
    await prisma.workspaceMembership.create({ data: { workspaceId: workspace.id, userId: user.id, role: 'viewer' } });
    const job = await prisma.blinkfyJob.create({ data: { clientId: client.id, title: 'Account Executive', requirements: ['sales'] } });
    return { user, workspace, client, job };
}

function get(contextValue, query = {}) {
    return request(app)
        .get(`/api/blinkfy/clients/${contextValue.client.id}/analytics`)
        .query(query)
        .set('Authorization', token(contextValue.user))
        .set('x-workspace-id', contextValue.workspace.id);
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('allows a workspace viewer to read safe client analytics', async () => {
    const value = await context();
    const response = await get(value);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
        scope: { clientId: value.client.id, jobId: null, from: null, to: null },
        applications: { total: 0 },
    });
    expect(response.body).toHaveProperty('conversion');
    expect(response.body).toHaveProperty('stageTime');
    expect(response.body).toHaveProperty('consent');
    expect(response.body).toHaveProperty('score');
    expect(JSON.stringify(response.body)).not.toMatch(/private|email|phone|resume|normalizedEmail/i);
});

test('rejects a user without workspace membership', async () => {
    const value = await context('no-member');
    const outsider = await prisma.user.create({ data: { email: `outsider-${runId}-${Math.random()}@example.test`, fullName: 'Outsider', userType: 'recruiter' } });
    const response = await request(app)
        .get(`/api/blinkfy/clients/${value.client.id}/analytics`)
        .set('Authorization', token(outsider))
        .set('x-workspace-id', value.workspace.id);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Workspace access denied');
});

test('does not expose a client from another workspace', async () => {
    const owner = await context('owner');
    const outsider = await context('other');
    const response = await get({ ...owner, user: outsider.user, workspace: outsider.workspace });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Client not found');
});

test('returns 404 when job does not belong to the client', async () => {
    const value = await context('job-scope');
    const otherJob = await prisma.blinkfyJob.create({ data: { clientId: value.client.id, title: 'Other role', requirements: [] } });
    const response = await get(value, { jobId: `${otherJob.id}-missing` });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Job not found');
});

test.each([
    ['bad from', { from: 'not-a-date' }],
    ['bad to', { to: '2026-99-99' }],
    ['calendar-invalid date', { from: '2026-02-30' }],
    ['calendar-invalid timestamp', { from: '2026-04-31T12:00:00.000Z' }],
    ['inverted interval', { from: '2026-08-10T00:00:00.000Z', to: '2026-08-09T00:00:00.000Z' }],
])('rejects %s with a safe validation message', async (_label, query) => {
    const value = await context('dates');
    const response = await get(value, query);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/date|before|interval|from|to/i);
    expect(response.body.message).not.toMatch(/prisma|database|undefined|stack/i);
});

test('rejects repeated jobId query values instead of silently dropping the filter', async () => {
    const value = await context('repeated-job');
    const response = await request(app)
        .get(`/api/blinkfy/clients/${value.client.id}/analytics?jobId=${value.job.id}&jobId=another`)
        .set('Authorization', token(value.user))
        .set('x-workspace-id', value.workspace.id);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('jobId must be a nonempty string');
});

test('does not enumerate a job from another client in the same workspace', async () => {
    const value = await context('client-scope');
    const otherClient = await prisma.client.create({ data: { workspaceId: value.workspace.id, name: 'Other client' } });
    const otherJob = await prisma.blinkfyJob.create({ data: { clientId: otherClient.id, title: 'Other role', requirements: [] } });
    const response = await get(value, { jobId: otherJob.id });
    expect(response.status).toBe(404);
});

test('does not treat a dependency error carrying status 400 as validation', async () => {
    const controller = createAnalyticsController({
        prisma: {
            client: {
                findFirst: async () => {
                    const error = new Error('dependency failure');
                    error.status = 400;
                    throw error;
                },
            },
        },
    });
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    await controller.getAnalytics({ params: { clientId: 'client-1' }, query: {}, workspace: { id: 'workspace-1' } }, response);
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ message: 'Unable to load analytics' });
});
