function buildResumeDraft({ profile = {}, targetRole = '' } = {}) {
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean).slice(0, 12) : [];
  return {
    targetRole: String(targetRole || profile.currentTitle || '').trim(),
    headline: String(profile.currentTitle || '').trim(),
    summary: String(profile.summary || profile.bio || '').trim(),
    skills,
    requiresApproval: true,
    published: false,
  };
}

module.exports = { buildResumeDraft };
