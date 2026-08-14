import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { McpAuditPanel } from '../components/hire/McpAuditPanel';
describe('McpAuditPanel', () => { it('communicates non-sensitive audit state', () => { const markup = renderToStaticMarkup(<McpAuditPanel clientId="client-1" />); expect(markup).toContain('Load MCP audit'); expect(markup).toContain('arguments are never exposed'); }); });
