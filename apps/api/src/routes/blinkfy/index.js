const express = require('express');
const auth = require('../../middleware/auth');
const { createWorkspaceMiddleware } = require('../../middleware/workspace');
const { createJobsRouter } = require('./jobs');
const { createCandidatesRouter } = require('./candidates');
const { createImportsRouter } = require('./imports');
const { createApplicationsRouter } = require('./applications');
const { createAnalyticsRouter } = require('./analytics');
const { createTalentRouter } = require('./talent');
const { createConciergeRouter } = require('./concierge');
const { createWebhookSubscriptionsRouter } = require('./webhookSubscriptions');
const { createMarketplacePlacementsRouter } = require('./marketplacePlacements');
const { createRevenueSharingRouter } = require('./revenueSharing');
const { createBillingRouter } = require('../billing');
const { createNfeRouter } = require('../nfe');
const { createKnowledgeController } = require('../../controllers/blinkfy/knowledgeController');

function createBlinkfyRouter({ prisma, billingProvider }) {
    const router = express.Router();
    const workspaceMiddleware = createWorkspaceMiddleware({ prisma });

    router.use(auth);
    router.use('/clients/:clientId/jobs', createJobsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/candidates/import', createImportsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/candidates', createCandidatesRouter({ ...workspaceMiddleware, prisma }));
    router.use('/jobs/:jobId/applications', createApplicationsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/analytics', createAnalyticsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/talent', createTalentRouter({ ...workspaceMiddleware, prisma, billingProvider }));
    router.use('/clients/:clientId/concierge', createConciergeRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/concierge/webhooks', createWebhookSubscriptionsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/placements', createMarketplacePlacementsRouter({ ...workspaceMiddleware, prisma }));
    router.use('/clients/:clientId/revenue-sharing', createRevenueSharingRouter({ ...workspaceMiddleware, prisma }));
    if (billingProvider) {
        router.use('/billing', createBillingRouter({ ...workspaceMiddleware, prisma, billingProvider }));
    }
    router.use('/nfe', createNfeRouter({ ...workspaceMiddleware, prisma }));
    const knowledge = createKnowledgeController({ prisma });
    router.get('/clients/:clientId/knowledge', workspaceMiddleware.requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), workspaceMiddleware.requireClientAccess, knowledge.listDocuments);
    router.post('/clients/:clientId/knowledge', workspaceMiddleware.requireWorkspaceRole('owner', 'admin', 'recruiter'), workspaceMiddleware.requireClientAccess, knowledge.createDocument);
    router.get('/clients/:clientId/knowledge/search', workspaceMiddleware.requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), workspaceMiddleware.requireClientAccess, knowledge.search);

    return router;
}

module.exports = { createBlinkfyRouter };
