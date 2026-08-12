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

async function createContext() {
    const recruiter = await prisma.user.create({
        data: { email: `pipeline-${runId}-${Math.random().toString(16).slice(2)}@example.test`, fullName: 'Pipeline Recruiter', userType: 'recruiter' },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Pipeline ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Client ${runId}` } });
    await prisma.workspaceMembership.create({ data: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' } });
    const job = await prisma.blinkfyJob.create({
        data: {
            clientId: client.id, title: 'Account Executive', requirements: ['enterprise sales'],
            scorecard: { create: { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 } },
        },
    });
    const candidate = await prisma.candidate.create({
        data: {
            workspaceId: workspace.id, fullName: 'Sam Candidate', normalizedEmail: `sam-${runId}-${Math.random().toString(16).slice(2)}@example.test`,
            profile: { currentTitle: 'Account Executive', skills: ['enterprise sales'] },
        },
    });
    const application = await prisma.candidateApplication.create({
        data: { candidateId: candidate.id, clientId: client.id, jobId: job.id },
    });
    return { recruiter, workspace, client, job, candidate, application };
}

function pipelineRequest(context, applicationId) {
    return request(app)
        .patch(`/api/blinkfy/jobs/${context.job.id}/applications/${applicationId}/stage`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id);
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('cannot move a mapped candidate directly to shortlisted', async () => {
    const context = await createContext();

    const response = await pipelineRequest(context, context.application.id).send({ stage: 'shortlisted' });

    expect(response.status).toBe(422);
});

test('lists only authorized job applications with candidate details and client-presentation consent state', async () => {
    const context = await createContext();
    await prisma.candidateConsent.create({
        data: {
            candidateId: context.candidate.id,
            workspaceId: context.workspace.id,
            clientId: context.client.id,
            purpose: 'client_presentation',
            evidence: 'Candidate approved presentation to this client.',
        },
    });

    const response = await request(app)
        .get(`/api/blinkfy/jobs/${context.job.id}/applications`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([expect.objectContaining({
        id: context.application.id,
        candidateId: context.candidate.id,
        fullName: 'Sam Candidate',
        currentTitle: 'Account Executive',
        consentRecorded: true,
        stage: 'mapped',
    })]);
});

test('supports the reviewed import-to-consent-to-job-pipeline workflow without automatic sharing', async () => {
    const context = await createContext();

    const missingEvidence = await request(app)
        .post(`/api/blinkfy/candidates/${context.candidate.id}/consents`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ purpose: 'client_presentation', clientId: context.client.id, evidence: '' });
    expect(missingEvidence.status).toBe(422);

    const consent = await request(app)
        .post(`/api/blinkfy/candidates/${context.candidate.id}/consents`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ purpose: 'client_presentation', clientId: context.client.id, evidence: 'Candidate confirmed presentation for this job.' });
    expect(consent.status).toBe(201);

    const share = await request(app)
        .post(`/api/blinkfy/candidates/${context.candidate.id}/share`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ clientId: context.client.id, jobId: context.job.id });
    expect(share.status).toBe(201);

    const pipeline = await request(app)
        .get(`/api/blinkfy/jobs/${context.job.id}/applications`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id);
    expect(pipeline.status).toBe(200);
    expect(pipeline.body.items).toEqual([expect.objectContaining({ candidateId: context.candidate.id, consentRecorded: true })]);
});

test('does not expose a job pipeline outside the active workspace', async () => {
    const owner = await createContext();
    const outsider = await createContext();

    const response = await request(app)
        .get(`/api/blinkfy/jobs/${owner.job.id}/applications`)
        .set('Authorization', bearerToken(outsider.recruiter))
        .set('x-workspace-id', outsider.workspace.id);

    expect(response.status).toBe(404);
});

test('stores a reviewer reason when a score is overridden', async () => {
    const context = await createContext();

    const response = await request(app)
        .patch(`/api/blinkfy/jobs/${context.job.id}/applications/${context.application.id}/override-score`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ score: 91, reason: 'Verified enterprise quota ownership in recruiter call' });

    expect(response.status).toBe(200);
    expect(response.body.score.overrideReason).toContain('quota ownership');
});

test('returns and audits the fit score policy version when recomputing', async () => {
    const context = await createContext();
    const response = await request(app)
        .post(`/api/blinkfy/jobs/${context.job.id}/applications/${context.application.id}/recompute-score`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id);

    expect(response.status).toBe(200);
    expect(response.body.score.policyVersion).toBe('fit-score-v1');
    const audit = await prisma.auditEvent.findFirst({
        where: { workspaceId: context.workspace.id, action: 'application.score_recomputed', entityId: context.application.id },
        orderBy: { createdAt: 'desc' },
    });
    expect(audit.metadata).toEqual(expect.objectContaining({ policyVersion: 'fit-score-v1' }));
});

test('requires a human reviewer reason before moving an application to rejected', async () => {
    const context = await createContext();

    const response = await pipelineRequest(context, context.application.id).send({ stage: 'rejected' });

    expect(response.status).toBe(422);
});

test('creates a job-scoped application only after presentation consent for the job client', async () => {
    const context = await createContext();
    await prisma.candidateConsent.create({
        data: {
            candidateId: context.candidate.id,
            workspaceId: context.workspace.id,
            clientId: context.client.id,
            purpose: 'client_presentation',
            evidence: 'Candidate approved this client presentation.',
        },
    });

    const response = await request(app)
        .post(`/api/blinkfy/candidates/${context.candidate.id}/share`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({ clientId: context.client.id, jobId: context.job.id });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ candidateId: context.candidate.id, clientId: context.client.id, jobId: context.job.id, stage: 'mapped' });
});
