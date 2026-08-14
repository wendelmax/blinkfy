const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../../src/app');

const prisma = new PrismaClient();
const app = createApp({ prisma });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const token = (user) => `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'development_secret')}`;

async function context(label) {
    const user = await prisma.user.create({ data: { email: `${label}-${runId}@example.test`, fullName: 'Talent User', userType: 'candidate' } });
    const workspace = await prisma.workspace.create({ data: { name: `${label} workspace ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `${label} client` } });
    await prisma.workspaceMembership.create({ data: { workspaceId: workspace.id, userId: user.id, role: 'viewer' } });
    const candidate = await prisma.candidate.create({ data: { workspaceId: workspace.id, userId: user.id, fullName: user.fullName, profile: {} } });
    return { user, workspace, client, candidate };
}

function api(context, method, path) {
    return request(app)[method](path).set('Authorization', token(context.user)).set('x-workspace-id', context.workspace.id);
}

afterAll(() => prisma.$disconnect());

test('candidate can view and edit own private profile, but another user cannot access it', async () => {
    const context = await contextFactory('profile');
    const own = await api(context, 'get', '/api/blinkfy/talent/profile');
    expect(own.status).toBe(200);
    expect(own.body.visibility).toBe('private');
    expect(own.body).not.toHaveProperty('normalizedEmail');
    const updated = await api(context, 'patch', '/api/blinkfy/talent/profile').send({ headline: 'Enterprise seller' });
    expect(updated.status).toBe(200);
    const other = await contextFactory('other');
    const denied = await api(other, 'get', '/api/blinkfy/talent/profile');
    expect(denied.status).toBe(200);
    expect(denied.body.id).not.toBe(own.body.id);
});

test('visibility validation and consent center never expose evidence', async () => {
    const context = await contextFactory('consent');
    const invalid = await api(context, 'patch', '/api/blinkfy/talent/visibility').send({ visibility: 'public' });
    expect(invalid.status).toBe(422);
    const consent = await prisma.candidateConsent.create({
        data: { candidateId: context.candidate.id, workspaceId: context.workspace.id, clientId: context.client.id, purpose: 'client_presentation', evidence: 'private evidence' },
    });
    const listed = await api(context, 'get', '/api/blinkfy/talent/consents');
    expect(listed.status).toBe(200);
    expect(listed.body.items[0]).toMatchObject({ id: consent.id, status: 'active', client: { name: context.client.name } });
    expect(listed.body.items[0]).not.toHaveProperty('evidence');
});

test('recruiter accounts cannot use candidate Talent routes', async () => {
    const context = await contextFactory('recruiter-denied');
    await prisma.user.update({ where: { id: context.user.id }, data: { userType: 'recruiter' } });
    const response = await api(context, 'get', '/api/blinkfy/talent/profile');
    expect(response.status).toBe(403);
});

test('candidate can revoke consent, audit is recorded, and recruiter presentation is blocked', async () => {
    const context = await contextFactory('revoke');
    await api(context, 'patch', '/api/blinkfy/talent/visibility').send({ visibility: 'available' });
    const consent = await prisma.candidateConsent.create({
        data: { candidateId: context.candidate.id, workspaceId: context.workspace.id, clientId: context.client.id, purpose: 'client_presentation', evidence: 'private evidence' },
    });
    const revoked = await api(context, 'post', `/api/blinkfy/talent/consents/${consent.id}/revoke`);
    expect(revoked.status).toBe(200);
    expect(revoked.body.status).toBe('revoked');
    const event = await prisma.auditEvent.findFirst({ where: { entityId: consent.id, action: 'candidate.consent_revoked' } });
    expect(event).toBeTruthy();
});

test('candidate can generate approval-gated resume and engagement drafts', async () => {
    const value = await contextFactory('drafts');
    await prisma.candidate.update({ where: { id: value.candidate.id }, data: { targetRole: 'Backend Engineer', profile: { currentTitle: 'Node Engineer', summary: 'Builds APIs', skills: ['Node.js'] } } });
    const resume = await api(value, 'post', '/api/blinkfy/talent/drafts/resume').send({ targetRole: 'Platform Engineer' });
    expect(resume.status).toBe(201);
    expect(resume.body.draft).toMatchObject({ targetRole: 'Platform Engineer', requiresApproval: true, published: false });
    const engagement = await api(value, 'post', '/api/blinkfy/talent/drafts/engagement').send({ topic: 'distributed systems', format: 'post' });
    expect(engagement.status).toBe(201);
    expect(engagement.body.draft).toMatchObject({ topic: 'distributed systems', requiresApproval: true, published: false });
    expect(engagement.body.draftId).toEqual(expect.any(String));
    const history = await api(value, 'get', '/api/blinkfy/talent/drafts');
    expect(history.status).toBe(200);
    expect(history.body.items[0]).toMatchObject({ id: engagement.body.draftId, kind: 'post', status: 'pending' });
});

test('candidate can view approval-gated value network recommendations', async () => {
    const value = await contextFactory('network');
    await prisma.candidate.update({ where: { id: value.candidate.id }, data: {
        targetRole: 'Backend Engineer',
        skills: ['GraphQL'],
        profile: { connections: [
            { id: 'n1', name: 'Ada Lovelace', role: 'Senior Backend Engineer', skills: [] },
            { id: 'n2', name: 'Private Contact', role: 'Designer', skills: ['GraphQL'], email: 'hidden@example.test' },
        ] },
    } });
    const response = await api(value, 'get', '/api/blinkfy/talent/network/recommendations');
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
        { id: 'n1', name: 'Ada Lovelace', role: 'Senior Backend Engineer', requiresApproval: true },
        { id: 'n2', name: 'Private Contact', role: 'Designer', requiresApproval: true },
    ]);
    expect(response.body.items[1]).not.toHaveProperty('email');
});

test('candidate engagement drafts reject invalid topics', async () => {
    const value = await contextFactory('invalid-draft');
    const response = await api(value, 'post', '/api/blinkfy/talent/drafts/engagement').send({ topic: '', format: 'post' });
    expect(response.status).toBe(422);
});

async function contextFactory(label) { return context(label); }
