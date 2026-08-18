const express = require('express');
const { createKycController } = require('../controllers/kycController');

function createKycRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router();
    const controller = createKycController({ prisma });

    const candidateAccess = [
        requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'),
        async (req, res, next) => {
            const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
            if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
            return next();
        },
    ];

    router.get('/status', candidateAccess, controller.getKycStatus);
    router.get('/', candidateAccess, controller.list);
    router.post('/initiate', candidateAccess, controller.initiate);
    router.get('/:verificationId', candidateAccess, controller.getStatus);
    router.post('/:verificationId/capture', candidateAccess, controller.submitCapture);
    router.post('/:verificationId/revoke', candidateAccess, controller.revoke);

    return router;
}

module.exports = { createKycRouter };
