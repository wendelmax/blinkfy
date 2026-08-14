const { buildTalentPlanCatalog } = require('../../src/services/blinkfy/talentPlanCatalogService');

describe('Talent plan catalog', () => {
    it('describes Free and Pro limits without billing credentials', () => {
        const result = buildTalentPlanCatalog({ plan: 'free' });
        expect(result.currentPlan).toBe('free');
        expect(result.plans).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'free', limits: expect.objectContaining({ 'content.draft': 2 }) }),
            expect.objectContaining({ id: 'pro', limits: expect.objectContaining({ 'content.draft': 50 }) }),
        ]));
        expect(JSON.stringify(result)).not.toContain('secret');
    });
});
