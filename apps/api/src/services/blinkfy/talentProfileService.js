const { recordAuditEvent } = require('./auditService');

const VISIBILITIES = new Set(['private', 'available', 'recruiters_only', 'paused']);
const EDITABLE_FIELDS = new Set([
    'targetRole', 'headline', 'bio', 'skills', 'location', 'workModel', 'availability', 'portfolioUrl',
]);
const PROTECTED_FIELDS = new Set([
    'age', 'dateOfBirth', 'gender', 'race', 'ethnicity', 'religion', 'nationality', 'disability',
]);

function candidateWhere({ workspaceId, userId }) {
    return { workspaceId, userId };
}

function serializeProfile(candidate) {
    if (!candidate) return null;
    return {
        id: candidate.id,
        userId: candidate.userId,
        fullName: candidate.fullName,
        visibility: candidate.visibility,
        targetRole: candidate.targetRole,
        headline: candidate.headline,
        bio: candidate.bio,
        skills: candidate.skills || [],
        location: candidate.location,
        workModel: candidate.workModel,
        availability: candidate.availability,
        portfolioUrl: candidate.portfolioUrl,
        updatedAt: candidate.updatedAt,
    };
}

async function getCandidateProfile({ prisma, userId, workspaceId }) {
    const candidate = await prisma.candidate.findFirst({ where: candidateWhere({ workspaceId, userId }) });
    return serializeProfile(candidate);
}

async function updateCandidateProfile({ prisma, userId, workspaceId, updates, actorUserId = userId }) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) throw new TypeError('updates must be an object');
    const protectedFields = Object.keys(updates).filter((field) => PROTECTED_FIELDS.has(field));
    if (protectedFields.length) throw new TypeError('protected attributes cannot be used in candidate profile matching');
    const unknown = Object.keys(updates).filter((field) => !EDITABLE_FIELDS.has(field));
    if (unknown.length) throw new TypeError(`unsupported profile field: ${unknown[0]}`);
    if (updates.skills !== undefined && (!Array.isArray(updates.skills) || updates.skills.some((s) => typeof s !== 'string'))) {
        throw new TypeError('skills must be an array of strings');
    }
    const candidate = await prisma.candidate.findFirst({ where: candidateWhere({ workspaceId, userId }) });
    if (!candidate) throw new Error('Candidate profile not found');
    const updated = await prisma.$transaction(async (transaction) => {
        const saved = await transaction.candidate.update({ where: { id: candidate.id }, data: updates });
        await recordAuditEvent({
            prisma: transaction, workspaceId, actorUserId, entityType: 'candidate', entityId: candidate.id,
            action: 'candidate.talent_profile_updated', metadata: { fields: Object.keys(updates) },
        });
        return saved;
    });
    return serializeProfile(updated);
}

async function setCandidateVisibility({ prisma, userId, workspaceId, visibility, actorUserId = userId }) {
    if (!VISIBILITIES.has(visibility)) throw new TypeError('invalid candidate visibility');
    const candidate = await prisma.candidate.findFirst({ where: candidateWhere({ workspaceId, userId }) });
    if (!candidate) throw new Error('Candidate profile not found');
    const updated = await prisma.$transaction(async (transaction) => {
        const saved = await transaction.candidate.update({ where: { id: candidate.id }, data: { visibility } });
        await recordAuditEvent({
            prisma: transaction, workspaceId, actorUserId, entityType: 'candidate', entityId: candidate.id,
            action: 'candidate.visibility_changed', metadata: { from: candidate.visibility, to: visibility },
        });
        return saved;
    });
    return serializeProfile(updated);
}

module.exports = { getCandidateProfile, updateCandidateProfile, setCandidateVisibility, serializeProfile };
