import { describe, it, expect, beforeEach, vi } from 'vitest';
const { setPrisma } = require('../src/services/blinkfy/integrationService');
const { createIntegrationController } = require('../src/controllers/integrationController');
const { createAdapter, getSupportedProviders } = require('../src/services/blinkfy/adapters/adapterRegistry');
const { IntegrationAdapter, RateLimiter } = require('../src/services/blinkfy/adapters/baseAdapter');
const { CalendarAdapter } = require('../src/services/blinkfy/adapters/calendarAdapter');
const { AtsAdapter } = require('../src/services/blinkfy/adapters/atsAdapter');
const { McpAdapter } = require('../src/services/blinkfy/adapters/mcpAdapter');

function mockRes() {
    const res = { status: vi.fn(() => res), json: vi.fn(() => res), end: vi.fn(() => res) };
    return res;
}

describe('Integration Adapters', () => {
    describe('RateLimiter', () => {
        it('allows requests within rate limit', async () => {
            const limiter = new RateLimiter(5);
            await limiter.acquire();
            await limiter.acquire();
            // should not throw
        });

        it('throws when rate limit exceeded', async () => {
            const limiter = new RateLimiter(2);
            await limiter.acquire();
            await limiter.acquire();
            await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded');
        });
    });

    describe('Adapter Registry', () => {
        it('lists supported providers', () => {
            const providers = getSupportedProviders();
            expect(providers.length).toBeGreaterThanOrEqual(5);
            expect(providers.some(p => p.provider === 'google_calendar')).toBe(true);
            expect(providers.some(p => p.provider === 'greenhouse')).toBe(true);
            expect(providers.some(p => p.provider === 'mcp')).toBe(true);
        });

        it('creates adapter by provider name', () => {
            const adapter = createAdapter('google_calendar');
            expect(adapter).toBeInstanceOf(CalendarAdapter);
        });

        it('throws for unknown provider', () => {
            expect(() => createAdapter('unknown_provider')).toThrow('Unknown integration provider');
        });
    });

    describe('CalendarAdapter', () => {
        it('sends calendar invite', async () => {
            const adapter = new CalendarAdapter();
            const result = await adapter.executeAction('send_calendar_invite', {
                title: 'Interview',
                startTime: '2026-08-20T10:00:00Z',
                endTime: '2026-08-20T11:00:00Z',
                attendees: ['hr@company.com'],
            });
            expect(result.status).toBe('confirmed');
            expect(result.eventId).toBeDefined();
        });

        it('cancels event', async () => {
            const adapter = new CalendarAdapter();
            const result = await adapter.executeAction('cancel_event', { eventId: 'gcal_123' });
            expect(result.status).toBe('cancelled');
        });
    });

    describe('AtsAdapter', () => {
        it('exports candidate', async () => {
            const adapter = new AtsAdapter({ provider: 'greenhouse' });
            const result = await adapter.executeAction('export_candidate', {
                candidateData: { name: 'John', email: 'john@test.com' },
                jobId: 'job_1',
            });
            expect(result.status).toBe('created');
            expect(result.provider).toBe('greenhouse');
        });

        it('creates candidate', async () => {
            const adapter = new AtsAdapter();
            const result = await adapter.executeAction('create_candidate', {
                name: 'Jane',
                email: 'jane@test.com',
            });
            expect(result.status).toBe('prospect');
        });
    });

    describe('McpAdapter', () => {
        it('executes MCP tool', async () => {
            const adapter = new McpAdapter();
            const result = await adapter.executeAction('execute_mcp_tool', {
                toolName: 'search_candidates',
                arguments: { query: 'react' },
            });
            expect(result.status).toBe('completed');
            expect(result.toolName).toBe('search_candidates');
        });

        it('gets manifest', async () => {
            const adapter = new McpAdapter();
            const result = await adapter.executeAction('get_mcp_manifest', {});
            expect(result.name).toBe('blinkfy_mcp');
            expect(result.capabilities.tools).toBe(true);
        });
    });

    describe('IntegrationController', () => {
        let mockPrisma;
        let controller;

        beforeEach(() => {
            mockPrisma = {
                integrationConfig: {
                    findMany: vi.fn().mockResolvedValue([]),
                    findUnique: vi.fn(),
                    create: vi.fn(),
                    update: vi.fn(),
                    delete: vi.fn(),
                },
                integrationExecution: {
                    findMany: vi.fn().mockResolvedValue([]),
                    findUnique: vi.fn(),
                    create: vi.fn(),
                    update: vi.fn(),
                },
            };
            setPrisma(mockPrisma);
            controller = createIntegrationController({ prisma: mockPrisma });
        });

        it('lists configs', async () => {
            const req = { user: { id: 'u_1' }, workspace: { id: 'w_1' }, query: {} };
            const res = mockRes();
            await controller.listConfigs(req, res);
            expect(res.json).toHaveBeenCalledWith({ items: [] });
        });

        it('creates config', async () => {
            const config = { id: 'ic_1', provider: 'google_calendar', category: 'calendar', status: 'inactive' };
            mockPrisma.integrationConfig.create.mockResolvedValue(config);

            const req = { user: { id: 'u_1' }, workspace: { id: 'w_1' }, body: { provider: 'google_calendar', category: 'calendar' } };
            const res = mockRes();
            await controller.createConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('returns 500 for unknown provider', async () => {
            const req = { user: { id: 'u_1' }, workspace: { id: 'w_1' }, body: { provider: 'fake', category: 'calendar' } };
            const res = mockRes();
            await controller.createConfig(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('lists providers', async () => {
            const req = {};
            const res = mockRes();
            await controller.listProviders(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                items: expect.arrayContaining([
                    expect.objectContaining({ provider: 'google_calendar' }),
                ]),
            }));
        });
    });
});
