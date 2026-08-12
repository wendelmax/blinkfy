function findExpiredEvidence(evidences = [], now = new Date()) {
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  return evidences.filter((evidence) => evidence.retentionUntil && new Date(evidence.retentionUntil).getTime() <= at).map((evidence) => evidence.id);
}

module.exports = { findExpiredEvidence };
