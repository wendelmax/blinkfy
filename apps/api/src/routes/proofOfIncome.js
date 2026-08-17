const express = require('express');
const { createProofOfIncomeController } = require('../controllers/proofOfIncomeController');

function createProofOfIncomeRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router();
    const controller = createProofOfIncomeController({ prisma });

    const candidateAccess = [requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), async (req, res, next) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
        if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
        return next();
    }];

    router.get('/proof-of-income', candidateAccess, controller.downloadProof);
    router.get('/proof-of-income/history', candidateAccess, controller.getHistory);

    return router;
}

module.exports = { createProofOfIncomeRouter };
