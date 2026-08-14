const express = require('express');
const { createConciergeWebhookSubscriptionController } = require('../../controllers/blinkfy/conciergeWebhookSubscriptionController');
function createWebhookSubscriptionsRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
  const router = express.Router({ mergeParams: true }); const controller = createConciergeWebhookSubscriptionController({ prisma });
  router.get('/', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.get);
  router.put('/', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.update);
  router.post('/preview', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.preview);
  router.get('/outbox', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.listOutbox);
  return router;
}
module.exports = { createWebhookSubscriptionsRouter };
