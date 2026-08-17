const express = require('express');
const { createTalentController } = require('../../controllers/blinkfy/talentController');

function createTalentRouter({ requireWorkspaceRole, prisma, billingProvider }) {
    const router = express.Router();
    const controller = createTalentController({ prisma, billingProvider });
    const candidateAccess = [requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), async (req, res, next) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
        if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
        return next();
    }];
    router.get('/profile', candidateAccess, controller.getProfile);
    router.get('/analytics/positioning', candidateAccess, controller.getPositioningAnalytics);
    router.get('/network/recommendations', candidateAccess, controller.listNetworkRecommendations);
    router.get('/analytics/usage', candidateAccess, controller.getUsageAnalytics);
    router.get('/plans', candidateAccess, controller.getPlanCatalog);
    router.post('/plans/upgrade-intent', candidateAccess, controller.requestUpgrade);
    router.post('/drafts/resume', candidateAccess, controller.createResumeDraft);
    router.post('/drafts/engagement', candidateAccess, controller.createEngagementDraft);
    router.get('/drafts', candidateAccess, controller.listDrafts);
    router.patch('/drafts/:draftId/status', candidateAccess, controller.reviewDraft);
    router.get('/screening/invitations', candidateAccess, controller.listScreeningInvitations);
    router.post('/screening/invitations/:sessionId/consent', candidateAccess, controller.consentToScreening);
    router.post('/screening/invitations/:sessionId/withdraw', candidateAccess, controller.withdrawScreeningConsent);
    router.patch('/profile', candidateAccess, controller.patchProfile);
    router.patch('/visibility', candidateAccess, controller.patchVisibility);
    router.get('/consents', candidateAccess, controller.listConsents);
    router.post('/consents/:consentId/revoke', candidateAccess, controller.revokeConsent);
    return router;
}

module.exports = { createTalentRouter };
