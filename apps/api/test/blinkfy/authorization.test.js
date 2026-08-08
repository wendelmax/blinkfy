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
            email: `${label}-${runId}@example.test`,
            fullName: label,
            userType: 'recruiter',
        },
    });
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('returns jobs for a recruiter who belongs to the client workspace', async () => {
    const recruiter = await createUser('authorized recruiter');
    const workspace = await prisma.workspace.create({ data: { name: `Workspace ${runId}` } });
    const client = await prisma.client.create({
        data: { workspaceId: workspace.id, name: `Client ${runId}` },
    });
    await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
    });

    const response = await request(app)
        .get(`/api/blinkfy/clients/${client.id}/jobs`)
        .set('Authorization', bearerToken(recruiter))
        .set('x-workspace-id', workspace.id);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [] });
});

test('rejects a recruiter accessing a client in another workspace', async () => {
    const recruiter = await createUser('workspace member');
    const workspaceA = await prisma.workspace.create({ data: { name: `Workspace A ${runId}` } });
    const workspaceB = await prisma.workspace.create({ data: { name: `Workspace B ${runId}` } });
    const foreignClient = await prisma.client.create({
        data: { workspaceId: workspaceB.id, name: `Foreign Client ${runId}` },
    });
    await prisma.workspaceMembership.create({
        data: { workspaceId: workspaceA.id, userId: recruiter.id, role: 'recruiter' },
    });

    const response = await request(app)
        .get(`/api/blinkfy/clients/${foreignClient.id}/jobs`)
        .set('Authorization', bearerToken(recruiter))
        .set('x-workspace-id', workspaceA.id);

    expect(response.status).toBe(404);
});

test('rejects a user without membership in the requested workspace', async () => {
    const user = await createUser('non member');
    const workspace = await prisma.workspace.create({ data: { name: `Restricted ${runId}` } });
    const client = await prisma.client.create({
        data: { workspaceId: workspace.id, name: `Restricted Client ${runId}` },
    });

    const response = await request(app)
        .get(`/api/blinkfy/clients/${client.id}/jobs`)
        .set('Authorization', bearerToken(user))
        .set('x-workspace-id', workspace.id);

    expect(response.status).toBe(403);
});

test('requires a workspace header', async () => {
    const user = await createUser('header missing');
    const workspace = await prisma.workspace.create({ data: { name: `Header ${runId}` } });
    const client = await prisma.client.create({
        data: { workspaceId: workspace.id, name: `Header Client ${runId}` },
    });
    await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: user.id, role: 'viewer' },
    });

    const response = await request(app)
        .get(`/api/blinkfy/clients/${client.id}/jobs`)
        .set('Authorization', bearerToken(user));

    expect(response.status).toBe(400);
});
