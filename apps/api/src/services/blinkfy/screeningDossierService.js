const evidenceKinds = new Set(['recording', 'transcript', 'insight']);

function validateEvidenceInput(body = {}) {
  const kind = body.kind;
  const uri = typeof body.uri === 'string' && body.uri.trim() ? body.uri.trim() : null;
  const content = typeof body.content === 'string' && body.content.trim() ? body.content.trim() : null;
  const confidence = body.confidence == null ? null : body.confidence;
  const retentionUntil = body.retentionUntil == null ? null : new Date(body.retentionUntil);
  if (!evidenceKinds.has(kind)) throw new Error('kind must be recording, transcript, or insight');
  if (!uri && !content) throw new Error('uri or content is required');
  if (confidence !== null && (!Number.isInteger(confidence) || confidence < 0 || confidence > 100)) throw new Error('confidence must be an integer between 0 and 100');
  if (retentionUntil && Number.isNaN(retentionUntil.getTime())) throw new Error('retentionUntil must be a valid date');
  return { kind, uri, content, confidence, retentionUntil };
}

async function findLatestDossierSession({ prisma, applicationId }) {
  return prisma.screeningSession.findFirst({
    where: { applicationId, status: { not: 'withdrawn' } },
    orderBy: { createdAt: 'desc' },
    include: { evidences: { orderBy: { createdAt: 'asc' } } },
  });
}

module.exports = { evidenceKinds, validateEvidenceInput, findLatestDossierSession };
