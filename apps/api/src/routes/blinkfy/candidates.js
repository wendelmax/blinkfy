const express = require('express');
const { createCandidatesController } = require('../../controllers/blinkfy/candidatesController');

function createCandidatesRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router();
    const controller = createCandidatesController({ prisma });

    router.get('/:candidateId', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.getCandidate);
    router.post('/:candidateId/consents', requireWorkspaceRole('owner', 'admin', 'recruiter'), controller.recordConsent);
    router.post('/:candidateId/share', requireWorkspaceRole('owner', 'admin', 'recruiter'), controller.shareCandidate);
    return router;
}

module.exports = { createCandidatesRouter };
