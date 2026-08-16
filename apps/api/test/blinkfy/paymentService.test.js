const { PrismaClient } = require('@prisma/client');
const { disconnectPrisma } = require('../../src/lib/prisma');
const paymentService = require('../../src/services/paymentService');

const prisma = new PrismaClient();
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function createUserWithProfile(taxResidence) {
    const user = await prisma.user.create({
        data: {
            email: `payment-service-${runId}-${taxResidence || 'none'}-${Math.random().toString(16).slice(2)}@example.test`,
            fullName: 'Payment Service Test User',
            userType: 'candidate',
        },
    });
    if (taxResidence !== undefined) {
        await prisma.candidateProfile.create({
            data: { userId: user.id, taxResidence },
        });
    }
    return user;
}

afterAll(async () => {
    await prisma.$disconnect();
    await disconnectPrisma();
});

describe('getWalletSummaryForUser currency selection', () => {
    test('an Argentina candidate gets ARS projections, not BRL', async () => {
        const user = await createUserWithProfile('argentina');

        const summary = await paymentService.getWalletSummaryForUser(user.id, 1000);

        expect(summary.projections.currency).toBe('ARS');
        expect(summary.projections.regime).toBe('monotributo');
        expect(summary.projections).not.toHaveProperty('grossBrl');
    });

    test('a Mexico candidate gets MXN projections', async () => {
        const user = await createUserWithProfile('mexico');

        const summary = await paymentService.getWalletSummaryForUser(user.id, 1000);

        expect(summary.projections.currency).toBe('MXN');
        expect(summary.projections.regime).toBe('resico');
    });

    test('a candidate with no profile row falls back to Brazil/BRL, exactly like today', async () => {
        const user = await createUserWithProfile(undefined);

        const summary = await paymentService.getWalletSummaryForUser(user.id, 1000);

        expect(summary.projections.currency).toBe('BRL');
        expect(summary.projections.regime).toBe('irrf');
    });
});
