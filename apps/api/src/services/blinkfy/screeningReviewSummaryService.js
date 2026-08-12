function buildReviewSummary({ evidences = [], score = null } = {}) {
  const kinds = new Set(evidences.map((evidence) => evidence.kind));
  return {
    evidenceCount: evidences.length,
    hasTranscript: kinds.has('transcript'),
    hasRecording: kinds.has('recording'),
    hasInsight: kinds.has('insight'),
    score: score == null ? null : score.overrideScore ?? score.score,
    requiresHumanReview: true,
    automatedDecision: null,
  };
}

module.exports = { buildReviewSummary };
