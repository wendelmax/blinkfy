const express = require('express');
const { createRevenueSharingController } = require('../../controllers/blinkfy/revenueSharingController');

function createRevenueSharingRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createRevenueSharingController({ prisma });

    router.post('/preview',
        requireWorkspaceRole('owner', 'admin', 'recruiter'),
        requireClientAccess,
        controller.preview,
    );
    router.post('/allocations',
        requireWorkspaceRole('owner', 'admin', 'recruiter'),
        requireClientAccess,
        controller.confirmAllocation,
    );

    return router;
}

module.exports = { createRevenueSharingRouter };
