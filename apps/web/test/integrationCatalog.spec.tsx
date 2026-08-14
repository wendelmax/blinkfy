import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { IntegrationCatalogPanel } from '../components/hire/IntegrationCatalogPanel';

describe('IntegrationCatalogPanel', () => {
    it('communicates safe discovery-only integration state', () => {
        const markup = renderToStaticMarkup(<IntegrationCatalogPanel clientId="client-1" />);
        expect(markup).toContain('Load integration catalog');
        expect(markup).toContain('No external transmission occurs');
    });
});
