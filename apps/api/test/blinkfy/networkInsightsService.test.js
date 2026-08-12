const { recommendConnections } = require('../../src/services/blinkfy/networkInsightsService');

describe('network insights', () => {
  test('recommends role or skill matches and requires approval', () => {
    const result = recommendConnections({ targetRole: 'backend', skills: ['graphql'], connections: [{ id: '1', name: 'A', role: 'Senior Backend Engineer', skills: [] }, { id: '2', name: 'B', role: 'Designer', skills: ['graphql'] }] });
    expect(result).toMatchObject([{ id: '1', requiresApproval: true }, { id: '2', requiresApproval: true }]);
  });
  test('limits recommendations and omits extra profile data', () => {
    const connections = Array.from({ length: 25 }, (_, index) => ({ id: String(index), name: `N${index}`, role: 'Backend', email: 'private@example.test' }));
    const result = recommendConnections({ targetRole: 'backend', connections });
    expect(result).toHaveLength(20);
    expect(result[0]).not.toHaveProperty('email');
  });
});
