import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SchedulingPolicyPanel } from '../components/hire/SchedulingPolicyPanel';
describe('SchedulingPolicyPanel', () => { it('states human approval guardrail', () => { expect(renderToStaticMarkup(<SchedulingPolicyPanel clientId="c1" />)).toContain('human approval'); }); });
