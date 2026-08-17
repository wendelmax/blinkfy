import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
    placement: { findUnique: vi.fn(), update: vi.fn() },
    escrowHold: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    invoice: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    platformFee: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
};

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => mockPrisma),
}));

import * as escrowService from '../src/services/blinkfy/escrowService';
import * as invoiceService from '../src/services/blinkfy/invoiceService';
import * as platformFeeService from '../src/services/blinkfy/platformFeeService';

beforeEach(() => {
    vi.clearAllMocks();
    escrowService.setPrisma(mockPrisma);
    invoiceService.setPrisma(mockPrisma);
    platformFeeService.setPrisma(mockPrisma);
});

describe('escrowService', () => {
    describe('createEscrowHold', () => {
        it('creates a hold with correct release date for success_fee', async () => {
            mockPrisma.placement.findUnique.mockResolvedValue({ id: 'p1', successFeeUsd: 1000 });
            mockPrisma.escrowHold.create.mockResolvedValue({ id: 'h1', placementId: 'p1', amountUsd: 1000, holdReason: 'success_fee' });

            const hold = await escrowService.createEscrowHold({ placementId: 'p1', amountUsd: 1000, holdReason: 'success_fee' });

            expect(mockPrisma.escrowHold.create).toHaveBeenCalledOnce();
            const createArg = mockPrisma.escrowHold.create.mock.calls[0][0].data;
            expect(createArg.amountUsd).toBe(1000);
            expect(createArg.holdReason).toBe('success_fee');
            expect(createArg.releaseAt).toBeInstanceOf(Date);
        });

        it('creates a hold with 90-day release for retention_bonus', async () => {
            mockPrisma.placement.findUnique.mockResolvedValue({ id: 'p2', retentionBonusUsd: 500 });
            mockPrisma.escrowHold.create.mockResolvedValue({ id: 'h2', holdReason: 'retention_bonus' });

            await escrowService.createEscrowHold({ placementId: 'p2', amountUsd: 500, holdReason: 'retention_bonus' });

            const createArg = mockPrisma.escrowHold.create.mock.calls[0][0].data;
            const diffDays = (createArg.releaseAt - Date.now()) / (24 * 60 * 60 * 1000);
            expect(Math.round(diffDays)).toBe(90);
        });

        it('throws on missing placement', async () => {
            mockPrisma.placement.findUnique.mockResolvedValue(null);
            await expect(escrowService.createEscrowHold({ placementId: 'bad', amountUsd: 100 }))
                .rejects.toThrow('Placement not found');
        });

        it('throws on zero amount', async () => {
            await expect(escrowService.createEscrowHold({ placementId: 'p1', amountUsd: 0 }))
                .rejects.toThrow('amountUsd must be positive');
        });

        it('throws on negative amount', async () => {
            await expect(escrowService.createEscrowHold({ placementId: 'p1', amountUsd: -100 }))
                .rejects.toThrow('amountUsd must be positive');
        });
    });

    describe('releaseEscrowHold', () => {
        it('releases a held escrow and marks placement success_fee_released', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue({
                id: 'h1', status: 'held', holdReason: 'success_fee',
                placementId: 'p1', releaseAt: new Date(Date.now() - 1000),
            });
            mockPrisma.escrowHold.update.mockResolvedValue({ id: 'h1', status: 'released' });
            mockPrisma.placement.update.mockResolvedValue({});

            const result = await escrowService.releaseEscrowHold('h1');

            expect(result.status).toBe('released');
            expect(mockPrisma.placement.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: { successFeeReleased: true },
            });
        });

        it('releases retention_bonus and marks placement retentionReleased', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue({
                id: 'h2', status: 'held', holdReason: 'retention_bonus',
                placementId: 'p2', releaseAt: new Date(Date.now() - 1000),
            });
            mockPrisma.escrowHold.update.mockResolvedValue({ id: 'h2', status: 'released' });
            mockPrisma.placement.update.mockResolvedValue({});

            await escrowService.releaseEscrowHold('h2');

            expect(mockPrisma.placement.update).toHaveBeenCalledWith({
                where: { id: 'p2' },
                data: { retentionReleased: true },
            });
        });

        it('throws if hold is not held', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue({ id: 'h1', status: 'released' });
            await expect(escrowService.releaseEscrowHold('h1'))
                .rejects.toThrow('Cannot release hold in status: released');
        });

        it('throws if hold not found', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue(null);
            await expect(escrowService.releaseEscrowHold('nonexistent'))
                .rejects.toThrow('Escrow hold not found');
        });

        it('throws if release date not reached', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue({
                id: 'h1', status: 'held',
                releaseAt: new Date(Date.now() + 86400000),
            });
            await expect(escrowService.releaseEscrowHold('h1'))
                .rejects.toThrow('Hold has not reached its release date yet');
        });
    });

    describe('forfeitEscrowHold', () => {
        it('forfeits a held escrow', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue({ id: 'h1', status: 'held' });
            mockPrisma.escrowHold.update.mockResolvedValue({ id: 'h1', status: 'forfeited' });

            const result = await escrowService.forfeitEscrowHold('h1');
            expect(result.status).toBe('forfeited');
        });

        it('throws if not held', async () => {
            mockPrisma.escrowHold.findUnique.mockResolvedValue({ id: 'h1', status: 'released' });
            await expect(escrowService.forfeitEscrowHold('h1'))
                .rejects.toThrow('Cannot forfeit hold in status: released');
        });
    });

    describe('getEscrowSummary', () => {
        it('returns zero summary when no holds exist', async () => {
            mockPrisma.escrowHold.findMany.mockResolvedValue([]);

            const summary = await escrowService.getEscrowSummary('user1');

            expect(summary.totalHeldUsd).toBe(0);
            expect(summary.holdCount).toBe(0);
            expect(summary.holds).toEqual([]);
        });

        it('calculates total held and next release', async () => {
            mockPrisma.escrowHold.findMany.mockResolvedValue([
                { id: 'h1', amountUsd: 1000, status: 'held', holdReason: 'success_fee', releaseAt: new Date(Date.now() + 86400000) },
                { id: 'h2', amountUsd: 500, status: 'held', holdReason: 'retention_bonus', releaseAt: new Date(Date.now() + 86400000 * 60) },
                { id: 'h3', amountUsd: 200, status: 'released', holdReason: 'success_fee', releaseAt: new Date(Date.now() - 1000) },
            ]);

            const summary = await escrowService.getEscrowSummary('user1');

            expect(summary.totalHeldUsd).toBe(1500);
            expect(summary.holdCount).toBe(2);
        });
    });

    describe('processEligibleReleases', () => {
        it('releases all eligible holds', async () => {
            mockPrisma.escrowHold.findMany.mockResolvedValue([
                { id: 'h1', status: 'held', holdReason: 'success_fee', placementId: 'p1', releaseAt: new Date(Date.now() - 1000), amountUsd: 100 },
            ]);
            mockPrisma.escrowHold.findUnique.mockResolvedValue({
                id: 'h1', status: 'held', holdReason: 'success_fee', placementId: 'p1', releaseAt: new Date(Date.now() - 1000),
            });
            mockPrisma.escrowHold.update.mockResolvedValue({ id: 'h1', status: 'released' });
            mockPrisma.placement.update.mockResolvedValue({});

            const released = await escrowService.processEligibleReleases();
            expect(released).toHaveLength(1);
        });

        it('returns empty when no eligible holds', async () => {
            mockPrisma.escrowHold.findMany.mockResolvedValue([]);
            const released = await escrowService.processEligibleReleases();
            expect(released).toHaveLength(0);
        });
    });

    describe('listEscrowHolds', () => {
        it('returns holds with filters', async () => {
            mockPrisma.escrowHold.findMany.mockResolvedValue([{ id: 'h1', status: 'held' }]);
            const holds = await escrowService.listEscrowHolds({ status: 'held' });
            expect(holds).toHaveLength(1);
            expect(mockPrisma.escrowHold.findMany).toHaveBeenCalledOnce();
        });
    });
});

describe('invoiceService', () => {
    describe('createInvoice', () => {
        it('creates an invoice with generated number and CNAE', async () => {
            mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1' });

            await invoiceService.createInvoice({ userId: 'u1', amountUsd: 5000 });

            const data = mockPrisma.invoice.create.mock.calls[0][0].data;
            expect(data.amountUsd).toBe(5000);
            expect(data.status).toBe('draft');
            expect(data.invoiceNumber).toMatch(/^BF-\d{6}-\d{5}$/);
            expect(data.cnaeCode).toBe('6201-5/0');
        });

        it('throws on zero amount', async () => {
            await expect(invoiceService.createInvoice({ userId: 'u1', amountUsd: 0 }))
                .rejects.toThrow('amountUsd must be positive');
        });

        it('throws on missing userId', async () => {
            await expect(invoiceService.createInvoice({ amountUsd: 100 }))
                .rejects.toThrow('userId is required');
        });

        it('allows custom CNAE code', async () => {
            mockPrisma.invoice.create.mockResolvedValue({ id: 'inv2' });
            await invoiceService.createInvoice({ userId: 'u1', amountUsd: 3000, cnaeCode: '6202-3/0' });
            const data = mockPrisma.invoice.create.mock.calls[0][0].data;
            expect(data.cnaeCode).toBe('6202-3/0');
        });
    });

    describe('issueInvoice', () => {
        it('issues a draft invoice', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'draft' });
            mockPrisma.invoice.update.mockResolvedValue({ id: 'inv1', status: 'issued' });

            const inv = await invoiceService.issueInvoice('inv1');
            expect(inv.status).toBe('issued');
            expect(mockPrisma.invoice.update.mock.calls[0][0].data.issuedAt).toBeInstanceOf(Date);
        });

        it('throws if not draft', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'paid' });
            await expect(invoiceService.issueInvoice('inv1'))
                .rejects.toThrow('Cannot issue invoice in status: paid');
        });

        it('throws if not found', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue(null);
            await expect(invoiceService.issueInvoice('bad'))
                .rejects.toThrow('Invoice not found');
        });
    });

    describe('markInvoicePaid', () => {
        it('marks an issued invoice as paid', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'issued' });
            mockPrisma.invoice.update.mockResolvedValue({ id: 'inv1', status: 'paid' });

            const inv = await invoiceService.markInvoicePaid('inv1');
            expect(inv.status).toBe('paid');
        });

        it('throws if not issued', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'draft' });
            await expect(invoiceService.markInvoicePaid('inv1'))
                .rejects.toThrow('Cannot mark paid invoice in status: draft');
        });
    });

    describe('voidInvoice', () => {
        it('voids a draft invoice', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'draft' });
            mockPrisma.invoice.update.mockResolvedValue({ id: 'inv1', status: 'void' });

            const inv = await invoiceService.voidInvoice('inv1');
            expect(inv.status).toBe('void');
        });

        it('throws if paid', async () => {
            mockPrisma.invoice.findUnique.mockResolvedValue({ id: 'inv1', status: 'paid' });
            await expect(invoiceService.voidInvoice('inv1'))
                .rejects.toThrow('Cannot void a paid invoice');
        });
    });

    describe('getInvoiceSummary', () => {
        it('returns zero summary when no invoices', async () => {
            mockPrisma.invoice.findMany.mockResolvedValue([]);
            const summary = await invoiceService.getInvoiceSummary('u1');
            expect(summary.totalIssued).toBe(0);
            expect(summary.invoiceCount).toBe(0);
        });

        it('calculates totals correctly', async () => {
            mockPrisma.invoice.findMany.mockResolvedValue([
                { amountUsd: 1000, status: 'paid', createdAt: new Date() },
                { amountUsd: 2000, status: 'issued', createdAt: new Date() },
                { amountUsd: 500, status: 'draft', createdAt: new Date() },
            ]);
            const summary = await invoiceService.getInvoiceSummary('u1');
            expect(summary.totalPaid).toBe(1000);
            expect(summary.totalPending).toBe(2000);
            expect(summary.totalIssued).toBe(3000);
        });
    });
});

describe('platformFeeService', () => {
    describe('calculateFeeAmount', () => {
        it('calculates 20% success fee correctly', () => {
            expect(platformFeeService.calculateFeeAmount(10000, 2000)).toBe(2000);
        });

        it('calculates 2% retention fee correctly', () => {
            expect(platformFeeService.calculateFeeAmount(5000, 200)).toBe(100);
        });

        it('calculates 5% tax bridge correctly', () => {
            expect(platformFeeService.calculateFeeAmount(3000, 500)).toBe(150);
        });

        it('handles small amounts without floating point errors', () => {
            const result = platformFeeService.calculateFeeAmount(3333, 2000);
            expect(result).toBeCloseTo(666.6, 1);
        });
    });

    describe('calculateAllFeesForPlacement', () => {
        it('calculates both success and retention fees', async () => {
            const fees = await platformFeeService.calculateAllFeesForPlacement({
                successFeeUsd: 10000,
                retentionBonusUsd: 5000,
            });
            expect(fees).toHaveLength(2);
            expect(fees[0].feeType).toBe('success_fee');
            expect(fees[0].amountUsd).toBe(2000);
            expect(fees[1].feeType).toBe('retention_mgmt');
            expect(fees[1].amountUsd).toBe(100);
        });

        it('returns only success fee when no retention', async () => {
            const fees = await platformFeeService.calculateAllFeesForPlacement({
                successFeeUsd: 10000,
                retentionBonusUsd: 0,
            });
            expect(fees).toHaveLength(1);
        });

        it('returns empty when no fees', async () => {
            const fees = await platformFeeService.calculateAllFeesForPlacement({
                successFeeUsd: 0,
                retentionBonusUsd: 0,
            });
            expect(fees).toHaveLength(0);
        });
    });

    describe('createPlatformFee', () => {
        it('creates a fee record', async () => {
            mockPrisma.platformFee.create.mockResolvedValue({ id: 'f1' });
            const fee = await platformFeeService.createPlatformFee({
                placementId: 'p1',
                feeType: 'success_fee',
                amountUsd: 2000,
            });
            expect(mockPrisma.platformFee.create).toHaveBeenCalledOnce();
        });
    });
});
