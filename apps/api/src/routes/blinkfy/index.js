const express = require('express');
const auth = require('../../middleware/auth');
const { createWorkspaceMiddleware } = require('../../middleware/workspace');
const { createJobsRouter } = require('./jobs');
const { createCandidatesRouter } = require('./candidates');
const { createImportsRouter } = require('./imports');
const { createApplicationsRouter } = require('./applications');
const { createAnalyticsRouter } = require('./analytics');
const { createTalentRouter } = require('./talent');
const { createKnowledgeController } = require('../../controllers/blinkfy/knowledgeController');

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
    const knowledge = createKnowledgeController({ prisma });
    router.get('/clients/:clientId/knowledge', workspaceMiddleware.requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), workspaceMiddleware.requireClientAccess, knowledge.listDocuments);
    router.post('/clients/:clientId/knowledge', workspaceMiddleware.requireWorkspaceRole('owner', 'admin', 'recruiter'), workspaceMiddleware.requireClientAccess, knowledge.createDocument);
    router.get('/clients/:clientId/knowledge/search', workspaceMiddleware.requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), workspaceMiddleware.requireClientAccess, knowledge.search);

    return router;
}

module.exports = { createBlinkfyRouter };
