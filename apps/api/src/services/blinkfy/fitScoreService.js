const factorKeys = ['skills', 'experience', 'context', 'preferences', 'signals'];
const FIT_SCORE_POLICY_VERSION = 'fit-score-v1';
const protectedTraitPattern = /\b(age|idade|edad|gender|genero|género|sexo|sex|race|raca|raça|raza|ethnicity|etnia|nationality|nacionalidade|nacionalidad|national origin|origem nacional|disability|deficiencia|deficiência|discapacidad|religion|religiao|religião|faith|creed|pregnan\w*|gravidez|embarazo|marital status|estado civil|orientacao sexual|orientação sexual|sexual orientation|identidade de genero|identidade de gênero|gender identity|lgbtq?\+?|transgender|transgenero|transgênero|skin color|cor da pele|genetic information|informacao genetica|informação genética|veteran status|veterano|veterana|caste|casta|medical condition|condicao medica|condição médica|neurodiverg\w*|political affiliation|afiliacao politica|afiliação política)\b/i;

function normalizedList(value) {
    return Array.isArray(value)
        ? value.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
        : [];
}

function normalizedText(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizedRequirement(value) {
    return normalizedText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isProtectedRequirement(requirement) {
    return protectedTraitPattern.test(normalizedRequirement(requirement));
}

function includesRequirement(values, requirement) {
    return values.some((value) => value.includes(requirement) || requirement.includes(value));
}

function isContextRequirement(requirement) {
    return /\b(context|industry|sector|fintech|saas|healthcare|health care)\b/i.test(requirement);
}

function factor(key, weight, score, evidence) {
    return { key, weight, score: Math.max(0, Math.min(1, score)), evidence };
}

function computeFitScore({ job, candidate }) {
    const profile = candidate?.profile && typeof candidate.profile === 'object' ? candidate.profile : {};
    const requirements = normalizedList(job?.requirements).filter((requirement) => !isProtectedRequirement(requirement));
    const skills = normalizedList(profile.skills);
    const title = normalizedText(profile.currentTitle);
    const jobTitle = normalizedText(job?.title);
    const candidateContext = normalizedList(profile.contexts || profile.industries || profile.sectors);
    const preferenceTerms = [normalizedText(profile.location), normalizedText(profile.workModel), normalizedText(profile.employmentPreference)].filter(Boolean);
    const requiredSkills = requirements.filter((requirement) => !isContextRequirement(requirement));
    const requiredContext = requirements.filter(isContextRequirement);
    const matchedSkills = requiredSkills.filter((requirement) => includesRequirement(skills, requirement));
    const matchedContext = requiredContext.filter((requirement) => includesRequirement([...candidateContext, ...skills], requirement));
    const experienceYears = Number(profile.experienceYears);
    const availability = normalizedText(profile.availability);
    const weights = job?.scorecard || {};
    const policyVersion = weights.policyVersion || FIT_SCORE_POLICY_VERSION;
    const gaps = [
        ...requiredSkills.filter((requirement) => !matchedSkills.includes(requirement)).map((requirement) => `${requirement} not evidenced`),
        ...requiredContext.filter((requirement) => !matchedContext.includes(requirement)).map((requirement) => `${requirement} not evidenced`),
    ];

    const factors = [
        factor('skills', Number(weights.skills) || 0, requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0, matchedSkills),
        factor('experience', Number(weights.experience) || 0, Number.isFinite(experienceYears) && experienceYears > 0 ? 1 : 0, Number.isFinite(experienceYears) && experienceYears > 0 ? [`${experienceYears} years evidenced`] : []),
        factor('context', Number(weights.context) || 0, requiredContext.length ? matchedContext.length / requiredContext.length : 0, matchedContext),
        factor('preferences', Number(weights.preferences) || 0, preferenceTerms.length > 0 ? 1 : 0, preferenceTerms),
        factor('signals', Number(weights.signals) || 0, title && jobTitle && (title.includes(jobTitle) || jobTitle.includes(title)) ? 1 : 0, title ? [profile.currentTitle] : []),
    ];
    const score = Math.round(factors.reduce((total, current) => total + (current.weight * current.score), 0));
    const hasCoreProfile = Boolean(normalizedText(candidate?.normalizedEmail) && title && skills.length > 0);
    const confidence = hasCoreProfile && availability
        ? 'high'
        : (title && skills.length > 0 ? 'medium' : 'low');

    return { policyVersion, score: Math.max(0, Math.min(100, score)), confidence, factors, gaps };
}

module.exports = { FIT_SCORE_POLICY_VERSION, computeFitScore, factorKeys, isProtectedRequirement };
