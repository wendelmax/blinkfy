const providers = new Set(['greenhouse', 'lever', 'workable']);

function buildAtsExportPreview({ provider, application }) {
  if (!providers.has(provider)) throw new Error('provider is unsupported');
  if (!application?.consentRecorded) throw new Error('consent is required');
  if (!application.id || !application.candidate?.fullName || !application.job?.title) {
    throw new Error('application data is incomplete');
  }

  return {
    provider,
    applicationId: application.id,
    candidate: {
      fullName: application.candidate.fullName,
      email: application.candidate.email ?? null,
    },
    jobTitle: application.job.title,
    approved: false,
    transmitted: false,
  };
}

module.exports = { providers, buildAtsExportPreview };
