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

const validWeights = {
    skills: 35,
    experience: 25,
    context: 15,
    preferences: 15,
    signals: 10,
};

async function createContext() {
    const recruiter = await prisma.user.create({
        data: {
            email: `jobs-${runId}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: 'Job Recruiter',
            userType: 'recruiter',
        },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Jobs ${runId}` } });
    const client = await prisma.client.create({
        data: { workspaceId: workspace.id, name: `Client ${runId}` },
    });
    await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
    });

    return { recruiter, workspace, client };
}

function createJob(context, overrides = {}) {
    return request(app)
        .post(`/api/blinkfy/clients/${context.client.id}/jobs`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({
            title: ' Senior Account Executive ',
            description: 'Own enterprise revenue in Brazil.',
            location: 'São Paulo, Brazil',
            workModel: 'hybrid',
            salaryMin: 120000,
            salaryMax: 180000,
            requirements: ['Enterprise sales', 'CRM fluency'],
            weights: validWeights,
            ...overrides,
        });
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('creates a client-scoped job only when scorecard weights sum to 100', async () => {
    const context = await createContext();

    const response = await createJob(context);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
        title: 'Senior Account Executive',
        clientId: context.client.id,
        requirements: ['Enterprise sales', 'CRM fluency'],
        scorecard: { weights: { skills: 35, experience: 25, context: 15, preferences: 15, signals: 10 } },
    });

    const invalidWeights = await createJob(context, {
        weights: { skills: 50, experience: 50, context: 50, preferences: 0, signals: 0 },
    });

    expect(invalidWeights.status).toBe(422);
    expect(invalidWeights.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: 'weights' }),
    ]));
});

test('records manual job creation and scorecard configuration in the workspace audit trail', async () => {
    const context = await createContext();
    const response = await createJob(context);

    const events = await prisma.auditEvent.findMany({
        where: { entityId: response.body.id },
        orderBy: { createdAt: 'asc' },
    });

    expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
            workspaceId: context.workspace.id,
            clientId: context.client.id,
            actorUserId: context.recruiter.id,
            action: 'job.created',
            metadata: { source: 'manual' },
        }),
        expect.objectContaining({ action: 'job.scorecard_configured' }),
    ]));
});

test('imports one normalized CSV job with the default scorecard and lists only that client jobs', async () => {
    const context = await createContext();
    const foreignContext = await createContext();
    const imported = await request(app)
        .post(`/api/blinkfy/clients/${context.client.id}/jobs/import`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({
            csv: 'title,description,location,workModel,salaryMin,salaryMax,requirements\n"Sales Engineer","Own technical discovery","Remote",remote,100000,140000,"API design|Discovery"\n',
        });

    expect(imported.status).toBe(201);
    expect(imported.body.job).toMatchObject({
        title: 'Sales Engineer',
        requirements: ['API design', 'Discovery'],
        scorecard: { weights: validWeights },
    });
    expect(imported.body.import).toMatchObject({ status: 'completed', rowNumber: 2 });

    await createJob(foreignContext);
    const list = await request(app)
        .get(`/api/blinkfy/clients/${context.client.id}/jobs`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id);

    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ id: imported.body.job.id, clientId: context.client.id });
});

test('rejects an invalid CSV row without creating a job and records the failed import', async () => {
    const context = await createContext();
    const response = await request(app)
        .post(`/api/blinkfy/clients/${context.client.id}/jobs/import`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id)
        .send({
            csv: 'title,description,location,workModel,salaryMin,salaryMax,requirements\n"","Missing title","Remote",remote,140000,100000,""',
        });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ rowNumber: 2 });
    expect(response.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: expect.any(String) }),
    ]));

    const jobs = await request(app)
        .get(`/api/blinkfy/clients/${context.client.id}/jobs`)
        .set('Authorization', bearerToken(context.recruiter))
        .set('x-workspace-id', context.workspace.id);
    const failedImport = await prisma.jobImport.findFirst({
        where: { clientId: context.client.id },
        orderBy: { createdAt: 'desc' },
    });

    expect(jobs.body.items).toEqual([]);
    expect(failedImport).toMatchObject({ status: 'failed', rowNumber: 2 });
});
