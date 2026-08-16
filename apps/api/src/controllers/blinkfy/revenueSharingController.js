const { calculateRevenueSplit } = require('../../services/blinkfy/revenueSplitService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');

function requestError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPrivilegedRole(role) {
    return role === 'owner' || role === 'admin';
}

function parseAllocationInput(body) {
    const { placementId, currency, grossAmountMinor, recruiterBasisPoints, platformBasisPoints } = body || {};
    if (typeof placementId !== 'string' || placementId.trim() === '') {
        throw requestError(422, 'placementId is required');
    }

    try {
        return {
            placementId,
            split: calculateRevenueSplit({
                currency,
                grossAmountMinor,
                ...(recruiterBasisPoints === undefined ? {} : { recruiterBasisPoints }),
                ...(platformBasisPoints === undefined ? {} : { platformBasisPoints }),
            }),
        };
    } catch (error) {
        if (error instanceof TypeError || error instanceof RangeError) {
            throw requestError(422, error.message);
        }
        throw error;
    }
}

async function findAuthorizedPlacement(prisma, req, placementId) {
    return prisma.marketplacePlacement.findFirst({
        where: {
            id: placementId,
            workspaceId: req.workspace.id,
            clientId: req.client.id,
            ...(isPrivilegedRole(req.workspaceMembership.role) ? {} : { recruiterUserId: req.user.id }),
        },
        select: { id: true, recruiterUserId: true, status: true },
    });
}

function serializePreview(placement, split) {
    return {
        placementId: placement.id,
        recruiterUserId: placement.recruiterUserId,
        ...split,
    };
}

function serializeAllocation(allocation) {
    return {
        id: allocation.id,
        placementId: allocation.placementId,
        recruiterUserId: allocation.recruiterUserId,
        currency: allocation.currency,
        grossAmountMinor: allocation.grossAmountMinor,
        recruiterBasisPoints: allocation.recruiterBasisPoints,
        platformBasisPoints: allocation.platformBasisPoints,
        recruiterAmountMinor: allocation.recruiterAmountMinor,
        platformAmountMinor: allocation.platformAmountMinor,
        status: allocation.status,
        createdAt: allocation.createdAt,
        confirmed: true,
        transferred: false,
    };
}

function createRevenueSharingController({ prisma }) {
    async function preview(req, res) {
        let input;
        try {
            input = parseAllocationInput(req.body);
        } catch (error) {
            if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
            throw error;
        }

        const placement = await findAuthorizedPlacement(prisma, req, input.placementId);
        if (!placement) return res.status(404).json({ message: 'Placement not found' });

        return res.json({ preview: serializePreview(placement, input.split) });
    }

    async function confirmAllocation(req, res) {
        let input;
        try {
            input = parseAllocationInput(req.body);
        } catch (error) {
            if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
            throw error;
        }

        const placement = await findAuthorizedPlacement(prisma, req, input.placementId);
        if (!placement) return res.status(404).json({ message: 'Placement not found' });

        try {
            const allocation = await prisma.$transaction(async (transaction) => {
                const lockedPlacements = await transaction.$queryRaw`
                    SELECT "id", "recruiterUserId", "status"::text AS "status"
                    FROM "marketplace_placements"
                    WHERE "id" = ${input.placementId}
                      AND "workspaceId" = ${req.workspace.id}
                      AND "clientId" = ${req.client.id}
                    FOR UPDATE
                `;
                const lockedPlacement = lockedPlacements[0];
                if (!lockedPlacement
                    || (!isPrivilegedRole(req.workspaceMembership.role)
                        && lockedPlacement.recruiterUserId !== req.user.id)) {
                    throw requestError(404, 'Placement not found');
                }
                if (lockedPlacement.status !== 'confirmed') {
                    throw requestError(409, 'Placement cannot be allocated');
                }

                const split = calculateRevenueSplit({
                    currency: req.body?.currency,
                    grossAmountMinor: req.body?.grossAmountMinor,
                    ...(req.body?.recruiterBasisPoints === undefined
                        ? {}
                        : { recruiterBasisPoints: req.body.recruiterBasisPoints }),
                    ...(req.body?.platformBasisPoints === undefined
                        ? {}
                        : { platformBasisPoints: req.body.platformBasisPoints }),
                });
                const created = await transaction.placementRevenueAllocation.create({
                    data: {
                        workspaceId: req.workspace.id,
                        clientId: req.client.id,
                        placementId: lockedPlacement.id,
                        recruiterUserId: lockedPlacement.recruiterUserId,
                        currency: split.currency,
                        grossAmountMinor: split.grossAmountMinor,
                        recruiterBasisPoints: split.recruiterBasisPoints,
                        platformBasisPoints: split.platformBasisPoints,
                        recruiterAmountMinor: split.recruiterAmountMinor,
                        platformAmountMinor: split.platformAmountMinor,
                    },
                });
                await transaction.placementRevenueLedgerEntry.create({
                    data: {
                        allocationId: created.id,
                        kind: 'allocation',
                        recruiterAmountMinor: created.recruiterAmountMinor,
                        platformAmountMinor: created.platformAmountMinor,
                        currency: created.currency,
                    },
                });
                await recordAuditEvent({
                    prisma: transaction,
                    workspaceId: req.workspace.id,
                    clientId: req.client.id,
                    actorUserId: req.user.id,
                    entityType: 'placement_revenue_allocation',
                    entityId: created.id,
                    action: 'marketplace.revenue_allocated',
                    metadata: {
                        placementId: lockedPlacement.id,
                        recruiterUserId: lockedPlacement.recruiterUserId,
                        allocationId: created.id,
                    },
                });
                return created;
            });
            return res.status(201).json({ allocation: serializeAllocation(allocation) });
        } catch (error) {
            if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
            if (error.code === 'P2002') {
                return res.status(409).json({ message: 'Revenue allocation already exists for this placement' });
            }
            throw error;
        }
    }

    return { preview, confirmAllocation };
}

module.exports = {
    createRevenueSharingController,
    findAuthorizedPlacement,
    parseAllocationInput,
    requestError,
    serializeAllocation,
    serializePreview,
};
