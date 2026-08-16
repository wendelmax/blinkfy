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

async function createUser(label) {
    return prisma.user.create({
        data: {
            email: `marketplace-placement-${runId}-${label}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: `Marketplace ${label}`,
            userType: 'recruiter',
        },
    });
}

async function createContext({ actorRole = 'owner', stage = 'shortlisted' } = {}) {
    const actor = await createUser('actor');
    const recruiter = await createUser('recruiter');
    const workspace = await prisma.workspace.create({ data: { name: `Marketplace ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Client ${runId}` } });
    const job = await prisma.blinkfyJob.create({
        data: {
            clientId: client.id,
            title: 'Marketplace Account Executive',
            requirements: ['enterprise sales'],
        },
    });
    const candidate = await prisma.candidate.create({
        data: {
            workspaceId: workspace.id,
            fullName: 'Marketplace Candidate',
            normalizedEmail: `marketplace-candidate-${runId}-${Math.random().toString(16).slice(2)}@example.test`,
            profile: {},
        },
    });
    const application = await prisma.candidateApplication.create({
        data: { candidateId: candidate.id, clientId: client.id, jobId: job.id, stage },
    });
    await prisma.workspaceMembership.createMany({
        data: [
            { workspaceId: workspace.id, userId: actor.id, role: actorRole },
            { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
        ],
    });
    return { actor, recruiter, workspace, client, job, candidate, application };
}

function confirmPlacement(context, applicationId = context.application.id, recruiterUserId = context.recruiter.id) {
    return request(app)
        .post(`/api/blinkfy/clients/${context.client.id}/placements`)
        .set('Authorization', bearerToken(context.actor))
        .set('x-workspace-id', context.workspace.id)
        .send({ applicationId, recruiterUserId });
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test.each(['owner', 'admin'])('allows a %s to confirm a shortlisted placement atomically', async (actorRole) => {
    const context = await createContext({ actorRole });

    const response = await confirmPlacement(context);

    expect(response.status).toBe(201);
    expect(response.body.placement).toEqual(expect.objectContaining({
        applicationId: context.application.id,
        recruiterUserId: context.recruiter.id,
        status: 'confirmed',
        createdAt: expect.any(String),
    }));
    const [application, placement, audit] = await Promise.all([
        prisma.candidateApplication.findUniqueOrThrow({ where: { id: context.application.id } }),
        prisma.marketplacePlacement.findUniqueOrThrow({ where: { applicationId: context.application.id } }),
        prisma.auditEvent.findFirst({
            where: { workspaceId: context.workspace.id, action: 'marketplace.placement_confirmed' },
            orderBy: { createdAt: 'desc' },
        }),
    ]);
    expect(application).toMatchObject({ stage: 'hired', hiredAt: expect.any(Date) });
    expect(placement).toMatchObject({
        id: response.body.placement.id,
        workspaceId: context.workspace.id,
        clientId: context.client.id,
        recruiterUserId: context.recruiter.id,
    });
    expect(audit).toMatchObject({
        clientId: context.client.id,
        actorUserId: context.actor.id,
        entityType: 'marketplace_placement',
        entityId: placement.id,
        action: 'marketplace.placement_confirmed',
        metadata: { applicationId: context.application.id, recruiterUserId: context.recruiter.id },
    });

    const pipeline = await request(app)
        .get(`/api/blinkfy/jobs/${context.application.jobId}/applications`)
        .set('Authorization', bearerToken(context.actor))
        .set('x-workspace-id', context.workspace.id);
    expect(pipeline.status).toBe(200);
    expect(pipeline.body.items).toEqual([expect.objectContaining({
        id: context.application.id,
        stage: 'hired',
        hiredAt: expect.any(String),
    })]);
});

test('rejects a recruiter who attempts to confirm a placement', async () => {
    const context = await createContext({ actorRole: 'recruiter' });

    const response = await confirmPlacement(context);

    expect(response.status).toBe(403);
    await expect(prisma.marketplacePlacement.count({ where: { applicationId: context.application.id } })).resolves.toBe(0);
});

test('does not expose an application outside the active client or workspace', async () => {
    const context = await createContext();
    const other = await createContext();

    const wrongClient = await confirmPlacement(context, other.application.id);
    expect(wrongClient.status).toBe(404);

    const wrongWorkspace = await request(app)
        .post(`/api/blinkfy/clients/${other.client.id}/placements`)
        .set('Authorization', bearerToken(context.actor))
        .set('x-workspace-id', context.workspace.id)
        .send({ applicationId: other.application.id, recruiterUserId: other.recruiter.id });
    expect(wrongWorkspace.status).toBe(404);
});

test('requires the application to be shortlisted and the recruiter to be an eligible workspace member', async () => {
    const context = await createContext({ stage: 'screened' });

    const notShortlisted = await confirmPlacement(context);
    expect(notShortlisted.status).toBe(422);

    const shortlisted = await createContext();
    const viewer = await createUser('viewer');
    await prisma.workspaceMembership.create({ data: { workspaceId: shortlisted.workspace.id, userId: viewer.id, role: 'viewer' } });
    const invalidRecruiter = await confirmPlacement(shortlisted, shortlisted.application.id, viewer.id);
    expect(invalidRecruiter.status).toBe(422);
});

test('returns conflict on a repeated application without duplicating the placement', async () => {
    const context = await createContext();

    expect((await confirmPlacement(context)).status).toBe(201);
    const repeated = await confirmPlacement(context);

    expect(repeated.status).toBe(409);
    await expect(prisma.marketplacePlacement.count({ where: { applicationId: context.application.id } })).resolves.toBe(1);
});
