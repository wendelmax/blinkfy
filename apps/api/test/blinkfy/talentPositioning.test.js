import { describe, expect, test } from 'vitest';
import { calculateProfileCompleteness } from '../../src/services/blinkfy/talentPositioningService.js';

describe('calculateProfileCompleteness', () => {
    test('scores the candidate profile using discoverability fields', () => {
        const result = calculateProfileCompleteness({
            targetRole: 'Account Executive',
            headline: 'Enterprise seller',
            bio: 'B2B sales leader',
            skills: ['negotiation', 'prospecting'],
            location: 'São Paulo',
            workModel: 'remote',
            availability: '30 days',
            portfolioUrl: 'https://example.test/portfolio',
        });

        expect(result).toEqual({ completed: 8, total: 8, percentage: 100, missing: [] });
    });

    test('returns actionable missing fields without exposing private data', () => {
        const result = calculateProfileCompleteness({ visibility: 'private', skills: [] });

        expect(result).toEqual(expect.objectContaining({ completed: 0, total: 8, percentage: 0 }));
        expect(result.missing).toContain('targetRole');
        expect(JSON.stringify(result)).not.toContain('email');
    });
});
