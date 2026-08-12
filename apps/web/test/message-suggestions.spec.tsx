import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MessageSuggestions } from '../components/hire/MessageSuggestions';

const fetchMock = vi.fn();
vi.mock('../lib/api', () => ({ apiFetch: (...args: unknown[]) => fetchMock(...args), ApiError: class ApiError extends Error {} }));

describe('MessageSuggestions', () => {
    it('creates and approves a human-reviewed draft', async () => {
        const markup = renderToStaticMarkup(<MessageSuggestions jobId="j1" applicationId="a1" candidateName="Ada" />);
        expect(markup).toContain('Review message drafts');
        expect(markup).toContain('Message suggestions for Ada');
    });
});
