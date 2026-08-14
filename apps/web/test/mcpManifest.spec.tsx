import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { McpManifestPanel } from '../components/hire/McpManifestPanel';

describe('McpManifestPanel', () => {
    it('communicates disabled, approval-gated MCP capabilities', () => {
        const markup = renderToStaticMarkup(<McpManifestPanel clientId="client-1" />);
        expect(markup).toContain('Load MCP manifest');
        expect(markup).toContain('no transmission occurs');
    });
});
