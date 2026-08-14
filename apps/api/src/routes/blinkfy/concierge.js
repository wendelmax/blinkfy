const express = require('express');
const { createConciergeSchedulingController } = require('../../controllers/blinkfy/conciergeSchedulingController');
const { buildIntegrationCatalog } = require('../../services/blinkfy/integrationCatalogService');
const { buildMcpManifest } = require('../../services/blinkfy/mcpManifestService');
const { buildMcpToolPreview } = require('../../services/blinkfy/mcpToolPreviewService');
function createConciergeRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
  const router = express.Router({ mergeParams: true });
  const controller = createConciergeSchedulingController({ prisma });
  router.get('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.get);
  router.put('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.update);
  router.get('/integrations', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, (req, res) => res.json({ items: buildIntegrationCatalog() }));
  router.get('/mcp/manifest', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, (req, res) => res.json(buildMcpManifest()));
  router.post('/mcp/preview', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, (req, res) => {
    try { return res.json({ preview: buildMcpToolPreview({ toolId: req.body?.toolId, clientId: req.client.id, arguments: req.body?.arguments }) }); }
    catch (error) { return res.status(422).json({ message: error.message }); }
  });
  return router;
}
module.exports = { createConciergeRouter };
