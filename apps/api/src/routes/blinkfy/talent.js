const express = require('express');
const { createTalentController } = require('../../controllers/blinkfy/talentController');

function createTalentRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router();
    const controller = createTalentController({ prisma });
    const candidateAccess = [requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), async (req, res, next) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
        if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
        return next();
    }];
    router.get('/profile', candidateAccess, controller.getProfile);
    router.patch('/profile', candidateAccess, controller.patchProfile);
    router.patch('/visibility', candidateAccess, controller.patchVisibility);
    router.get('/consents', candidateAccess, controller.listConsents);
    router.post('/consents/:consentId/revoke', candidateAccess, controller.revokeConsent);
    return router;
}

module.exports = { createTalentRouter };
