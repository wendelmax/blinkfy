const feedbackStatuses = new Set(['positive', 'neutral', 'negative', 'needs_review']);

function validateRecruiterFeedback(input = {}) {
  const status = typeof input.status === 'string' ? input.status.trim().toLowerCase() : '';
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!feedbackStatuses.has(status)) throw new Error('invalid feedback status');
  if (!note) throw new Error('feedback note is required');
  if (note.length > 2000) throw new Error('feedback note must be 2000 characters or fewer');
  return { status, note, requiresHumanReview: status === 'needs_review' };
}

module.exports = { feedbackStatuses, validateRecruiterFeedback };
