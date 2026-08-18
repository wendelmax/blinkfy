import { describe, it, expect, beforeEach, vi } from 'vitest';
const { setPrisma, setLivenessProvider } = require('../src/services/blinkfy/kycVerificationService');
const { createKycController } = require('../src/controllers/kycController');

function mockRes() {
    const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
    return res;
}

describe('KYC Verification Service & Controller', () => {
    let mockPrisma;
    let mockProvider;
    let controller;

    beforeEach(() => {
        mockPrisma = {
            kycVerification: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
            },
            user: {
                findUnique: vi.fn(),
            },
        };
        mockProvider = {
            initiateLiveness: vi.fn().mockResolvedValue({
                sessionId: 'mock_sess_1',
                provider: 'mock',
                challengeType: 'smile',
                expiresAt: new Date(Date.now() + 300000).toISOString(),
            }),
            processLivenessCapture: vi.fn().mockResolvedValue({
                sessionId: 'mock_sess_1',
                passed: true,
                livenessScore: 0.95,
                faceEmbeddingHash: 'abc123hash',
                provider: 'mock',
            }),
            compareFaces: vi.fn().mockResolvedValue({ match: true, score: 0.92, provider: 'mock' }),
        };
        setPrisma(mockPrisma);
        setLivenessProvider(mockProvider);
        controller = createKycController({ prisma: mockPrisma });
    });

    describe('initiate', () => {
        it('creates a pending verification session', async () => {
            const created = { id: 'kyc_1', status: 'pending', providerSessionId: 'mock_sess_1' };
            mockPrisma.kycVerification.findFirst.mockResolvedValue(null);
            mockPrisma.kycVerification.create.mockResolvedValue(created);

            const req = { user: { id: 'u_1' }, body: { triggerReason: 'onboarding' } };
            const res = mockRes();
            await controller.initiate(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                verificationId: 'kyc_1',
                sessionId: 'mock_sess_1',
            }));
            expect(mockProvider.initiateLiveness).toHaveBeenCalled();
        });

        it('rejects if a verification is already in progress', async () => {
            mockPrisma.kycVerification.findFirst.mockResolvedValue({ id: 'kyc_existing', status: 'pending' });

            const req = { user: { id: 'u_1' }, body: {} };
            const res = mockRes();
            await controller.initiate(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
        });
    });

    describe('submitCapture', () => {
        it('processes capture and approves if liveness passes', async () => {
            const verification = { id: 'kyc_1', status: 'pending', providerSessionId: 'mock_sess_1' };
            const updated = { ...verification, status: 'approved', livenessScore: 0.95 };
            mockPrisma.kycVerification.findFirst.mockResolvedValue(verification);
            mockPrisma.kycVerification.update.mockResolvedValue(updated);

            const req = { user: { id: 'u_1' }, params: { verificationId: 'kyc_1' }, body: { imageBase64: 'base64data' }, ip: '127.0.0.1' };
            const res = mockRes();
            await controller.submitCapture(req, res);

            expect(res.json).toHaveBeenCalledWith(updated);
            expect(mockProvider.processLivenessCapture).toHaveBeenCalledWith({
                sessionId: 'mock_sess_1',
                imageBase64: 'base64data',
            });
        });

        it('returns 404 if verification not found', async () => {
            mockPrisma.kycVerification.findFirst.mockResolvedValue(null);

            const req = { user: { id: 'u_1' }, params: { verificationId: 'kyc_nonexistent' }, body: {} };
            const res = mockRes();
            await controller.submitCapture(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('returns 422 if verification is not in pending status', async () => {
            mockPrisma.kycVerification.findFirst.mockResolvedValue({ id: 'kyc_1', status: 'approved' });

            const req = { user: { id: 'u_1' }, params: { verificationId: 'kyc_1' }, body: {} };
            const res = mockRes();
            await controller.submitCapture(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
        });
    });

    describe('list', () => {
        it('returns verification history', async () => {
            const items = [{ id: 'kyc_1', status: 'approved', verificationType: 'liveness' }];
            mockPrisma.kycVerification.findMany.mockResolvedValue(items);

            const req = { user: { id: 'u_1' }, query: {} };
            const res = mockRes();
            await controller.list(req, res);

            expect(res.json).toHaveBeenCalledWith({ items });
        });
    });

    describe('getKycStatus', () => {
        it('returns verified status with valid approval', async () => {
            const latest = {
                id: 'kyc_1',
                status: 'approved',
                verifiedAt: new Date('2026-01-01'),
                expiresAt: new Date('2027-01-01'),
                verificationType: 'liveness',
            };
            mockPrisma.kycVerification.findFirst.mockResolvedValue(latest);

            const req = { user: { id: 'u_1' } };
            const res = mockRes();
            await controller.getKycStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: true,
                isExpired: false,
            }));
        });

        it('returns not verified when no approval exists', async () => {
            mockPrisma.kycVerification.findFirst.mockResolvedValue(null);

            const req = { user: { id: 'u_1' } };
            const res = mockRes();
            await controller.getKycStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: false,
                verification: null,
            }));
        });
    });

    describe('revoke', () => {
        it('revokes an approved verification', async () => {
            const verification = { id: 'kyc_1', status: 'approved' };
            const revoked = { ...verification, status: 'rejected', rejectionReason: 'Revoked by user' };
            mockPrisma.kycVerification.findFirst.mockResolvedValue(verification);
            mockPrisma.kycVerification.update.mockResolvedValue(revoked);

            const req = { user: { id: 'u_1' }, params: { verificationId: 'kyc_1' } };
            const res = mockRes();
            await controller.revoke(req, res);

            expect(res.json).toHaveBeenCalledWith(revoked);
        });
    });
});
