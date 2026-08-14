const providers = new Set(['hubspot', 'salesforce', 'pipedrive']);

function buildCrmExportPreview({ provider, application }) {
  if (!providers.has(provider)) throw new Error('provider is unsupported');
  if (!application?.consentRecorded) throw new Error('consent is required');
  if (!application.id || !application.candidate?.fullName || !application.job?.title) throw new Error('application data is incomplete');
  return {
    provider,
    applicationId: application.id,
    contact: { fullName: application.candidate.fullName, email: application.candidate.email ?? null },
    opportunity: { title: application.job.title, stage: application.stage },
    approved: false,
    transmitted: false,
  };
}

module.exports = { providers, buildCrmExportPreview };
