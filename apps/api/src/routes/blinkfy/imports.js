const express = require('express');
const { createImportsController } = require('../../controllers/blinkfy/importsController');

function createImportsRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createImportsController({ prisma });
    router.post('/', requireWorkspaceRole('owner', 'admin', 'recruiter'), requireClientAccess, controller.importCandidatesFromCsv);
    return router;
}

module.exports = { createImportsRouter };
