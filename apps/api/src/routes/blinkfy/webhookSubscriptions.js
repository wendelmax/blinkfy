const express = require('express');
const { createConciergeWebhookSubscriptionController } = require('../../controllers/blinkfy/conciergeWebhookSubscriptionController');
function createWebhookSubscriptionsRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
  const router = express.Router({ mergeParams: true }); const controller = createConciergeWebhookSubscriptionController({ prisma });
  router.get('/', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.get);
  router.put('/', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.update);
  return router;
}
module.exports = { createWebhookSubscriptionsRouter };
