const express = require('express');
const { createConciergeSchedulingController } = require('../../controllers/blinkfy/conciergeSchedulingController');
function createConciergeRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
  const router = express.Router({ mergeParams: true });
  const controller = createConciergeSchedulingController({ prisma });
  router.get('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.get);
  router.put('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.update);
  return router;
}
module.exports = { createConciergeRouter };
