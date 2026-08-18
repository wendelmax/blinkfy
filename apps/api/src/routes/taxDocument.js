const express = require('express');
const { createTaxDocumentController } = require('../controllers/taxDocumentController');

function createTaxDocumentRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router();
    const controller = createTaxDocumentController({ prisma });

    const candidateAccess = [
        requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'),
        async (req, res, next) => {
            const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
            if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
            return next();
        },
    ];

    router.get('/summary', candidateAccess, controller.getSummary);
    router.get('/expiring', candidateAccess, controller.getExpiringDocuments);
    router.get('/', candidateAccess, controller.listDocuments);
    router.get('/:documentId', candidateAccess, controller.getDocument);
    router.post('/', candidateAccess, controller.createDocument);
    router.patch('/:documentId', candidateAccess, controller.updateDocument);
    router.post('/:documentId/supersede', candidateAccess, controller.supersedeDocument);
    router.get('/:documentId/download', candidateAccess, controller.downloadDocument);

    return router;
}

module.exports = { createTaxDocumentRouter };
