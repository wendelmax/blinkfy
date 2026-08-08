const { APPLICATION_STAGES } = require('@recruitment-platform/shared');

const transitions = [
  ['mapped', 'reviewed', 'mappedToReviewed'],
  ['reviewed', 'interested', 'reviewedToInterested'],
  ['interested', 'screened', 'interestedToScreened'],
  ['screened', 'shortlisted', 'screenedToShortlisted'],
];

function requireId(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a nonempty string`);
  return value;
}
function dateValue(value, name) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${name} must be a valid date`);
  return date;
}
function round4(value) { return Math.round(value * 10000) / 10000; }
function emptyStageMap() { return Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, 0])); }

async function getClientAnalytics({ prisma, workspaceId, clientId, jobId, from, to }) {
  requireId(workspaceId, 'workspaceId'); requireId(clientId, 'clientId');
  if (jobId != null) requireId(jobId, 'jobId');
  const fromDate = dateValue(from, 'from'); const toDate = dateValue(to, 'to');
  if (fromDate && toDate && fromDate >= toDate) throw new TypeError('from must be before to');
  // Date filters define the application cohort by mappedAt; audit/consent events
  // are supporting facts for those applications, not independent event cohorts.
  const where = { clientId, client: { workspaceId }, candidate: { workspaceId }, ...(jobId ? { jobId } : {}) };
  if (fromDate || toDate) where.mappedAt = { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lt: toDate } : {}) };
  const applications = await prisma.candidateApplication.findMany({
    where,
    include: {
      scoreSnapshots: { orderBy: { computedAt: 'desc' }, take: 1 },
      candidate: { include: { consents: { where: { workspaceId, purpose: 'client_presentation', OR: [{ clientId: null }, { clientId }] }, orderBy: { createdAt: 'desc' } } } },
    },
  });
  const ids = applications.map((app) => app.id);
  const audits = ids.length ? await prisma.auditEvent.findMany({
    where: { workspaceId, clientId, entityType: 'candidate_application', entityId: { in: ids }, action: { in: ['application.stage_changed', 'application.rejected'] } },
    orderBy: { createdAt: 'asc' },
  }) : [];
  const auditByApp = new Map();
  for (const event of audits) { if (!auditByApp.has(event.entityId)) auditByApp.set(event.entityId, []); auditByApp.get(event.entityId).push(event); }
  const byStage = emptyStageMap(); const stageDurations = Object.fromEntries(APPLICATION_STAGES.map((stage) => [stage, []]));
  const reached = new Map(); let consent = { active: 0, revoked: 0, missing: 0 }; const scores = [];
  for (const app of applications) {
    const stages = new Set(['mapped']);
    const events = auditByApp.get(app.id) || [];
    for (const event of events) {
      const metadata = event.metadata || {};
      if (APPLICATION_STAGES.includes(metadata.from)) stages.add(metadata.from);
      if (APPLICATION_STAGES.includes(metadata.to)) stages.add(metadata.to);
      if (event.action === 'application.rejected') stages.add('rejected');
    }
    // Current state is authoritative when a historical event predates retention.
    if (APPLICATION_STAGES.includes(app.stage)) stages.add(app.stage);
    reached.set(app.id, stages); stages.forEach((stage) => { byStage[stage] += 1; });
    const latestConsent = app.candidate?.consents?.[0];
    if (!latestConsent) consent.missing += 1; else if (latestConsent.revokedAt) consent.revoked += 1; else consent.active += 1;
    const snapshot = app.scoreSnapshots?.[0]; if (snapshot) scores.push(snapshot.overrideScore ?? snapshot.score);
    let currentStage = 'mapped'; let enteredAt = app.mappedAt;
    for (const event of events) {
      const metadata = event.metadata || {}; const fromStage = metadata.from || currentStage;
      // Rejection events historically carry only a reason; they still close the
      // stage occupied immediately before rejection for duration purposes.
      const toStage = metadata.to || (event.action === 'application.rejected' ? 'rejected' : null);
      if (!toStage || (!APPLICATION_STAGES.includes(toStage) && toStage !== 'rejected')) continue;
      if (fromStage === currentStage && enteredAt && event.createdAt > enteredAt && stageDurations[fromStage]) stageDurations[fromStage].push((event.createdAt - enteredAt) / 1000);
      currentStage = toStage; enteredAt = event.createdAt;
    }
  }
  const conversion = Object.fromEntries(transitions.map(([fromStage, toStage, key]) => [key, byStage[fromStage] ? round4(byStage[toStage] / byStage[fromStage]) : null]));
  const stageTime = Object.fromEntries(APPLICATION_STAGES.map((stage) => { const values = stageDurations[stage]; return [stage, { averageSeconds: values.length ? round4(values.reduce((a, b) => a + b, 0) / values.length) : null, sampleSize: values.length }]; }));
  const score = scores.length ? { count: scores.length, average: round4(scores.reduce((a, b) => a + b, 0) / scores.length), minimum: Math.min(...scores), maximum: Math.max(...scores) } : { count: 0, average: null, minimum: null, maximum: null };
  return { scope: { clientId, jobId: jobId || null, from: fromDate?.toISOString() || null, to: toDate?.toISOString() || null }, applications: { total: applications.length, byStage }, conversion, stageTime, consent, score, generatedAt: new Date().toISOString() };
}

module.exports = { getClientAnalytics };
