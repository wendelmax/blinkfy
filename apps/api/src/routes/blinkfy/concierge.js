const express = require('express');
const { createConciergeSchedulingController } = require('../../controllers/blinkfy/conciergeSchedulingController');
const { buildIntegrationCatalog } = require('../../services/blinkfy/integrationCatalogService');
const { buildMcpManifest } = require('../../services/blinkfy/mcpManifestService');
const { buildMcpToolPreview } = require('../../services/blinkfy/mcpToolPreviewService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');
function createConciergeRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
  const router = express.Router({ mergeParams: true });
  const controller = createConciergeSchedulingController({ prisma });
  router.get('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, controller.get);
  router.put('/scheduling-policy', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.update);
  router.get('/integrations', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, (req, res) => res.json({ items: buildIntegrationCatalog() }));
  router.get('/mcp/manifest', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, (req, res) => res.json(buildMcpManifest()));
  router.post('/mcp/preview', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, async (req, res) => {
    try {
      const preview = buildMcpToolPreview({ toolId: req.body?.toolId, clientId: req.client.id, arguments: req.body?.arguments });
      await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: req.client.id, actorUserId: req.user.id, entityType: 'concierge_mcp_preview', entityId: `${req.client.id}:${preview.tool}`, action: 'concierge.mcp_preview_created', metadata: { tool: preview.tool, scopes: preview.scopes } });
      return res.json({ preview });
    } catch (error) { return res.status(422).json({ message: error.message }); }
  });
  router.get('/mcp/audit', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, async (req, res) => {
    const items = await prisma.auditEvent.findMany({ where: { workspaceId: req.workspace.id, clientId: req.client.id, entityType: 'concierge_mcp_preview' }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, actorUserId: true, action: true, metadata: true, createdAt: true } });
    return res.json({ items });
  });
  return router;
}
module.exports = { createConciergeRouter };
