const express = require('express');
const { createJobsController } = require('../../controllers/blinkfy/jobsController');

function createJobsRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
    const router = express.Router({ mergeParams: true });
    const jobsController = createJobsController({ prisma });

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
    router.post(
        '/import',
        requireWorkspaceRole('owner', 'admin', 'recruiter'),
        requireClientAccess,
        jobsController.importJob,
    );

    return router;
}

module.exports = { createJobsRouter };
