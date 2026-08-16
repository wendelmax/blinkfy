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
            email: `revenue-sharing-${runId}-${label}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: `Revenue Sharing ${label}`,
            userType: 'recruiter',
        },
    });
}

async function createContext({ actorRole = 'owner' } = {}) {
    const actor = await createUser('actor');
    const recruiter = await createUser('recruiter');
    const workspace = await prisma.workspace.create({ data: { name: `Revenue Sharing ${runId}` } });
    const client = await prisma.client.create({ data: { workspaceId: workspace.id, name: `Client ${runId}` } });
    const candidate = await prisma.candidate.create({
        data: {
            workspaceId: workspace.id,
            fullName: 'Revenue Sharing Candidate',
            normalizedEmail: `revenue-sharing-candidate-${runId}-${Math.random().toString(16).slice(2)}@example.test`,
            profile: {},
        },
    });
    const application = await prisma.candidateApplication.create({
        data: { candidateId: candidate.id, clientId: client.id, stage: 'hired' },
    });
    await prisma.workspaceMembership.createMany({
        data: [
            { workspaceId: workspace.id, userId: actor.id, role: actorRole },
            { workspaceId: workspace.id, userId: recruiter.id, role: 'recruiter' },
        ],
    });
    const placement = await prisma.marketplacePlacement.create({
        data: {
            workspaceId: workspace.id,
            clientId: client.id,
            applicationId: application.id,
            recruiterUserId: recruiter.id,
        },
    });
    return { actor, recruiter, workspace, client, candidate, application, placement };
}

function preview(context, body, actor = context.actor) {
    return request(app)
        .post(`/api/blinkfy/clients/${context.client.id}/revenue-sharing/preview`)
        .set('Authorization', bearerToken(actor))
        .set('x-workspace-id', context.workspace.id)
        .send(body);
}

function confirmAllocation(targetApp, context, body, actor = context.actor) {
    return request(targetApp)
        .post(`/api/blinkfy/clients/${context.client.id}/revenue-sharing/allocations`)
        .set('Authorization', bearerToken(actor))
        .set('x-workspace-id', context.workspace.id)
        .send(body);
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test.each(['owner', 'admin'])('%s previews the persisted placement recruiter and deterministic normalized split without persistence', async (actorRole) => {
    const context = await createContext({ actorRole });

    const response = await preview(context, {
        placementId: context.placement.id,
        recruiterUserId: context.actor.id,
        currency: 'brl',
        grossAmountMinor: 101,
    });

    expect(response.status).toBe(200);
    expect(response.body.preview).toEqual({
        placementId: context.placement.id,
        recruiterUserId: context.recruiter.id,
        currency: 'BRL',
        grossAmountMinor: 101,
        recruiterBasisPoints: 7000,
        platformBasisPoints: 3000,
        recruiterAmountMinor: 70,
        platformAmountMinor: 31,
        confirmed: false,
        transferred: false,
    });
    await expect(prisma.placementRevenueAllocation.count({ where: { placementId: context.placement.id } })).resolves.toBe(0);
    await expect(prisma.auditEvent.count({
        where: { workspaceId: context.workspace.id, action: 'marketplace.revenue_allocated' },
    })).resolves.toBe(0);
});

test('allows a recruiter to preview only their own placement', async () => {
    const context = await createContext({ actorRole: 'recruiter' });

    const own = await preview(context, {
        placementId: context.placement.id,
        currency: 'USD',
        grossAmountMinor: 100,
    }, context.recruiter);
    expect(own.status).toBe(200);

    const otherRecruiter = await createUser('other-recruiter');
    await prisma.workspaceMembership.create({
        data: { workspaceId: context.workspace.id, userId: otherRecruiter.id, role: 'recruiter' },
    });
    const unauthorized = await preview(context, {
        placementId: context.placement.id,
        currency: 'USD',
        grossAmountMinor: 100,
    }, otherRecruiter);
    expect(unauthorized.status).toBe(404);
});

test('does not expose a placement outside the active client or workspace', async () => {
    const context = await createContext();
    const other = await createContext();

    const wrongClient = await preview(context, {
        placementId: other.placement.id,
        currency: 'BRL',
        grossAmountMinor: 100,
    });
    expect(wrongClient.status).toBe(404);

    const wrongWorkspace = await request(app)
        .post(`/api/blinkfy/clients/${other.client.id}/revenue-sharing/preview`)
        .set('Authorization', bearerToken(context.actor))
        .set('x-workspace-id', context.workspace.id)
        .send({ placementId: other.placement.id, currency: 'BRL', grossAmountMinor: 100 });
    expect(wrongWorkspace.status).toBe(404);
});

test('confirms a preview as one pending allocation with its positive ledger entry and IDs-only audit', async () => {
    const context = await createContext();
    const input = {
        placementId: context.placement.id,
        recruiterUserId: context.actor.id,
        currency: 'brl',
        grossAmountMinor: 101,
    };
    const previewResponse = await preview(context, input);
    expect(previewResponse.status).toBe(200);

    const response = await confirmAllocation(app, context, input);

    expect(response.status).toBe(201);
    expect(response.body.allocation).toEqual(expect.objectContaining({
        placementId: context.placement.id,
        recruiterUserId: context.recruiter.id,
        currency: 'BRL',
        grossAmountMinor: 101,
        recruiterBasisPoints: 7000,
        platformBasisPoints: 3000,
        recruiterAmountMinor: 70,
        platformAmountMinor: 31,
        status: 'pending',
        confirmed: true,
        transferred: false,
    }));
    const allocation = await prisma.placementRevenueAllocation.findUniqueOrThrow({
        where: { placementId: context.placement.id },
    });
    const ledgerEntry = await prisma.placementRevenueLedgerEntry.findUniqueOrThrow({
        where: { allocationId_kind: { allocationId: allocation.id, kind: 'allocation' } },
    });
    const audit = await prisma.auditEvent.findFirstOrThrow({
        where: { workspaceId: context.workspace.id, action: 'marketplace.revenue_allocated' },
    });

    expect(allocation).toMatchObject({
        currency: previewResponse.body.preview.currency,
        grossAmountMinor: previewResponse.body.preview.grossAmountMinor,
        recruiterBasisPoints: previewResponse.body.preview.recruiterBasisPoints,
        platformBasisPoints: previewResponse.body.preview.platformBasisPoints,
        recruiterAmountMinor: previewResponse.body.preview.recruiterAmountMinor,
        platformAmountMinor: previewResponse.body.preview.platformAmountMinor,
        status: 'pending',
        availableAt: null,
        reversedAt: null,
    });
    expect(ledgerEntry).toMatchObject({
        allocationId: allocation.id,
        kind: 'allocation',
        recruiterAmountMinor: 70,
        platformAmountMinor: 31,
        currency: 'BRL',
    });
    expect(audit).toMatchObject({
        clientId: context.client.id,
        actorUserId: context.actor.id,
        entityType: 'placement_revenue_allocation',
        entityId: allocation.id,
        action: 'marketplace.revenue_allocated',
        metadata: {
            placementId: context.placement.id,
            recruiterUserId: context.recruiter.id,
            allocationId: allocation.id,
        },
    });
});

test('returns conflict for a sequential duplicate allocation without another ledger entry', async () => {
    const context = await createContext();
    const input = { placementId: context.placement.id, currency: 'USD', grossAmountMinor: 100 };

    expect((await confirmAllocation(app, context, input)).status).toBe(201);
    expect((await confirmAllocation(app, context, input)).status).toBe(409);
    await expect(prisma.placementRevenueAllocation.count({ where: { placementId: context.placement.id } })).resolves.toBe(1);
    const allocation = await prisma.placementRevenueAllocation.findUniqueOrThrow({
        where: { placementId: context.placement.id },
    });
    await expect(prisma.placementRevenueLedgerEntry.count({ where: { allocationId: allocation.id } })).resolves.toBe(1);
});

test('serializes concurrent confirmation requests from independent Prisma connections', async () => {
    const context = await createContext();
    const firstPrisma = new PrismaClient();
    const secondPrisma = new PrismaClient();
    const input = { placementId: context.placement.id, currency: 'BRL', grossAmountMinor: 101 };

    try {
        const [first, second] = await Promise.all([
            confirmAllocation(createApp({ prisma: firstPrisma }), context, input),
            confirmAllocation(createApp({ prisma: secondPrisma }), context, input),
        ]);

        expect([first.status, second.status].sort()).toEqual([201, 409]);
        const allocation = await prisma.placementRevenueAllocation.findUniqueOrThrow({
            where: { placementId: context.placement.id },
        });
        await expect(prisma.placementRevenueAllocation.count({ where: { placementId: context.placement.id } })).resolves.toBe(1);
        await expect(prisma.placementRevenueLedgerEntry.count({ where: { allocationId: allocation.id } })).resolves.toBe(1);
        await expect(prisma.auditEvent.count({
            where: { workspaceId: context.workspace.id, action: 'marketplace.revenue_allocated' },
        })).resolves.toBe(1);
    } finally {
        await Promise.all([firstPrisma.$disconnect(), secondPrisma.$disconnect()]);
    }
});

test('returns 404 when a recruiter confirms another recruiter\'s placement', async () => {
    const context = await createContext({ actorRole: 'recruiter' });
    const otherRecruiter = await createUser('unauthorized-recruiter');
    await prisma.workspaceMembership.create({
        data: { workspaceId: context.workspace.id, userId: otherRecruiter.id, role: 'recruiter' },
    });

    const response = await confirmAllocation(app, context, {
        placementId: context.placement.id,
        currency: 'BRL',
        grossAmountMinor: 100,
    }, otherRecruiter);

    expect(response.status).toBe(404);
    await expect(prisma.placementRevenueAllocation.count({ where: { placementId: context.placement.id } })).resolves.toBe(0);
});
