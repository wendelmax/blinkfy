const express = require('express');
const auth = require('../../middleware/auth');
const { createWorkspaceMiddleware } = require('../../middleware/workspace');
const { createJobsRouter } = require('./jobs');
const { createCandidatesRouter } = require('./candidates');
const { createImportsRouter } = require('./imports');
const { createApplicationsRouter } = require('./applications');
const { createAnalyticsRouter } = require('./analytics');
const { createTalentRouter } = require('./talent');

function createBlinkfyRouter({ prisma }) {
    const router = express.Router();
    const workspaceMiddleware = createWorkspaceMiddleware({ prisma });

    router.use(auth);
    router.use('/clients/:clientId/jobs', createJobsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/candidates/import', createImportsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/candidates', createCandidatesRouter({ ...workspaceMiddleware, prisma }));
    router.use('/jobs/:jobId/applications', createApplicationsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/analytics', createAnalyticsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/talent', createTalentRouter({ ...workspaceMiddleware, prisma }));

    return router;
}

module.exports = { createBlinkfyRouter };
