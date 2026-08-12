const { diagnoseCareerReadiness } = require('../../src/services/blinkfy/careerReadinessService');

const target = {
    requiredSkills: ['sql', 'salesforce', 'forecasting'],
    targetRoles: ['account executive'],
    minimumExperienceYears: 3,
};

test('returns deterministic, actionable gaps from controlled candidate data', () => {
    const result = diagnoseCareerReadiness({
        candidate: { profile: { skills: ['SQL'], experienceYears: 2, currentTitle: 'Sales Representative' } },
        target,
    });

    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore).toBeLessThanOrEqual(100);
    expect(result.gaps).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'skill', requirement: 'salesforce' }),
        expect.objectContaining({ type: 'experience' }),
    ]));
    expect(result.recommendations).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'skill', requirement: 'salesforce' }),
    ]));
    expect(diagnoseCareerReadiness({ candidate: { profile: { skills: ['SQL'], experienceYears: 2, currentTitle: 'Sales Representative' } }, target })).toEqual(result);
});

test('uses only explicit profile fields and never infers protected traits', () => {
    const result = diagnoseCareerReadiness({
        candidate: { profile: { skills: ['SQL'], age: 21, gender: 'woman', nationality: 'BR' } },
        target: { requiredSkills: ['SQL', 'gender'], targetRoles: [], minimumExperienceYears: 0 },
    });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain('gender');
    expect(serialized).not.toContain('nationality');
    expect(serialized).not.toContain('age');
    expect(result.gaps).toHaveLength(0);
});

test('handles empty or malformed input without making assumptions', () => {
    expect(diagnoseCareerReadiness({}).readinessScore).toBe(0);
    expect(diagnoseCareerReadiness({ candidate: { profile: { skills: 'sql' } }, target: { requiredSkills: ['sql'] } }).confidence).toBe('low');
});
