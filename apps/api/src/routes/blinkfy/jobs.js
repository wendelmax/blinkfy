const express = require('express');
const { createJobsController } = require('../../controllers/blinkfy/jobsController');
const { createConciergeInboxController } = require('../../controllers/blinkfy/conciergeInboxController');

function createJobsRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
    const router = express.Router({ mergeParams: true });
    const jobsController = createJobsController({ prisma });
    const inboxController = createConciergeInboxController({ prisma });

    router.get(
        '/',
        requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'),
        requireClientAccess,
        jobsController.listJobs,
    );
    router.post(
        '/',
        requireWorkspaceRole('owner', 'admin', 'recruiter'),
        requireClientAccess,
        jobsController.createManualJob,
    );
    router.get('/:jobId/inbox', requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), requireClientAccess, inboxController.list);
    router.post(
        '/import',
        requireWorkspaceRole('owner', 'admin', 'recruiter'),
        requireClientAccess,
        jobsController.importJob,
    );

    return router;
}

module.exports = { createJobsRouter };
