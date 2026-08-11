const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../../src/app');

const prisma = new PrismaClient();
const app = createApp({ prisma });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function bearer(user) {
    return `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'development_secret')}`;
}

function api(user, workspace, method, path) {
    return request(app)[method](path)
        .set('Authorization', bearer(user))
        .set('x-workspace-id', workspace.id);
}

async function createFlowContext() {
    const workspace = await prisma.workspace.create({ data: { name: `Talent E2E ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Acme ${runId}` } });
    const candidateUser = await prisma.user.create({
        data: { email: `candidate-${runId}@example.test`, fullName: 'Candidate E2E', userType: 'candidate' },
    });
    const recruiter = await prisma.user.create({
        data: { email: `recruiter-${runId}@example.test`, fullName: 'Recruiter E2E', userType: 'recruiter' },
    });
    await prisma.workspaceMembership.createMany({
        data: [
            { workspaceId: workspace.id, userId: candidateUser.id, role: 'viewer' },
            { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
        ],
    });
    const candidate = await prisma.candidate.create({
        data: { workspaceId: workspace.id, userId: candidateUser.id, fullName: candidateUser.fullName, profile: {} },
    });
    return { workspace, client, candidateUser, recruiter, candidate };
}

afterAll(async () => prisma.$disconnect());

test('candidate controls visibility and consent before recruiter presentation', async () => {
    const context = await createFlowContext();

    const privateProfile = await api(context.candidateUser, context.workspace, 'get', '/api/blinkfy/talent/profile');
    expect(privateProfile.status).toBe(200);
    expect(privateProfile.body.visibility).toBe('private');

    // Visibility alone is not consent to present to a specific client.
    const privateShare = await api(context.recruiter, context.workspace, 'post', `/api/blinkfy/candidates/${context.candidate.id}/share`)
        .send({ clientId: context.client.id });
    expect(privateShare.status).toBe(409);

    const available = await api(context.candidateUser, context.workspace, 'patch', '/api/blinkfy/talent/visibility')
        .send({ visibility: 'available' });
    expect(available.status).toBe(200);

    const withoutConsent = await api(context.recruiter, context.workspace, 'post', `/api/blinkfy/candidates/${context.candidate.id}/share`)
        .send({ clientId: context.client.id });
    expect(withoutConsent.status).toBe(409);

    const consent = await api(context.recruiter, context.workspace, 'post', `/api/blinkfy/candidates/${context.candidate.id}/consents`)
        .send({
            purpose: 'client_presentation',
            clientId: context.client.id,
            evidence: 'Candidate explicitly opted in during the application flow.',
        });
    expect(consent.status).toBe(201);

    const presented = await api(context.recruiter, context.workspace, 'post', `/api/blinkfy/candidates/${context.candidate.id}/share`)
        .send({ clientId: context.client.id });
    expect(presented.status).toBe(201);

    const revoked = await api(context.candidateUser, context.workspace, 'post', `/api/blinkfy/talent/consents/${consent.body.id}/revoke`);
    expect(revoked.status).toBe(200);

    const blockedAfterRevoke = await api(context.recruiter, context.workspace, 'post', `/api/blinkfy/candidates/${context.candidate.id}/share`)
        .send({ clientId: context.client.id });
    expect(blockedAfterRevoke.status).toBe(409);

    const audit = await prisma.auditEvent.findMany({
        where: { workspaceId: context.workspace.id, entityId: { in: [context.candidate.id, consent.body.id] } },
        select: { action: true },
    });
    expect(audit.map((event) => event.action)).toEqual(expect.arrayContaining([
        'candidate.visibility_changed',
        'candidate.consent_recorded',
        'candidate.shared',
        'candidate.consent_revoked',
    ]));
});
