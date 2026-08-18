const taxDocumentService = require('../services/blinkfy/taxDocumentService');

function createTaxDocumentController({ prisma }) {
    async function listDocuments(req, res) {
        try {
            const { formType, status } = req.query;
            const documents = await taxDocumentService.listDocuments(req.user.id, { formType, status });
            res.json({ items: documents });
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to list tax documents' });
        }
    }

    async function getDocument(req, res) {
        try {
            const doc = await taxDocumentService.getDocumentById(req.user.id, req.params.documentId);
            res.json(doc);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to get tax document' });
        }
    }

    async function createDocument(req, res) {
        try {
            const doc = await taxDocumentService.createDocument(req.user.id, req.body);
            res.status(201).json(doc);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to create tax document' });
        }
    }

    async function updateDocument(req, res) {
        try {
            const doc = await taxDocumentService.updateDocument(req.user.id, req.params.documentId, req.body);
            res.json(doc);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to update tax document' });
        }
    }

    async function supersedeDocument(req, res) {
        try {
            const doc = await taxDocumentService.supersedeDocument(req.user.id, req.params.documentId, req.body);
            res.status(201).json(doc);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to supersede tax document' });
        }
    }

    async function downloadDocument(req, res) {
        try {
            const doc = await taxDocumentService.getDocumentForContractorDownload(req.user.id, req.params.documentId);
            res.json(doc);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to download tax document' });
        }
    }

    async function getSummary(req, res) {
        try {
            const summary = await taxDocumentService.getSummary(req.user.id);
            res.json(summary);
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to get tax document summary' });
        }
    }

    async function getExpiringDocuments(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;
            const documents = await taxDocumentService.getExpiringDocuments(days);
            res.json({ items: documents, count: documents.length });
        } catch (caught) {
            const error = caught;
            res.status(error.status || 500).json({ message: error.message || 'Failed to get expiring documents' });
        }
    }

    return {
        listDocuments,
        getDocument,
        createDocument,
        updateDocument,
        supersedeDocument,
        downloadDocument,
        getSummary,
        getExpiringDocuments,
    };
}

module.exports = { createTaxDocumentController };
