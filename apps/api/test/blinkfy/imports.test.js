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
        data: {
            email: `imports-${runId}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: 'Import Recruiter',
            userType: 'recruiter',
        },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Imports ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Import client ${runId}` } });
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
        .send({ csv, filename: 'permitted-source.csv' });
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('deduplicates the same normalized email inside a workspace', async () => {
    const context = await createContext();
    const header = 'fullName,email,linkedinUrl,currentTitle,location,skills,source';
    const first = await importCandidates(context, `${header}\nSam,sam@example.com,https://linkedin.com/in/sam,Account Executive,Remote,enterprise sales,ats_export`);
    const response = await importCandidates(context, `${header}\nSamuel,SAM@example.com,https://linkedin.com/in/sam,Account Executive,Remote,enterprise sales,ats_export`);

    expect(first.status).toBe(201);
    expect(response.status).toBe(201);
    expect(response.body.created).toBe(0);
    expect(response.body.duplicates).toHaveLength(1);

    const events = await prisma.auditEvent.findMany({
        where: { workspaceId: context.workspace.id, action: 'candidate.duplicate_detected' },
    });
    expect(events).toHaveLength(1);
});

test('returns an idempotent duplicate result when identical imports arrive concurrently', async () => {
    const context = await createContext();
    const csv = [
        'fullName,email,linkedinUrl,currentTitle,location,skills,source',
        'Concurrent Sam,concurrent@example.com,https://linkedin.com/in/concurrent-sam,Account Executive,Remote,enterprise sales,ats_export',
    ].join('\n');

    const [first, second] = await Promise.all([
        importCandidates(context, csv),
        importCandidates(context, csv),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 201]);
    expect([first.body.created, second.body.created].sort()).toEqual([0, 1]);
    expect([first.body.duplicates.length, second.body.duplicates.length].sort()).toEqual([0, 1]);
    expect(await prisma.candidate.count({ where: { workspaceId: context.workspace.id } })).toBe(1);
});

test('rejects invalid rows without creating candidates and stores non-sensitive row errors', async () => {
    const context = await createContext();
    const response = await importCandidates(context, [
        'fullName,email,linkedinUrl,currentTitle,location,skills,source',
        ',invalid-email,https://linkedin.com/in/sam,Account Executive,Remote,enterprise sales,ats_export',
        'Valid,valid@example.com,https://linkedin.com/in/valid,Account Executive,Remote,enterprise sales,ats_export',
    ].join('\n'));

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ created: 1 });
    expect(response.body.invalidRows).toEqual(expect.arrayContaining([
        expect.objectContaining({ row: 2, field: expect.any(String), message: expect.any(String) }),
    ]));

    const candidateImport = await prisma.candidateImport.findFirst({
        where: { workspaceId: context.workspace.id },
        orderBy: { createdAt: 'desc' },
    });
    expect(candidateImport.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ row: 2, field: expect.any(String) }),
    ]));
    expect(JSON.stringify(candidateImport.errors)).not.toContain('invalid-email');
});
