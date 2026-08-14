const express = require('express');
const { createConciergeSchedulingController } = require('../../controllers/blinkfy/conciergeSchedulingController');
const { buildIntegrationCatalog } = require('../../services/blinkfy/integrationCatalogService');
const { buildMcpManifest } = require('../../services/blinkfy/mcpManifestService');
function createConciergeRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
  const router = express.Router({ mergeParams: true });
  const controller = createConciergeSchedulingController({ prisma });
  router.get('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.get);
  router.put('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.update);
  router.get('/integrations', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, (req, res) => res.json({ items: buildIntegrationCatalog() }));
  router.get('/mcp/manifest', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, (req, res) => res.json(buildMcpManifest()));
  return router;
}
module.exports = { createConciergeRouter };
