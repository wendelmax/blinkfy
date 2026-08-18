import { describe, it, expect, beforeEach, vi } from 'vitest';
const { setPrisma } = require('../src/services/blinkfy/taxDocumentService');
const { createTaxDocumentController } = require('../src/controllers/taxDocumentController');

function mockRes() {
    const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
    return res;
}

describe('Tax Document Service & Controller', () => {
    let mockPrisma;
    let controller;

    beforeEach(() => {
        mockPrisma = {
            taxDocument: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                count: vi.fn(),
            },
            user: {
                findUnique: vi.fn(),
            },
        };
        setPrisma(mockPrisma);
        controller = createTaxDocumentController({ prisma: mockPrisma });
    });

    describe('createDocument', () => {
        it('creates a W-8BEN document with auto-calculated expiry', async () => {
            const created = {
                id: 'td_1',
                userId: 'u_1',
                formType: 'w8ben',
                status: 'active',
                fullName: 'João Silva',
                countryOfBirth: 'Brazil',
                taxId: '123-45-6789',
                expiryDate: new Date('2029-08-17'),
                createdAt: new Date(),
            };
            mockPrisma.taxDocument.create.mockResolvedValue(created);

            const req = { user: { id: 'u_1' }, body: { fullName: 'João Silva', formType: 'w8ben', countryOfBirth: 'Brazil', taxId: '123-45-6789' } };
            const res = mockRes();
            await controller.createDocument(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(created);
            expect(mockPrisma.taxDocument.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'u_1',
                    formType: 'w8ben',
                    fullName: 'João Silva',
                    status: 'active',
                }),
            }));
        });

        it('returns 422 when fullName is missing', async () => {
            const req = { user: { id: 'u_1' }, body: { formType: 'w8ben' } };
            const res = mockRes();
            await controller.createDocument(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
        });
    });

    describe('listDocuments', () => {
        it('returns documents for user', async () => {
            const docs = [{ id: 'td_1', formType: 'w8ben', status: 'active' }];
            mockPrisma.taxDocument.findMany.mockResolvedValue(docs);

            const req = { user: { id: 'u_1' }, query: {} };
            const res = mockRes();
            await controller.listDocuments(req, res);

            expect(res.json).toHaveBeenCalledWith({ items: docs });
        });

        it('filters by formType', async () => {
            mockPrisma.taxDocument.findMany.mockResolvedValue([]);
            const req = { user: { id: 'u_1' }, query: { formType: 'w9' } };
            const res = mockRes();
            await controller.listDocuments(req, res);

            expect(mockPrisma.taxDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ formType: 'w9' }),
            }));
        });
    });

    describe('getDocument', () => {
        it('returns a single document', async () => {
            const doc = { id: 'td_1', fullName: 'João Silva' };
            mockPrisma.taxDocument.findFirst.mockResolvedValue(doc);

            const req = { user: { id: 'u_1' }, params: { documentId: 'td_1' } };
            const res = mockRes();
            await controller.getDocument(req, res);

            expect(res.json).toHaveBeenCalledWith(doc);
        });

        it('returns 404 when not found', async () => {
            mockPrisma.taxDocument.findFirst.mockResolvedValue(null);

            const req = { user: { id: 'u_1' }, params: { documentId: 'td_nonexistent' } };
            const res = mockRes();
            await controller.getDocument(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateDocument', () => {
        it('updates allowed fields', async () => {
            const existing = { id: 'td_1', userId: 'u_1', status: 'active' };
            const updated = { ...existing, fullName: 'Updated Name' };
            mockPrisma.taxDocument.findFirst.mockResolvedValue(existing);
            mockPrisma.taxDocument.update.mockResolvedValue(updated);

            const req = { user: { id: 'u_1' }, params: { documentId: 'td_1' }, body: { fullName: 'Updated Name' } };
            const res = mockRes();
            await controller.updateDocument(req, res);

            expect(res.json).toHaveBeenCalledWith(updated);
        });

        it('rejects update on superseded document', async () => {
            mockPrisma.taxDocument.findFirst.mockResolvedValue({ id: 'td_1', status: 'superseded' });

            const req = { user: { id: 'u_1' }, params: { documentId: 'td_1' }, body: { fullName: 'X' } };
            const res = mockRes();
            await controller.updateDocument(req, res);

            expect(res.status).toHaveBeenCalledWith(422);
        });
    });

    describe('supersedeDocument', () => {
        it('creates new doc and marks old as superseded', async () => {
            const existing = { id: 'td_1', formType: 'w8ben', status: 'active' };
            const created = { id: 'td_2', formType: 'w8ben', status: 'active', fullName: 'New Name' };
            mockPrisma.taxDocument.findFirst.mockResolvedValue(existing);
            mockPrisma.taxDocument.create.mockResolvedValue(created);
            mockPrisma.taxDocument.update.mockResolvedValue({ ...existing, status: 'superseded' });

            const req = { user: { id: 'u_1' }, params: { documentId: 'td_1' }, body: { fullName: 'New Name' } };
            const res = mockRes();
            await controller.supersedeDocument(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockPrisma.taxDocument.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'td_1' },
                data: expect.objectContaining({ status: 'superseded' }),
            }));
        });
    });

    describe('getSummary', () => {
        it('returns document summary', async () => {
            mockPrisma.taxDocument.findMany.mockResolvedValue([
                { status: 'active', formType: 'w8ben', expiryDate: new Date('2029-01-01') },
                { status: 'expired', formType: 'w8ben', expiryDate: new Date('2025-01-01') },
            ]);

            const req = { user: { id: 'u_1' } };
            const res = mockRes();
            await controller.getSummary(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                total: 2,
                active: 1,
                expired: 1,
                byFormType: expect.objectContaining({ w8ben: 2 }),
            }));
        });
    });

    describe('getExpiringDocuments', () => {
        it('returns expiring documents with count', async () => {
            const docs = [{ id: 'td_1', fullName: 'Test', expiryDate: new Date('2026-09-01') }];
            mockPrisma.taxDocument.findMany.mockResolvedValue(docs);

            const req = { user: { id: 'admin' }, query: { days: '30' } };
            const res = mockRes();
            await controller.getExpiringDocuments(req, res);

            expect(res.json).toHaveBeenCalledWith({ items: docs, count: 1 });
        });
    });
});
