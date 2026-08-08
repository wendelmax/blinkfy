const express = require('express');
const auth = require('../../middleware/auth');
const { createWorkspaceMiddleware } = require('../../middleware/workspace');
const { createJobsRouter } = require('./jobs');
const { createCandidatesRouter } = require('./candidates');
const { createImportsRouter } = require('./imports');

function createBlinkfyRouter({ prisma }) {
    const router = express.Router();
    const workspaceMiddleware = createWorkspaceMiddleware({ prisma });

    router.use(auth);
    router.use('/clients/:clientId/jobs', createJobsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/candidates/import', createImportsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/candidates', createCandidatesRouter({ ...workspaceMiddleware, prisma }));

    return router;
}

module.exports = { createBlinkfyRouter };
