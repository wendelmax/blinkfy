const { getPrisma } = require('../../lib/prisma');

function requireNonemptyString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`${field} must be a nonempty string`);
    }
}

function serializeMetadata(metadata) {
    if (metadata === undefined) {
        return undefined;
    }

    try {
        if (!isJsonSerializable(metadata)) {
            throw new TypeError('metadata must be JSON-serializable');
        }

        const serialized = JSON.stringify(metadata);
        if (serialized === undefined) {
            throw new TypeError('metadata must be JSON-serializable');
        }

        return JSON.parse(serialized);
    } catch {
        throw new TypeError('metadata must be JSON-serializable');
    }
}

function isJsonSerializable(value, ancestors = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
        return false;
    }
    if (ancestors.has(value)) {
        return false;
    }

    ancestors.add(value);
    const result = Array.isArray(value)
        ? value.every((item) => isJsonSerializable(item, ancestors))
        : Object.keys(value).every((key) => isJsonSerializable(value[key], ancestors));
    ancestors.delete(value);

    return result;
}

async function recordAuditEvent({
    workspaceId,
    actorUserId,
    clientId,
    entityType,
    entityId,
    action,
    metadata,
}) {
    requireNonemptyString(workspaceId, 'workspaceId');
    requireNonemptyString(entityType, 'entityType');
    requireNonemptyString(entityId, 'entityId');
    requireNonemptyString(action, 'action');

    if (actorUserId !== undefined) {
        requireNonemptyString(actorUserId, 'actorUserId');
    }
    if (clientId !== undefined) {
        requireNonemptyString(clientId, 'clientId');
    }

    const serializedMetadata = serializeMetadata(metadata);

    return getPrisma().auditEvent.create({
        data: {
            workspaceId,
            actorUserId,
            clientId,
            entityType,
            entityId,
            action,
            ...(serializedMetadata === undefined ? {} : { metadata: serializedMetadata }),
        },
    });
}

module.exports = { recordAuditEvent };
