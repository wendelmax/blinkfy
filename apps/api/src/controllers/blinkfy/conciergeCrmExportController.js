const { buildCrmExportPreview } = require('../../services/blinkfy/conciergeCrmExportService');
const { recordAuditEvent } = require('../../services/blinkfy/auditService');

function createConciergeCrmExportController({ prisma }) {
  async function preview(req, res) {
    const application = await prisma.candidateApplication.findFirst({
      where: { id: req.params.applicationId, jobId: req.params.jobId, candidate: { workspaceId: req.workspace.id }, job: { client: { workspaceId: req.workspace.id } } },
      include: { candidate: { include: { consents: true } }, job: true },
    });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const consentRecorded = application.candidate.consents.some((consent) => consent.purpose === 'client_presentation' && consent.revokedAt === null && (consent.clientId === null || consent.clientId === application.clientId));
    let result;
    try {
      result = buildCrmExportPreview({ provider: req.body?.provider, application: { id: application.id, candidate: { fullName: application.candidate.fullName, email: application.candidate.normalizedEmail }, job: { title: application.job.title }, stage: application.stage, consentRecorded } });
    } catch (error) { return res.status(422).json({ message: error.message }); }
    await recordAuditEvent({ prisma, workspaceId: req.workspace.id, clientId: application.clientId, actorUserId: req.user.id, entityType: 'candidate_application', entityId: application.id, action: 'concierge.crm_export_preview_created', metadata: { provider: result.provider } });
    return res.json({ preview: result });
  }
  return { preview };
}

module.exports = { createConciergeCrmExportController };
