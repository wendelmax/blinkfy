const express = require('express');
const { createNfeController } = require('../controllers/nfeController');

function createNfeRouter({ requireWorkspaceRole, prisma, nfeProvider }) {
    const router = express.Router();
    const controller = createNfeController({ prisma, nfeProvider });

    const candidateAccess = [requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), async (req, res, next) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
        if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
        return next();
    }];

    router.get('/summary', candidateAccess, controller.getSummary);
    router.get('/emissions', candidateAccess, controller.listEmissions);
    router.post('/emissions', candidateAccess, controller.createEmission);
    router.post('/emissions/:emissionId/emit', candidateAccess, controller.emitEmission);
    router.get('/emissions/:emissionId/status', candidateAccess, controller.queryStatus);
    router.post('/emissions/:emissionId/cancel', candidateAccess, controller.cancelEmission);

    return router;
}

module.exports = { createNfeRouter };
