const express = require('express');
const { createApplicationsController } = require('../../controllers/blinkfy/applicationsController');

function createApplicationsRouter({ requireWorkspaceRole, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createApplicationsController({ prisma });
    const reviewer = requireWorkspaceRole('owner', 'admin', 'recruiter');

    router.post('/:applicationId/recompute-score', reviewer, controller.recomputeScore);
    router.patch('/:applicationId/stage', reviewer, controller.updateStage);
    router.patch('/:applicationId/override-score', reviewer, controller.overrideScore);

    return router;
}

module.exports = { createApplicationsRouter };
