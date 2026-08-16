const { recordAuditEvent } = require('../../services/blinkfy/auditService');

const eligibleRecruiterRoles = new Set(['recruiter', 'admin', 'owner']);

function requestError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function serializePlacement(placement) {
    return {
        id: placement.id,
        applicationId: placement.applicationId,
        recruiterUserId: placement.recruiterUserId,
        status: placement.status,
        createdAt: placement.createdAt,
    };
}

function createMarketplacePlacementsController({ prisma }) {
    async function confirmPlacement(req, res) {
        const { applicationId, recruiterUserId } = req.body || {};
        if (typeof applicationId !== 'string' || applicationId.trim() === ''
            || typeof recruiterUserId !== 'string' || recruiterUserId.trim() === '') {
            return res.status(422).json({ message: 'applicationId and recruiterUserId are required' });
        }

        const application = await prisma.candidateApplication.findFirst({
            where: {
                id: applicationId,
                clientId: req.client.id,
                candidate: { workspaceId: req.workspace.id },
            },
            select: { id: true },
        });
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        try {
            const placement = await prisma.$transaction(async (transaction) => {
                const lockedApplications = await transaction.$queryRaw`
                    SELECT "id"
                    FROM "candidate_applications"
                    WHERE "id" = ${application.id} AND "clientId" = ${req.client.id}
                    FOR UPDATE
                `;
                if (lockedApplications.length === 0) {
                    throw requestError(404, 'Application not found');
                }

                const existingPlacement = await transaction.marketplacePlacement.findUnique({
                    where: { applicationId: application.id },
                    select: { id: true },
                });
                if (existingPlacement) {
                    throw requestError(409, 'Placement already confirmed for this application');
                }

                const lockedApplication = await transaction.candidateApplication.findFirst({
                    where: {
                        id: application.id,
                        clientId: req.client.id,
                        candidate: { workspaceId: req.workspace.id },
                    },
                    select: { id: true, clientId: true, stage: true },
                });
                if (!lockedApplication) {
                    throw requestError(404, 'Application not found');
                }
                if (lockedApplication.stage !== 'shortlisted') {
                    throw requestError(422, 'Only shortlisted applications can be confirmed as placements');
                }

                const recruiterMembership = await transaction.workspaceMembership.findUnique({
                    where: {
                        workspaceId_userId: {
                            workspaceId: req.workspace.id,
                            userId: recruiterUserId,
                        },
                    },
                    select: { userId: true, role: true },
                });
                if (!recruiterMembership || !eligibleRecruiterRoles.has(recruiterMembership.role)) {
                    throw requestError(422, 'Recruiter must be an eligible workspace member');
                }

                const created = await transaction.marketplacePlacement.create({
                    data: {
                        workspaceId: req.workspace.id,
                        clientId: lockedApplication.clientId,
                        applicationId: lockedApplication.id,
                        recruiterUserId: recruiterMembership.userId,
                    },
                });
                await transaction.candidateApplication.update({
                    where: { id: lockedApplication.id },
                    data: { stage: 'hired', hiredAt: new Date() },
                });
                await recordAuditEvent({
                    prisma: transaction,
                    workspaceId: req.workspace.id,
                    clientId: req.client.id,
                    actorUserId: req.user.id,
                    entityType: 'marketplace_placement',
                    entityId: created.id,
                    action: 'marketplace.placement_confirmed',
                    metadata: { applicationId: lockedApplication.id, recruiterUserId: recruiterMembership.userId },
                });
                return created;
            });
            return res.status(201).json({ placement: serializePlacement(placement) });
        } catch (error) {
            if (error.statusCode) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            if (error.code === 'P2002') {
                return res.status(409).json({ message: 'Placement already confirmed for this application' });
            }
            throw error;
        }
    }

    return { confirmPlacement };
}

module.exports = { createMarketplacePlacementsController, serializePlacement };
