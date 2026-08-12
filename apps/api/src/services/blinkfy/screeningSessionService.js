const transitions = {
  invited: new Set(['consented', 'withdrawn']),
  consented: new Set(['scheduled', 'withdrawn']),
  scheduled: new Set(['in_progress', 'withdrawn']),
  in_progress: new Set(['completed', 'withdrawn']),
  completed: new Set([]),
  withdrawn: new Set([]),
};

function transitionScreeningSession(session, nextStatus) {
  if (session.status === 'withdrawn') throw new Error('screening session is withdrawn');
  if (['scheduled', 'in_progress', 'completed'].includes(nextStatus) && !session.consentedAt) {
    throw new Error('screening consent required');
  }
  if (!transitions[session.status]?.has(nextStatus)) {
    throw new Error(`invalid screening transition: ${session.status} -> ${nextStatus}`);
  }
  return { ...session, status: nextStatus };
}

module.exports = { transitionScreeningSession };
