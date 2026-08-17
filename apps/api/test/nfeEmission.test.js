import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
    nfeEmission: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    invoice: {
        findUnique: vi.fn(),
    },
};

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => mockPrisma),
}));

describe('nfeProviderAdapter', () => {
    it('creates a registry with register, get, and providers methods', async () => {
        const { createNfeProviderRegistry } = await import('../src/services/blinkfy/nfeProviderAdapter.js');
        const registry = createNfeProviderRegistry();
        expect(typeof registry.register).toBe('function');
        expect(typeof registry.get).toBe('function');
        expect(typeof registry.providers).toBe('function');
        expect(registry.providers()).toEqual([]);
    });

    it('registers and retrieves a valid adapter', async () => {
        const { createNfeProviderRegistry } = await import('../src/services/blinkfy/nfeProviderAdapter.js');
        const registry = createNfeProviderRegistry();
        const adapter = { emitNfe: () => {}, queryNfe: () => {} };
        registry.register({ provider: 'focus_nfe', adapter });
        expect(registry.get('focus_nfe')).toBe(adapter);
        expect(registry.providers()).toEqual(['focus_nfe']);
    });

    it('throws for unsupported provider', async () => {
        const { createNfeProviderRegistry } = await import('../src/services/blinkfy/nfeProviderAdapter.js');
        const registry = createNfeProviderRegistry();
        expect(() => registry.register({ provider: 'e-notas', adapter: {} })).toThrow('Unsupported NF-e provider');
    });

    it('throws for adapter missing required methods', async () => {
        const { createNfeProviderRegistry } = await import('../src/services/blinkfy/nfeProviderAdapter.js');
        const registry = createNfeProviderRegistry();
        expect(() => registry.register({ provider: 'focus_nfe', adapter: {} })).toThrow('must implement');
        expect(() => registry.register({ provider: 'focus_nfe', adapter: { emitNfe: () => {} } })).toThrow('must implement');
    });

    it('throws when getting unregistered provider', async () => {
        const { createNfeProviderRegistry } = await import('../src/services/blinkfy/nfeProviderAdapter.js');
        const registry = createNfeProviderRegistry();
        expect(() => registry.get('focus_nfe')).toThrow('No NF-e adapter registered');
    });

    it('mock provider is supported', async () => {
        const { SUPPORTED_NFE_PROVIDERS } = await import('../src/services/blinkfy/nfeProviderAdapter.js');
        expect(SUPPORTED_NFE_PROVIDERS.has('focus_nfe')).toBe(true);
        expect(SUPPORTED_NFE_PROVIDERS.has('mock')).toBe(true);
    });
});

describe('cnaeRegistryService', () => {
    it('lists all CNAE codes', async () => {
        const { listCnaeCodes } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        const codes = listCnaeCodes();
        expect(codes.length).toBeGreaterThanOrEqual(5);
        codes.forEach((c) => {
            expect(c).toHaveProperty('code');
            expect(c).toHaveProperty('description');
            expect(c).toHaveProperty('issExempt');
            expect(c).toHaveProperty('suggestedRegime');
        });
    });

    it('gets CNAE by code', async () => {
        const { getCnaeByCode } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        const cnae = getCnaeByCode('6201-5/0');
        expect(cnae).not.toBeNull();
        expect(cnae.description).toContain('Desenvolvimento');
        expect(cnae.issExempt).toBe(true);
    });

    it('returns null for unknown CNAE code', async () => {
        const { getCnaeByCode } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        expect(getCnaeByCode('9999-9/9')).toBeNull();
    });

    it('suggests CNAE for software development', async () => {
        const { suggestCnae } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        const cnae = suggestCnae({ serviceType: 'software_custom_development', taxResidence: 'brazil' });
        expect(cnae).not.toBeNull();
        expect(cnae.code).toBe('6201-5/0');
    });

    it('suggests CNAE for consulting', async () => {
        const { suggestCnae } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        const cnae = suggestCnae({ serviceType: 'it consulting', taxResidence: 'brazil' });
        expect(cnae).not.toBeNull();
        expect(cnae.code).toBe('6202-3/0');
    });

    it('returns null for non-brazil tax residence', async () => {
        const { suggestCnae } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        expect(suggestCnae({ serviceType: 'software', taxResidence: 'argentina' })).toBeNull();
    });

    it('returns default CNAE', async () => {
        const { getDefaultCnae } = await import('../src/services/blinkfy/cnaeRegistryService.js');
        const cnae = getDefaultCnae();
        expect(cnae.code).toBe('6201-5/0');
        expect(cnae.issExempt).toBe(true);
    });
});

describe('nfeEmissionService', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('creates NF-e emission for a paid invoice', async () => {
        mockPrisma.invoice.findUnique.mockResolvedValue({
            id: 'inv1', status: 'paid', amountUsd: 1000, amountBrl: 5500, exchangeRate: 5.5, taxResidence: 'brazil',
        });
        mockPrisma.nfeEmission.findFirst.mockResolvedValue(null);
        mockPrisma.nfeEmission.create.mockResolvedValue({ id: 'nfe1', status: 'pending', cnaeCode: '6201-5/0' });

        const { createNfeEmission } = await import('../src/services/blinkfy/nfeEmissionService.js');
        const emission = await createNfeEmission({ prisma: mockPrisma, invoiceId: 'inv1', userId: 'user1' });
        expect(emission.id).toBe('nfe1');
        expect(mockPrisma.nfeEmission.create).toHaveBeenCalled();
    });

    it('rejects if invoice is not paid', async () => {
        mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'issued' });

        const { createNfeEmission } = await import('../src/services/blinkfy/nfeEmissionService.js');
        await expect(createNfeEmission({ prisma: mockPrisma, invoiceId: 'inv1', userId: 'user1' }))
            .rejects.toThrow('NF-e can only be emitted for paid invoices');
    });

    it('rejects if NF-e already exists for invoice', async () => {
        mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'paid' });
        mockPrisma.nfeEmission.findFirst.mockResolvedValue({ id: 'existing' });

        const { createNfeEmission } = await import('../src/services/blinkfy/nfeEmissionService.js');
        await expect(createNfeEmission({ prisma: mockPrisma, invoiceId: 'inv1', userId: 'user1' }))
            .rejects.toThrow('NF-e already emitted');
    });

    it('emits NF-e via provider', async () => {
        mockPrisma.nfeEmission.findUnique.mockResolvedValue({
            id: 'nfe1', status: 'pending', cnaeCode: '6201-5/0', amountUsd: 1000, amountBrl: 5500,
            exchangeRate: 5.5, taxResidence: 'brazil', taxRegime: 'simples_nacional', issExempt: true,
        });
        mockPrisma.nfeEmission.update.mockImplementation(async (args) => ({ id: 'nfe1', ...args.data }));

        const mockProvider = {
            emitNfe: vi.fn().mockResolvedValue({ providerNfeId: 'focus-1', status: 'authorized', nfeNumber: '12345', protocolNumber: '67890', nfeKey: 'key123' }),
            queryNfe: vi.fn(),
        };

        const { emitNfe } = await import('../src/services/blinkfy/nfeEmissionService.js');
        const result = await emitNfe({ prisma: mockPrisma, nfeProvider: mockProvider, emissionId: 'nfe1' });
        expect(result.status).toBe('authorized');
        expect(mockProvider.emitNfe).toHaveBeenCalled();
    });

    it('handles provider error during emission', async () => {
        mockPrisma.nfeEmission.findUnique.mockResolvedValue({
            id: 'nfe1', status: 'pending', cnaeCode: '6201-5/0', amountUsd: 1000, amountBrl: 5500,
            exchangeRate: 5.5, taxResidence: 'brazil',
        });
        mockPrisma.nfeEmission.update.mockImplementation(async (args) => ({ id: 'nfe1', ...args.data }));

        const mockProvider = {
            emitNfe: vi.fn().mockRejectedValue(new Error('API timeout')),
            queryNfe: vi.fn(),
        };

        const { emitNfe } = await import('../src/services/blinkfy/nfeEmissionService.js');
        await expect(emitNfe({ prisma: mockPrisma, nfeProvider: mockProvider, emissionId: 'nfe1' }))
            .rejects.toThrow('API timeout');
    });

    it('lists NF-e emissions', async () => {
        mockPrisma.nfeEmission.findMany.mockResolvedValue([
            { id: 'nfe1', status: 'authorized', cnaeCode: '6201-5/0', createdAt: new Date() },
        ]);

        const { listNfeEmissions } = await import('../src/services/blinkfy/nfeEmissionService.js');
        const results = await listNfeEmissions({ prisma: mockPrisma, userId: 'user1' });
        expect(results).toHaveLength(1);
    });

    it('gets NF-e summary', async () => {
        mockPrisma.nfeEmission.findMany.mockResolvedValue([
            { id: 'nfe1', status: 'authorized', amountUsd: 1000, amountBrl: 5500, cnaeCode: '6201-5/0', issExempt: true, nfeNumber: '12345', invoiceId: 'inv1', createdAt: new Date(), protocolNumber: '67890', authorizedAt: new Date(), emittedAt: new Date(), nfeKey: null },
            { id: 'nfe2', status: 'pending', amountUsd: 500, amountBrl: 2750, cnaeCode: '6202-3/0', issExempt: true, nfeNumber: null, invoiceId: 'inv2', createdAt: new Date(), protocolNumber: null, authorizedAt: null, emittedAt: null, nfeKey: null },
        ]);

        const { getNfeSummary } = await import('../src/services/blinkfy/nfeEmissionService.js');
        const summary = await getNfeSummary({ prisma: mockPrisma, userId: 'user1' });
        expect(summary.totalEmissions).toBe(2);
        expect(summary.authorized).toBe(1);
        expect(summary.pending).toBe(1);
        expect(summary.totalAmountBrl).toBe(5500);
    });
});

describe('focusNfeAdapter', () => {
    it('creates adapter with required methods', async () => {
        const { createFocusNfeAdapter } = await import('../src/services/blinkfy/focusNfeAdapter.js');
        const adapter = createFocusNfeAdapter({ apiUrl: 'https://api.test.com', apiToken: 'test-token' });
        expect(typeof adapter.emitNfe).toBe('function');
        expect(typeof adapter.queryNfe).toBe('function');
        expect(adapter.provider).toBe('focus_nfe');
    });

    it('throws if api token is missing during emit', async () => {
        const { createFocusNfeAdapter } = await import('../src/services/blinkfy/focusNfeAdapter.js');
        const adapter = createFocusNfeAdapter({ apiUrl: 'https://api.test.com', apiToken: '' });
        await expect(adapter.emitNfe({ nfeData: { ref: 'test', xml: {} } }))
            .rejects.toThrow('FOCUS_NFE_API_TOKEN is required');
    });

    it('throws if api token is missing during query', async () => {
        const { createFocusNfeAdapter } = await import('../src/services/blinkfy/focusNfeAdapter.js');
        const adapter = createFocusNfeAdapter({ apiUrl: 'https://api.test.com', apiToken: '' });
        await expect(adapter.queryNfe({ providerNfeId: 'test' }))
            .rejects.toThrow('FOCUS_NFE_API_TOKEN is required');
    });
});
