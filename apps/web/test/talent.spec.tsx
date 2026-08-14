import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TalentProfileForm } from '../components/talent/TalentProfileForm';
import { VisibilityControl } from '../components/talent/VisibilityControl';
import { ConsentCenter } from '../components/talent/ConsentCenter';
import { CandidateGrowthPanel } from '../components/talent/CandidateGrowthPanel';

const profile = {
    id: 'candidate-1', userId: 'user-1', fullName: 'Ada Lovelace', visibility: 'private' as const,
    targetRole: 'Sales Engineer', headline: 'Technical seller', bio: 'Builds trusted partnerships', skills: ['SQL', 'Discovery'],
    location: 'Remote', workModel: 'remote', availability: 'open', portfolioUrl: 'https://example.com', updatedAt: '2026-08-11T00:00:00Z',
};

describe('Blinkfy Talent workspace', () => {
    it('explains that a new candidate profile is private by default', () => {
        expect(renderToStaticMarkup(<VisibilityControl visibility="private" onChange={() => {}} />)).toContain('Private');
        expect(renderToStaticMarkup(<VisibilityControl visibility="private" onChange={() => {}} />)).toContain('Only you can see your profile');
    });

    it('renders an editable profile with labeled fields and submit action', () => {
        const markup = renderToStaticMarkup(<TalentProfileForm profile={profile} onSaved={() => {}} />);
        expect(markup).toContain('Target role');
        expect(markup).toContain('Skills');
        expect(markup).toContain('Save profile');
        expect(markup).toContain('Technical seller');
    });

    it('requires an explicit confirmation before changing visibility', () => {
        const markup = renderToStaticMarkup(<VisibilityControl visibility="available" onChange={() => {}} />);
        expect(markup).toContain('Confirm visibility change');
    });

    it('renders consent summaries without evidence or private documents', () => {
        const markup = renderToStaticMarkup(<ConsentCenter initialItems={[{ id: 'consent-1', client: { id: 'client-1', name: 'Acme' }, purpose: 'client_presentation', status: 'active', grantedAt: '2026-08-10T00:00:00Z', revokedAt: null, createdAt: '2026-08-10T00:00:00Z' }]} />);
        expect(markup).toContain('Acme');
        expect(markup).toContain('Active');
        expect(markup).not.toContain('candidate email confirmation');
        expect(markup).not.toContain('private document');
    });

    it('renders an explicit empty consent state', () => {
        expect(renderToStaticMarkup(<ConsentCenter initialItems={[]} />)).toContain('No presentation consents yet');
    });

    it('makes candidate growth tools draft-only and shows positioning analytics', () => {
        const markup = renderToStaticMarkup(<CandidateGrowthPanel analytics={{
            profileCompleteness: { completed: 6, total: 8, percentage: 75, missing: ['bio', 'portfolioUrl'] },
            visibility: 'available', activeConsentCount: 2, discoverability: 'enabled', nextActions: ['complete_bio'],
        }} />);
        expect(markup).toContain('Candidate growth');
        expect(markup).toContain('75% complete');
        expect(markup).toContain('Create resume draft');
        expect(markup).toContain('Create engagement draft');
        expect(markup).toContain('Find relevant connections');
        expect(markup).toContain('Nothing is contacted or published automatically');
        expect(markup).toContain('View plan usage');
        expect(markup).toContain('View saved drafts');
        expect(markup).toContain('requires your approval');
    });
});
