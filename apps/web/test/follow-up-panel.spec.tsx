import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FollowUpPanel } from '../components/hire/FollowUpPanel';
describe('FollowUpPanel', () => { it('renders approval and interruption guardrails', () => { const markup = renderToStaticMarkup(<FollowUpPanel jobId="j1" applicationId="a1" />); expect(markup).toContain('Assisted follow-up'); expect(markup).toContain('requires approval'); }); });
