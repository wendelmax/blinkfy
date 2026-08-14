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
  return candidates.slice(0, MAX_SUGGESTIONS).map((slot) => ({ start: slot.start, end: slot.end, requiresApproval: true, scheduled: false, transmitted: false }));
}

function buildCalendarPreview({ policy } = {}) {
  if (!policy || !Array.isArray(policy.windows)) return { timezone: policy?.timezone || null, slots: [], requiresApproval: true, scheduled: false, transmitted: false };
  return { timezone: policy.timezone, slots: suggestSlots({ candidates: policy.windows }), requiresApproval: true, scheduled: false, transmitted: false };
}

function validateApprovalRequest({ policy, start, end } = {}) {
  const candidateStart = new Date(start); const candidateEnd = new Date(end);
  if (Number.isNaN(candidateStart.getTime()) || Number.isNaN(candidateEnd.getTime()) || candidateEnd <= candidateStart) throw new Error('slot must be a valid positive interval');
  const allowed = (policy?.windows || []).some((window) => candidateStart >= new Date(window.start) && candidateEnd <= new Date(window.end));
  if (!allowed) throw new Error('slot is outside the configured scheduling windows');
  return { start: candidateStart.toISOString(), end: candidateEnd.toISOString() };
}

module.exports = { MAX_SUGGESTIONS, validateSchedulingPolicy, suggestSlots, buildCalendarPreview, validateApprovalRequest };
