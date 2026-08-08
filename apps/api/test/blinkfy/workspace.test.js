const { PrismaClient } = require('@prisma/client');
const { disconnectPrisma } = require('../../src/lib/prisma');
const { recordAuditEvent } = require('../../src/services/blinkfy/auditService');

const prisma = new PrismaClient();
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

test('records an immutable audit event for a workspace action', async () => {
    const owner = await prisma.user.create({
        data: {
            email: `workspace-owner-${runId}@example.test`,
            fullName: 'Workspace Owner',
            userType: 'recruiter',
        },
    });
    const workspace = await prisma.workspace.create({ data: { name: `Acme Agency ${runId}` } });
    const client = await prisma.client.create({
        data: { workspaceId: workspace.id, name: 'Acme Client' },
    });

    await prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: owner.id, role: 'owner' },
    });
    await expect(
        prisma.workspaceMembership.create({
            data: { workspaceId: workspace.id, userId: owner.id, role: 'admin' },
        }),
    ).rejects.toThrow();

    const event = await recordAuditEvent({
        workspaceId: workspace.id,
        actorUserId: owner.id,
        clientId: client.id,
        entityType: 'client',
        entityId: client.id,
        action: 'client.created',
        metadata: { name: client.name },
    });

    expect(event).toMatchObject({
        workspaceId: workspace.id,
        actorUserId: owner.id,
        clientId: client.id,
        entityType: 'client',
        entityId: client.id,
        action: 'client.created',
        metadata: { name: 'Acme Client' },
    });
    await expect(
        prisma.auditEvent.update({ where: { id: event.id }, data: { action: 'changed' } }),
    ).rejects.toThrow();
    await expect(prisma.auditEvent.delete({ where: { id: event.id } })).rejects.toThrow();
});

test('rejects audit events with blank identifiers or non-serializable metadata', async () => {
    await expect(
        recordAuditEvent({
            workspaceId: '',
            entityType: 'client',
            entityId: 'client-1',
            action: 'client.created',
        }),
    ).rejects.toThrow('workspaceId must be a nonempty string');
    await expect(
        recordAuditEvent({
            workspaceId: 'workspace-1',
            entityType: 'client',
            entityId: 'client-1',
            action: 'client.created',
            metadata: { unsupported: BigInt(1) },
        }),
    ).rejects.toThrow('metadata must be JSON-serializable');
    await expect(
        recordAuditEvent({
            workspaceId: 'workspace-1',
            entityType: 'client',
            entityId: 'client-1',
            action: 'client.created',
            metadata: { callback: () => {} },
        }),
    ).rejects.toThrow('metadata must be JSON-serializable');
});
