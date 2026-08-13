import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScreeningInvitations } from '../components/talent/ScreeningInvitations';
describe('candidate screening invitations', () => { it('makes opt-in explicit', () => { const markup = renderToStaticMarkup(<ScreeningInvitations />); expect(markup).toContain('You decide whether to opt in'); expect(markup).toContain('I consent to screening'); }); });
