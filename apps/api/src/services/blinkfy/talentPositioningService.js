const PROFILE_FIELDS = [
    'targetRole', 'headline', 'bio', 'skills', 'location', 'workModel', 'availability', 'portfolioUrl',
];

function isComplete(field, value) {
    if (field === 'skills') return Array.isArray(value) && value.length > 0;
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

function calculateProfileCompleteness(profile = {}) {
    const missing = PROFILE_FIELDS.filter((field) => !isComplete(field, profile[field]));
    const completed = PROFILE_FIELDS.length - missing.length;
    return {
        completed,
        total: PROFILE_FIELDS.length,
        percentage: Math.round((completed / PROFILE_FIELDS.length) * 100),
        missing,
    };
}

async function getCandidatePositioningAnalytics({ prisma, userId, workspaceId }) {
    const candidate = await prisma.candidate.findFirst({
        where: { userId, workspaceId },
        select: {
            id: true, visibility: true, targetRole: true, headline: true, bio: true, skills: true,
            location: true, workModel: true, availability: true, portfolioUrl: true,
        },
    });
    if (!candidate) return null;
    const activeConsents = await prisma.candidateConsent.count({
        where: { candidateId: candidate.id, workspaceId, revokedAt: null },
    });
    const completeness = calculateProfileCompleteness(candidate);
    const nextActions = completeness.missing.map((field) => `complete_${field}`);
    if (candidate.visibility === 'private') nextActions.push('set_visibility');
    return {
        profileCompleteness: completeness,
        visibility: candidate.visibility,
        activeConsentCount: activeConsents,
        discoverability: candidate.visibility === 'available' || candidate.visibility === 'recruiters_only' ? 'enabled' : 'disabled',
        nextActions,
    };
}

module.exports = { PROFILE_FIELDS, calculateProfileCompleteness, getCandidatePositioningAnalytics };
