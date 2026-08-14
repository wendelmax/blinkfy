import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { McpToolPreviewPanel } from '../components/hire/McpToolPreviewPanel';

describe('McpToolPreviewPanel', () => {
    it('communicates preview-only execution guardrails', () => {
        const markup = renderToStaticMarkup(<McpToolPreviewPanel clientId="client-1" />);
        expect(markup).toContain('Preview MCP call');
        expect(markup).toContain('no tool is executed or transmitted');
    });
});
