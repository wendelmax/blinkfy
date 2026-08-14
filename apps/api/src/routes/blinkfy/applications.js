const express = require('express');
const { createApplicationsController } = require('../../controllers/blinkfy/applicationsController');
const { createMessageSuggestionsController } = require('../../controllers/blinkfy/messageSuggestionsController');
const { createConciergeAtsExportController } = require('../../controllers/blinkfy/conciergeAtsExportController');

function createApplicationsRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createApplicationsController({ prisma });
    const messageSuggestions = createMessageSuggestionsController({ prisma });
    const atsExport = createConciergeAtsExportController({ prisma });
    const reviewer = requireWorkspaceRole('owner', 'admin', 'recruiter');

    router.get('/', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.listApplications);
    router.post('/:applicationId/recompute-score', reviewer, controller.recomputeScore);
    router.patch('/:applicationId/stage', reviewer, controller.updateStage);
    router.patch('/:applicationId/override-score', reviewer, controller.overrideScore);
    router.post('/:applicationId/screening/invite', reviewer, controller.inviteScreening);
    router.post('/:applicationId/screening/consent', reviewer, controller.consentScreening);
    router.post('/:applicationId/screening/schedule', reviewer, controller.scheduleScreening);
    router.post('/:applicationId/screening/start', reviewer, controller.startScreening);
    router.post('/:applicationId/screening/complete', reviewer, controller.completeScreening);
    router.post('/:applicationId/screening/withdraw', reviewer, controller.withdrawScreening);
    router.post('/:applicationId/screening/evidence', reviewer, controller.addScreeningEvidence);
    router.get('/:applicationId/screening/dossier', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.getScreeningDossier);
    router.get('/:applicationId/screening/feedback', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.listScreeningFeedback);
    router.post('/:applicationId/screening/feedback', reviewer, controller.createScreeningFeedback);
    router.get('/:applicationId/inbox', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.listConciergeMessages);
    router.get('/:applicationId/follow-up', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), controller.getFollowUp);
    router.put('/:applicationId/follow-up', reviewer, controller.configureFollowUp);
    router.get('/:applicationId/messages', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), messageSuggestions.list);
    router.post('/:applicationId/messages', reviewer, messageSuggestions.create);
    router.post('/:applicationId/messages/grounded-draft', reviewer, messageSuggestions.generateGrounded);
    router.patch('/:applicationId/messages/:suggestionId', reviewer, messageSuggestions.decide);
    router.post('/:applicationId/ats-export-preview', reviewer, atsExport.preview);

    return router;
}

module.exports = { createApplicationsRouter };
