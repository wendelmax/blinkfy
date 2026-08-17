import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
    walletTransaction: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    candidateProfile: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
};

vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => mockPrisma),
}));

describe('proofOfIncomeService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        import('../src/services/blinkfy/proofOfIncomeService.js').then((m) => m.setPrisma(mockPrisma));
    });

    it('consolidates income history for 6m period', async () => {
        mockPrisma.walletTransaction.findMany.mockResolvedValue([
            { id: 't1', type: 'invoice', amountUsd: 1000, amountBrl: 5500, description: 'Dev work', createdAt: new Date('2026-06-01') },
            { id: 't2', type: 'withdrawal', amountUsd: 500, amountBrl: null, description: 'Withdrawal', createdAt: new Date('2026-06-15') },
        ]);
        mockPrisma.invoice.findMany.mockResolvedValue([
            { id: 'i1', invoiceNumber: 'BF-202606-00001', amountUsd: 1000, amountBrl: 5500, cnaeCode: '6201-5/0', status: 'paid', createdAt: new Date('2026-06-01') },
        ]);
        mockPrisma.candidateProfile.findUnique.mockResolvedValue({ taxResidence: 'brazil' });
        mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'John Doe', email: 'john@test.com' });

        const { getIncomeHistory } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        const history = await getIncomeHistory({ userId: 'user1', period: '6m' });

        expect(history.candidate.name).toBe('John Doe');
        expect(history.period.months).toBe(6);
        expect(history.summary.totalIncomeUsd).toBe(1000);
        expect(history.summary.totalWithdrawalsUsd).toBe(500);
        expect(history.summary.netIncomeUsd).toBe(500);
        expect(history.summary.transactionCount).toBe(2);
        expect(history.summary.invoiceCount).toBe(1);
    });

    it('consolidates income for 3m period', async () => {
        mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
        mockPrisma.invoice.findMany.mockResolvedValue([]);
        mockPrisma.candidateProfile.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Jane', email: 'jane@test.com' });

        const { getIncomeHistory } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        const history = await getIncomeHistory({ userId: 'user2', period: '3m' });
        expect(history.period.months).toBe(3);
        expect(history.summary.totalIncomeUsd).toBe(0);
    });

    it('generates a valid PDF buffer', async () => {
        mockPrisma.walletTransaction.findMany.mockResolvedValue([
            { id: 't1', type: 'invoice', amountUsd: 2000, amountBrl: 11000, description: 'Work', createdAt: new Date('2026-07-01') },
        ]);
        mockPrisma.invoice.findMany.mockResolvedValue([]);
        mockPrisma.candidateProfile.findUnique.mockResolvedValue({ taxResidence: 'brazil' });
        mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Test User', email: 'test@test.com' });

        const { generateProofPdf } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        const { pdfBuffer, validationHash, history } = await generateProofPdf({ userId: 'user1', period: '6m' });

        expect(pdfBuffer).toBeInstanceOf(Buffer);
        expect(pdfBuffer.length).toBeGreaterThan(100);
        expect(pdfBuffer.slice(0, 4).toString()).toBe('%PDF');
        expect(validationHash).toHaveLength(16);
        expect(history.candidate.name).toBe('Test User');
    });

    it('generates consistent validation hash', async () => {
        const { generateValidationHash } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        const data = { candidate: { name: 'Test' }, period: { months: 6 }, summary: { totalIncomeUsd: 1000 } };
        const hash1 = generateValidationHash(data);
        const hash2 = generateValidationHash(data);
        expect(hash1).toBe(hash2);
    });

    it('detects invalid validation hash', async () => {
        const { verifyValidationHash, generateValidationHash } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        const data = { candidate: { name: 'Test' }, period: { months: 6 }, summary: { totalIncomeUsd: 1000 } };
        const hash = generateValidationHash(data);
        expect(verifyValidationHash(hash, data)).toBe(true);
        expect(verifyValidationHash('wrong_hash', data)).toBe(false);
    });

    it('defaults to 6m period', async () => {
        mockPrisma.walletTransaction.findMany.mockResolvedValue([]);
        mockPrisma.invoice.findMany.mockResolvedValue([]);
        mockPrisma.candidateProfile.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'U', email: 'u@t.com' });

        const { getIncomeHistory } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        const history = await getIncomeHistory({ userId: 'u1' });
        expect(history.period.months).toBe(6);
    });

    it('PERIOD_MONTHS has expected values', async () => {
        const { PERIOD_MONTHS } = await import('../src/services/blinkfy/proofOfIncomeService.js');
        expect(PERIOD_MONTHS).toEqual({ '3m': 3, '6m': 6, '12m': 12 });
    });
});
