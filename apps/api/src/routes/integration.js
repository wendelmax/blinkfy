const express = require('express');
const { createIntegrationController } = require('../controllers/integrationController');

function createIntegrationRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router();
    const controller = createIntegrationController({ prisma });

    const requireAuth = [
        requireWorkspaceRole('owner', 'admin'),
    ];

    const requireRecruiterOrAdmin = [
        requireWorkspaceRole('owner', 'admin', 'recruiter'),
    ];

    router.get('/providers', requireAuth, controller.listProviders);
    router.get('/configs', requireAuth, controller.listConfigs);
    router.get('/configs/:configId', requireAuth, controller.getConfig);
    router.post('/configs', requireAuth, controller.createConfig);
    router.patch('/configs/:configId', requireAuth, controller.updateConfig);
    router.delete('/configs/:configId', requireAuth, controller.deleteConfig);

    router.get('/executions', requireRecruiterOrAdmin, controller.listExecutions);
    router.post('/configs/:configId/executions', requireRecruiterOrAdmin, controller.createExecution);
    router.post('/executions/:executionId/approve', requireAuth, controller.approveExecution);
    router.post('/executions/:executionId/execute', requireAuth, controller.executeAction);
    router.post('/executions/:executionId/cancel', requireRecruiterOrAdmin, controller.cancelExecution);

    return router;
}

module.exports = { createIntegrationRouter };
