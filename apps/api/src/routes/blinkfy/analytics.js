const express = require('express');
const { createAnalyticsController } = require('../../controllers/blinkfy/analyticsController');

function createAnalyticsRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createAnalyticsController({ prisma });
    router.get('/', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.getAnalytics);
    return router;
}

module.exports = { createAnalyticsRouter };
