const MAX_SUGGESTIONS = 3;

function validateSchedulingPolicy(input = {}) {
  const timezone = typeof input.timezone === 'string' && input.timezone.trim() ? input.timezone.trim() : null;
  if (!timezone) throw new Error('timezone is required');
  const windows = Array.isArray(input.windows) ? input.windows : [];
  const normalized = windows.map((window) => {
    if (!window || typeof window.start !== 'string' || typeof window.end !== 'string') throw new Error('each window requires start and end');
    const start = new Date(window.start); const end = new Date(window.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error('window must be a valid positive interval');
    return { start: start.toISOString(), end: end.toISOString() };
  });
  return { timezone, windows: normalized, requiresApproval: true, autonomousSending: false };
}

function suggestSlots({ candidates = [] } = {}) {
  return candidates.slice(0, MAX_SUGGESTIONS).map((slot) => ({ ...slot, requiresApproval: true }));
}

module.exports = { MAX_SUGGESTIONS, validateSchedulingPolicy, suggestSlots };
