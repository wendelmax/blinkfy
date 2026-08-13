function summarizeScreening({ session, evidences = [], score = null }) {
  const kinds = new Set(evidences.map((evidence) => evidence.kind));
  return { status: session.status, consentVersion: session.consentVersion ?? null, evidenceCount: evidences.length, evidenceByKind: { recording: kinds.has('recording'), transcript: kinds.has('transcript'), insight: kinds.has('insight') }, score: score?.overrideScore ?? score?.score ?? null, reviewReady: Boolean(session.consentedAt && kinds.has('transcript') && kinds.has('insight')), requiresHumanReview: true };
}
module.exports = { summarizeScreening };
