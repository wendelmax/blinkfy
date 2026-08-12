const ENTITLEMENT = 'content.draft';

function buildProfileDraft(profile = {}) {
  const title = String(profile.currentTitle || profile.primaryStack || 'Professional').trim();
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(Boolean).slice(0, 5) : [];
  const location = String(profile.location || '').trim();
  const headline = [title, skills.length ? `| ${skills.join(' · ')}` : '', location ? `| ${location}` : ''].filter(Boolean).join(' ');
  const bio = `I am a ${title} focused on delivering measurable results${skills.length ? ` across ${skills.join(', ')}` : ''}.`;
  return { headline, bio, requiresApproval: true, entitlement: ENTITLEMENT };
}

module.exports = { ENTITLEMENT, buildProfileDraft };
