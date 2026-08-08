const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../../src/app');
const { disconnectPrisma } = require('../../src/lib/prisma');

const prisma = new PrismaClient();
const app = createApp({ prisma });
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function tokenFor(user) {
    return `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'development_secret')}`;
}

function api(context, method, path) {
    return request(app)[method](path)
        .set('Authorization', tokenFor(context.user))
        .set('x-workspace-id', context.workspace.id);
}

async function createAgencyFixture() {
    const user = await prisma.user.create({
        data: {
            email: `hire-core-${runId}@example.test`,
            fullName: 'Pilot Recruiter',
            userType: 'recruiter',
        },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Pilot agency ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Pilot client ${runId}` } });
    await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: user.id, role: 'recruiter' },
    });
    return { user, workspace, client };
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('agency turns an imported, consented candidate into a reviewed shortlist entry', async () => {
    const context = await createAgencyFixture();

    const jobResponse = await api(context, 'post', `/api/blinkfy/clients/${context.client.id}/jobs`)
        .send({
            title: 'Account Executive',
            description: 'Own enterprise revenue in Brazil.',
            location: 'Brazil',
            workModel: 'hybrid',
            requirements: ['Enterprise sales', 'SaaS'],
            weights: { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 },
        });
    expect(jobResponse.status).toBe(201);
    const jobId = jobResponse.body.id;

    const imported = await api(context, 'post', `/api/blinkfy/clients/${context.client.id}/candidates/import`)
        .send({
            filename: 'pilot-candidates.csv',
            csv: 'fullName,email,linkedinUrl,currentTitle,location,skills,source\n'
                + 'Ana Sales,ana@example.test,https://www.linkedin.com/in/ana-sales,Account Executive,Brazil,enterprise sales|SaaS,referral',
        });
    expect(imported.status).toBe(201);
    expect(imported.body.created).toBe(1);
    const candidateId = imported.body.candidates[0].id;

    const withoutConsent = await api(context, 'post', `/api/blinkfy/candidates/${candidateId}/share`)
        .send({ clientId: context.client.id, jobId });
    expect(withoutConsent.status).toBe(409);

    const consent = await api(context, 'post', `/api/blinkfy/candidates/${candidateId}/consents`)
        .send({
            purpose: 'client_presentation',
            clientId: context.client.id,
            evidence: 'Candidate explicitly approved presentation to the pilot client.',
        });
    expect(consent.status).toBe(201);

    const shared = await api(context, 'post', `/api/blinkfy/candidates/${candidateId}/share`)
        .send({ clientId: context.client.id, jobId });
    expect(shared.status).toBe(201);

    const applicationId = shared.body.id;
    const recomputed = await api(context, 'post', `/api/blinkfy/jobs/${jobId}/applications/${applicationId}/recompute-score`)
        .send();
    expect(recomputed.status).toBe(200);
    expect(recomputed.body.score).toEqual(expect.objectContaining({ score: expect.any(Number), factors: expect.any(Array) }));

    for (const stage of ['reviewed', 'interested', 'screened', 'shortlisted']) {
        const moved = await api(context, 'patch', `/api/blinkfy/jobs/${jobId}/applications/${applicationId}/stage`)
            .send({ stage });
        expect(moved.status).toBe(200);
        expect(moved.body.application.stage).toBe(stage);
    }

    const pipeline = await api(context, 'get', `/api/blinkfy/jobs/${jobId}/applications`);
    expect(pipeline.status).toBe(200);
    expect(pipeline.body.items).toEqual([expect.objectContaining({
        id: applicationId,
        fullName: 'Ana Sales',
        consentRecorded: true,
        stage: 'shortlisted',
    })]);

    const audit = await prisma.auditEvent.findMany({
        where: { workspaceId: context.workspace.id },
        select: { action: true },
    });
    expect(audit.map((event) => event.action)).toEqual(expect.arrayContaining([
        'candidate.imported',
        'candidate.consent_recorded',
        'candidate.shared',
        'application.score_recomputed',
        'application.stage_changed',
    ]));

    const analytics = await api(context, 'get', `/api/blinkfy/clients/${context.client.id}/analytics`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.applications.total).toBe(1);
    expect(analytics.body.applications.byStage.shortlisted).toBe(1);
    expect(analytics.body.consent).toEqual({ active: 1, revoked: 0, missing: 0 });
    expect(analytics.body.score.count).toBe(1);

    const otherClient = await prisma.client.create({
        data: { workspaceId: context.workspace.id, name: `Other client ${runId}` },
    });
    const otherClientAnalytics = await api(context, 'get', `/api/blinkfy/clients/${otherClient.id}/analytics`);
    expect(otherClientAnalytics.status).toBe(200);
    expect(otherClientAnalytics.body.applications.total).toBe(0);
    expect(otherClientAnalytics.body.applications.byStage.shortlisted).toBe(0);
});
