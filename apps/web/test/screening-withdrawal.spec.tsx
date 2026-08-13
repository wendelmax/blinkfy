import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScreeningInvitations } from '../components/talent/ScreeningInvitations';
describe('candidate screening withdrawal', () => { it('explains that consent can be withdrawn', () => { expect(renderToStaticMarkup(<ScreeningInvitations />)).toContain('You can withdraw consent at any time.'); }); });
