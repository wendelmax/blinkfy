const express = require('express');
const { createApplicationsController } = require('../../controllers/blinkfy/applicationsController');

function createApplicationsRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createApplicationsController({ prisma });
    const reviewer = requireWorkspaceRole('owner', 'admin', 'recruiter');

    router.get('/', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.listApplications);
    router.post('/:applicationId/recompute-score', reviewer, controller.recomputeScore);
    router.patch('/:applicationId/stage', reviewer, controller.updateStage);
    router.patch('/:applicationId/override-score', reviewer, controller.overrideScore);
    router.post('/:applicationId/screening/invite', reviewer, controller.inviteScreening);
    router.post('/:applicationId/screening/consent', reviewer, controller.consentScreening);
    router.post('/:applicationId/screening/schedule', reviewer, controller.scheduleScreening);
    router.post('/:applicationId/screening/withdraw', reviewer, controller.withdrawScreening);
    router.post('/:applicationId/screening/evidence', reviewer, controller.addScreeningEvidence);
    router.get('/:applicationId/screening/dossier', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.getScreeningDossier);

    return router;
}

module.exports = { createApplicationsRouter };
