const { buildProfileDraft, ENTITLEMENT } = require('../../src/services/blinkfy/talentDraftService');
describe('candidate profile drafts', () => {
  test('creates concise headline and bio from candidate-owned data', () => {
    const result = buildProfileDraft({ currentTitle: 'Backend Engineer', skills: ['Node.js', 'Postgres'], location: 'São Paulo' });
    expect(result).toMatchObject({ headline: 'Backend Engineer | Node.js · Postgres | São Paulo', requiresApproval: true, entitlement: ENTITLEMENT });
    expect(result.bio).toContain('Backend Engineer');
  });
  test('uses safe defaults when profile is incomplete', () => { expect(buildProfileDraft()).toMatchObject({ headline: 'Professional', requiresApproval: true }); });
});
