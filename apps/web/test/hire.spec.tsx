import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JobForm, jobErrorMessage } from '../components/hire/JobForm';
import { FitScoreCard } from '../components/hire/FitScoreCard';

const fixtureScore = {
    score: 68,
    confidence: 'medium' as const,
    factors: [
        { key: 'skills' as const, weight: 35, score: 1, evidence: ['Enterprise sales'] },
        { key: 'context' as const, weight: 15, score: 0, evidence: [] },
    ],
    gaps: ['fintech context not evidenced'],
};

describe('Blinkfy Hire UI', () => {
    it('preserves a server-side validation message instead of hiding it behind a generic error', () => {
        expect(jobErrorMessage({ status: 422, message: 'Add at least one requirement' })).toBe('Add at least one requirement');
        expect(renderToStaticMarkup(<JobForm clientId="client_1" />)).toContain('Job title');
    });

    it('renders evidence, gaps and confidence instead of only a numeric score', () => {
        const markup = renderToStaticMarkup(<FitScoreCard score={fixtureScore} />);

        expect(markup).toContain('Enterprise sales');
        expect(markup).toContain('fintech context not evidenced');
        expect(markup).toContain('Medium confidence');
    });
});
