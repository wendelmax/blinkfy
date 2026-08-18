const { PrismaClient } = require('@prisma/client');
const { createAdapter } = require('./adapters/adapterRegistry');

let prisma = new PrismaClient();
function setPrisma(client) { prisma = client; }

async function listConfigs(userId, workspaceId, { category, status } = {}) {
    const where = { userId, workspaceId };
    if (category) where.category = category;
    if (status) where.status = status;
    return prisma.integrationConfig.findMany({ where, orderBy: { createdAt: 'desc' } });
}

async function getConfig(configId) {
    const config = await prisma.integrationConfig.findUnique({ where: { id: configId } });
    if (!config) throw Object.assign(new Error('Integration config not found'), { status: 404 });
    return config;
}

async function createConfig(userId, workspaceId, { provider, category, config: providerConfig, credentialRef }) {
    if (!provider || !category) {
        throw Object.assign(new Error('provider and category are required'), { status: 422 });
    }
    createAdapter(provider); // validate provider exists
    return prisma.integrationConfig.create({
        data: {
            userId,
            workspaceId,
            provider,
            category,
            credentialRef: credentialRef || null,
            config: providerConfig || undefined,
            status: 'inactive',
            killSwitch: true,
        },
    });
}

async function updateConfig(configId, data) {
    await getConfig(configId);
    const allowed = ['status', 'config', 'killSwitch', 'rateLimitRpm', 'credentialRef'];
    const updateData = {};
    for (const key of allowed) {
        if (data[key] !== undefined) updateData[key] = data[key];
    }
    return prisma.integrationConfig.update({ where: { id: configId }, data: updateData });
}

async function deleteConfig(configId) {
    await getConfig(configId);
    return prisma.integrationConfig.delete({ where: { id: configId } });
}

async function createExecution(userId, workspaceId, { configId, action, requestPayload }) {
    const config = await getConfig(configId);
    if (config.userId !== userId) {
        throw Object.assign(new Error('Config does not belong to this user'), { status: 403 });
    }

    const crypto = require('crypto');
    const idempotencyKey = `${config.provider}_${action}_${crypto.randomBytes(8).toString('hex')}`;

    return prisma.integrationExecution.create({
        data: {
            configId,
            userId,
            workspaceId,
            action,
            status: 'pending_approval',
            idempotencyKey,
            requestPayload: requestPayload || undefined,
            approvalRequired: true,
        },
    });
}

async function approveExecution(executionId, approvedBy) {
    const execution = await prisma.integrationExecution.findUnique({ where: { id: executionId } });
    if (!execution) throw Object.assign(new Error('Execution not found'), { status: 404 });
    if (execution.status !== 'pending_approval') {
        throw Object.assign(new Error(`Cannot approve execution in status "${execution.status}"`), { status: 422 });
    }

    return prisma.integrationExecution.update({
        where: { id: executionId },
        data: {
            status: 'approved',
            approvedBy,
            approvedAt: new Date(),
        },
    });
}

async function executeAction(executionId) {
    const execution = await prisma.integrationExecution.findUnique({
        where: { id: executionId },
        include: { config: true },
    });
    if (!execution) throw Object.assign(new Error('Execution not found'), { status: 404 });
    if (execution.status !== 'approved') {
        throw Object.assign(new Error(`Cannot execute action in status "${execution.status}"`), { status: 422 });
    }

    const adapter = createAdapter(execution.config.provider, {
        rateLimitRpm: execution.config.rateLimitRpm,
    });

    await prisma.integrationExecution.update({
        where: { id: executionId },
        data: { status: 'executing', executedAt: new Date() },
    });

    const result = await adapter.executeWithSafety({
        action: execution.action,
        payload: execution.requestPayload,
        killSwitch: execution.config.killSwitch,
        maxRetries: execution.maxRetries,
    });

    if (result.success) {
        return prisma.integrationExecution.update({
            where: { id: executionId },
            data: {
                status: 'completed',
                responsePayload: result.result,
                completedAt: new Date(),
                retryCount: result.attempts - 1,
            },
        });
    } else {
        const shouldRetry = execution.retryCount < execution.maxRetries;
        return prisma.integrationExecution.update({
            where: { id: executionId },
            data: {
                status: shouldRetry ? 'pending_approval' : 'failed',
                error: result.error,
                failedAt: shouldRetry ? null : new Date(),
                retryCount: result.attempts - 1,
            },
        });
    }
}

async function cancelExecution(executionId) {
    const execution = await prisma.integrationExecution.findUnique({ where: { id: executionId } });
    if (!execution) throw Object.assign(new Error('Execution not found'), { status: 404 });

    return prisma.integrationExecution.update({
        where: { id: executionId },
        data: { status: 'cancelled' },
    });
}

async function listExecutions(userId, { configId, status, action } = {}) {
    const where = { userId };
    if (configId) where.configId = configId;
    if (status) where.status = status;
    if (action) where.action = action;
    return prisma.integrationExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}

module.exports = {
    listConfigs,
    getConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    createExecution,
    approveExecution,
    executeAction,
    cancelExecution,
    listExecutions,
    setPrisma,
};
