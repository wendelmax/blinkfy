const { getPrisma } = require('../lib/prisma');

function createWorkspaceMiddleware({ prisma = getPrisma() } = {}) {
    function requireWorkspaceRole(...roles) {
        return async (req, res, next) => {
            const workspaceId = req.header('x-workspace-id');

            if (!workspaceId) {
                return res.status(400).json({ message: 'x-workspace-id header is required' });
            }

            const membership = await prisma.workspaceMembership.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId: req.user.id,
                    },
                },
                include: { workspace: true },
            });

            if (!membership || (roles.length > 0 && !roles.includes(membership.role))) {
                return res.status(403).json({ message: 'Workspace access denied' });
            }

            req.workspace = membership.workspace;
            req.workspaceMembership = membership;
            return next();
        };
    }

    async function requireClientAccess(req, res, next) {
        const client = await prisma.client.findFirst({
            where: {
                id: req.params.clientId,
                workspaceId: req.workspace.id,
            },
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        req.client = client;
        return next();
    }

    return { requireWorkspaceRole, requireClientAccess };
}

const defaultMiddleware = createWorkspaceMiddleware();

module.exports = { ...defaultMiddleware, createWorkspaceMiddleware };
