const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../../src/app');
const { disconnectPrisma } = require('../../src/lib/prisma');

const prisma = new PrismaClient();
const app = createApp({ prisma });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function bearerToken(user) {
    return `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'development_secret')}`;
}

async function createContext(label = 'candidate') {
    const recruiter = await prisma.user.create({
        data: {
            email: `${label}-${runId}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: 'Candidate Recruiter',
            userType: 'recruiter',
        },
    });
    const workspace = await prisma.workspace.create({ data: { name: `${label} workspace ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `${label} client ${runId}` } });
    await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
    });
    return { recruiter, workspace, client };
}

function importCandidates(context, csv) {
    return request(app)
        .post(`/api/blinkfy/clients/${context.client.id}/candidates/import`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ csv, filename: 'consented-candidates.csv' });
}

function candidateCsv(row) {
    return `fullName,email,linkedinUrl,currentTitle,location,skills,source\n${row}`;
}

function shareCandidate(context, candidateId, body) {
    return request(app)
        .post(`/api/blinkfy/candidates/${candidateId}/share`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send(body);
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('blocks cross-client sharing without active client_presentation consent', async () => {
    const context = await createContext();
    const otherClient = await prisma.client.create({
        data: { workspaceId: context.workspace.id, name: `Other client ${runId}` },
    });
    const imported = await importCandidates(context, candidateCsv('Sam,sam@example.com,https://linkedin.com/in/sam,Account Executive,Remote,enterprise sales,ats_export'));

    expect(imported.status).toBe(201);
    const response = await shareCandidate(context, imported.body.candidates[0].id, { clientId: otherClient.id });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/consent/i);
});

test('records explicit client presentation consent and permits only the consented client share', async () => {
    const context = await createContext('consent');
    const otherClient = await prisma.client.create({
        data: { workspaceId: context.workspace.id, name: `Other consent client ${runId}` },
    });
    const imported = await importCandidates(context, candidateCsv('Sam,sam@example.com,https://linkedin.com/in/sam,Account Executive,Remote,enterprise sales,ats_export'));
    const candidateId = imported.body.candidates[0].id;

    const consent = await request(app)
        .post(`/api/blinkfy/candidates/${candidateId}/consents`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ purpose: 'client_presentation', clientId: otherClient.id, evidence: 'Candidate accepted presentation by email on 2026-08-08.' });

    expect(consent.status).toBe(201);
    expect(consent.body).toMatchObject({ purpose: 'client_presentation', clientId: otherClient.id });

    const allowed = await shareCandidate(context, candidateId, { clientId: otherClient.id });
    expect(allowed.status).toBe(201);
    expect(allowed.body).toMatchObject({ candidateId, clientId: otherClient.id, stage: 'mapped' });

    const blocked = await shareCandidate(context, candidateId, { clientId: context.client.id });
    expect(blocked.status).toBe(409);

    const auditActions = await prisma.auditEvent.findMany({
        where: { workspaceId: context.workspace.id, entityId: candidateId },
        select: { action: true },
    });
    expect(auditActions.map(({ action }) => action)).toEqual(expect.arrayContaining([
        'candidate.consent_recorded',
        'candidate.shared',
    ]));
});

test('prevents future sharing after consent is revoked while retaining the consent audit history', async () => {
    const context = await createContext('revocation');
    const imported = await importCandidates(context, candidateCsv('Sam,sam@example.com,https://linkedin.com/in/sam,Account Executive,Remote,enterprise sales,ats_export'));
    const candidateId = imported.body.candidates[0].id;
    const consent = await request(app)
        .post(`/api/blinkfy/candidates/${candidateId}/consents`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ purpose: 'client_presentation', clientId: context.client.id, evidence: 'Signed candidate authorization.' });

    expect(consent.status).toBe(201);
    const revoked = await request(app)
        .post(`/api/blinkfy/candidates/${candidateId}/consents`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ purpose: 'client_presentation', clientId: context.client.id, evidence: 'Candidate revoked authorization.', revoke: true });

    expect(revoked.status).toBe(200);
    const response = await shareCandidate(context, candidateId, { clientId: context.client.id });
    expect(response.status).toBe(409);

    const events = await prisma.auditEvent.findMany({
        where: { workspaceId: context.workspace.id, entityId: candidateId },
        select: { action: true },
    });
    expect(events.map(({ action }) => action)).toEqual(expect.arrayContaining([
        'candidate.consent_recorded',
        'candidate.consent_revoked',
    ]));
});
