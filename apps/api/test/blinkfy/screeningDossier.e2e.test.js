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
        .set('Authorization', tokenFor(context.recruiter))
        .set('x-workspace-id', context.workspace.id);
}

async function createContext(label) {
    const recruiter = await prisma.user.create({
        data: { email: `screening-${label}-${runId}@example.test`, fullName: 'Screening Recruiter', userType: 'recruiter' },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Screening ${label} ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Screening Client ${label} ${runId}` } });
    await prisma.workspaceMembership.create({ data: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' } });
    const job = await prisma.blinkfyJob.create({
        data: {
            clientId: client.id,
            title: 'Senior Account Executive',
            requirements: ['enterprise sales'],
            scorecard: { create: { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 } },
        },
    });
    const candidate = await prisma.candidate.create({
        data: {
            workspaceId: workspace.id,
            fullName: `Candidate ${label}`,
            normalizedEmail: `candidate-${label}-${runId}@example.test`,
            profile: { currentTitle: 'Account Executive', skills: ['enterprise sales'] },
        },
    });
    const application = await prisma.candidateApplication.create({
        data: { candidateId: candidate.id, clientId: client.id, jobId: job.id },
    });
    return { recruiter, workspace, client, job, candidate, application };
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('runs consent to evidence to dossier review with protected evidence access', async () => {
    const context = await createContext('happy');
    const base = `/api/blinkfy/jobs/${context.job.id}/applications/${context.application.id}`;

    const invited = await api(context, 'post', `${base}/screening/invite`);
    expect(invited.status).toBe(201);
    expect(invited.body.session).toMatchObject({ status: 'invited', applicationId: context.application.id });

    const beforeConsentDossier = await api(context, 'get', `${base}/screening/dossier`);
    expect(beforeConsentDossier.status).toBe(403);

    const beforeConsentEvidence = await api(context, 'post', `${base}/screening/evidence`)
        .send({ kind: 'transcript', content: 'Candidate transcript.' });
    expect(beforeConsentEvidence.status).toBe(403);

    const consented = await api(context, 'post', `${base}/screening/consent`)
        .send({ consentVersion: 'screen-v2' });
    expect(consented.status).toBe(200);
    expect(consented.body.session).toMatchObject({ status: 'consented', consentVersion: 'screen-v2' });

    const transcript = await api(context, 'post', `${base}/screening/evidence`)
        .send({ kind: 'transcript', content: 'Candidate explained enterprise quota ownership.', confidence: 92 });
    expect(transcript.status).toBe(201);
    expect(transcript.body.evidence).toMatchObject({ kind: 'transcript', content: 'Candidate explained enterprise quota ownership.', confidence: 92 });

    const recording = await api(context, 'post', `${base}/screening/evidence`)
        .send({ kind: 'recording', uri: 'https://storage.example.test/screening/happy.mp3' });
    expect(recording.status).toBe(201);

    const insight = await api(context, 'post', `${base}/screening/evidence`)
        .send({ kind: 'insight', content: 'Strong communication; validate salary alignment.', confidence: 80 });
    expect(insight.status).toBe(201);

    const dossier = await api(context, 'get', `${base}/screening/dossier`);
    expect(dossier.status).toBe(200);
    expect(dossier.body.application).toMatchObject({ id: context.application.id, candidateId: context.candidate.id });
    expect(dossier.body.session).toMatchObject({ status: 'consented', consentVersion: 'screen-v2' });
    expect(dossier.body.evidences).toHaveLength(3);
    expect(dossier.body.evidences.map((item) => item.kind)).toEqual(['transcript', 'recording', 'insight']);

    const audit = await prisma.auditEvent.findMany({
        where: { workspaceId: context.workspace.id, action: { in: ['screening.invited', 'screening.consent', 'screening.evidence_added'] } },
        select: { action: true, metadata: true },
    });
    expect(audit.map((event) => event.action)).toEqual(expect.arrayContaining([
        'screening.invited', 'screening.consent', 'screening.evidence_added',
    ]));
    expect(JSON.stringify(audit)).not.toContain('Candidate explained enterprise quota ownership');
});

test('does not expose a screening dossier across workspaces', async () => {
    const owner = await createContext('owner');
    const outsider = await createContext('outsider');
    const base = `/api/blinkfy/jobs/${owner.job.id}/applications/${owner.application.id}`;

    await api(owner, 'post', `${base}/screening/invite`);
    await api(owner, 'post', `${base}/screening/consent`).send({ consentVersion: 'screen-v1' });
    await api(owner, 'post', `${base}/screening/evidence`).send({ kind: 'insight', content: 'Private review note.' });

    const dossier = await api(outsider, 'get', `${base}/screening/dossier`);
    expect(dossier.status).toBe(404);
    expect(JSON.stringify(dossier.body)).not.toContain('Private review note.');
});

test('rejects malformed screening evidence without creating a record', async () => {
    const context = await createContext('validation');
    const base = `/api/blinkfy/jobs/${context.job.id}/applications/${context.application.id}`;
    await api(context, 'post', `${base}/screening/invite`);
    await api(context, 'post', `${base}/screening/consent`);

    const response = await api(context, 'post', `${base}/screening/evidence`)
        .send({ kind: 'transcript', content: ' ', confidence: 101 });
    expect(response.status).toBe(422);
    expect(await prisma.screeningEvidence.count({ where: { session: { applicationId: context.application.id } } })).toBe(0);
});
