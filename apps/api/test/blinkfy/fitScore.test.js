const { computeFitScore } = require('../../src/services/blinkfy/fitScoreService');

const fixtureJob = {
    title: 'Account Executive',
    requirements: ['enterprise sales', 'crm fluency', 'fintech context'],
    scorecard: {
        skills: 35,
        experience: 25,
        context: 15,
        preferences: 15,
        signals: 10,
    },
};

const fixtureCandidate = {
    normalizedEmail: 'sam@example.test',
    profile: {
        currentTitle: 'Enterprise Account Executive',
        skills: ['enterprise sales', 'crm fluency'],
        experienceYears: 5,
    },
};

test('returns documented factor evidence, gaps and medium confidence for a partially complete profile', () => {
    const result = computeFitScore({ job: fixtureJob, candidate: fixtureCandidate });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factors).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'skills', weight: 35, score: expect.any(Number) }),
    ]));
    expect(result.gaps).toContain('fintech context not evidenced');
    expect(result.confidence).toBe('medium');
});

test('is deterministic and does not expose protected traits as score factors', () => {
    const first = computeFitScore({ job: fixtureJob, candidate: fixtureCandidate });
    const second = computeFitScore({ job: fixtureJob, candidate: fixtureCandidate });

    expect(second).toEqual(first);
    expect(first.factors.map((factor) => factor.key)).not.toEqual(expect.arrayContaining([
        'age', 'gender', 'race', 'ethnicity', 'nationality', 'disability', 'religion',
    ]));
});

test('ignores protected-trait requirements even when they are present in malformed job data', () => {
    const result = computeFitScore({
        job: { ...fixtureJob, requirements: [...fixtureJob.requirements, 'gender'] },
        candidate: { ...fixtureCandidate, profile: { ...fixtureCandidate.profile, gender: 'woman' } },
    });

    expect(JSON.stringify(result)).not.toMatch(/gender/i);
});
