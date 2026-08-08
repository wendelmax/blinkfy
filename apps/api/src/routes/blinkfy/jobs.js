const express = require('express');

function createJobsRouter({ requireWorkspaceRole, requireClientAccess }) {
    const router = express.Router({ mergeParams: true });

    router.get(
        '/',
        requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'),
        requireClientAccess,
        (_req, res) => res.json({ items: [] }),
    );

    return router;
}

module.exports = { createJobsRouter };
