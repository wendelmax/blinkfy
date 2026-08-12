const { buildResumeDraft } = require('../../src/services/blinkfy/talentResumeDraftService');

describe('talent resume draft', () => {
  test('builds a concise draft and requires approval', () => {
    expect(buildResumeDraft({ targetRole: 'Backend Engineer', profile: { currentTitle: 'Node Engineer', summary: 'Builds APIs', skills: ['Node.js', 'Postgres'] } })).toMatchObject({ targetRole: 'Backend Engineer', headline: 'Node Engineer', summary: 'Builds APIs', skills: ['Node.js', 'Postgres'], requiresApproval: true, published: false });
  });
  test('limits skills and never marks a draft published', () => {
    expect(buildResumeDraft({ profile: { skills: Array.from({ length: 20 }, (_, i) => `skill-${i}`) } }).skills).toHaveLength(12);
    expect(buildResumeDraft({ profile: {} }).published).toBe(false);
  });
});
