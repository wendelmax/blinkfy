const { isProtectedRequirement } = require('./fitScoreService');

const CAREER_READINESS_POLICY_VERSION = 'career-readiness-v1';

function list(value) {
    return Array.isArray(value)
        ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
        : [];
}

function text(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function matches(values, requirement) {
    return values.some((value) => value.includes(requirement) || requirement.includes(value));
}

function diagnoseCareerReadiness({ candidate, target, policyVersion = CAREER_READINESS_POLICY_VERSION } = {}) {
    const profile = candidate?.profile && typeof candidate.profile === 'object' ? candidate.profile : {};
    const safeSkills = list(profile.skills);
    const requiredSkills = list(target?.requiredSkills).filter((requirement) => !isProtectedRequirement(requirement));
    const targetRoles = list(target?.targetRoles).filter((role) => !isProtectedRequirement(role));
    const currentTitle = text(profile.currentTitle);
    const minimumExperienceYears = Number(target?.minimumExperienceYears);
    const experienceYears = Number(profile.experienceYears);
    const gaps = [];
    const recommendations = [];

    requiredSkills.filter((requirement) => !matches(safeSkills, requirement)).forEach((requirement) => {
        gaps.push({ type: 'skill', requirement, reason: 'not evidenced in the profile' });
        recommendations.push({ type: 'skill', requirement, action: `Build evidence of ${requirement} through a project, course, or portfolio artifact` });
    });
    if (Number.isFinite(minimumExperienceYears) && minimumExperienceYears > 0 && (!Number.isFinite(experienceYears) || experienceYears < minimumExperienceYears)) {
        gaps.push({ type: 'experience', requirement: `${minimumExperienceYears} years`, reason: 'minimum experience not evidenced' });
        recommendations.push({ type: 'experience', requirement: `${minimumExperienceYears} years`, action: 'Document relevant projects and outcomes that demonstrate role readiness' });
    }
    if (targetRoles.length && currentTitle && !matches([currentTitle], targetRoles[0])) {
        gaps.push({ type: 'role', requirement: targetRoles[0], reason: 'target role alignment not evidenced' });
        recommendations.push({ type: 'role', requirement: targetRoles[0], action: 'Clarify transferable outcomes and role-relevant achievements' });
    }

    const totalChecks = requiredSkills.length + (Number.isFinite(minimumExperienceYears) && minimumExperienceYears > 0 ? 1 : 0) + (targetRoles.length && currentTitle ? 1 : 0);
    const readinessScore = totalChecks === 0 ? 0 : Math.round(((totalChecks - gaps.length) / totalChecks) * 100);
    const confidence = currentTitle && safeSkills.length && Number.isFinite(experienceYears) ? 'high' : (safeSkills.length || currentTitle ? 'medium' : 'low');
    return { policyVersion, readinessScore, confidence, gaps, recommendations };
}

module.exports = { CAREER_READINESS_POLICY_VERSION, diagnoseCareerReadiness };
