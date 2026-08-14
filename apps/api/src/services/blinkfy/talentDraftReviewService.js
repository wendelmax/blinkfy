function transitionCandidateDraft(current, next) {
  if (!['approved', 'rejected'].includes(next)) throw new Error('status must be approved or rejected');
  if (current !== 'pending') throw new Error('draft is already decided');
  return next;
}

module.exports = { transitionCandidateDraft };
