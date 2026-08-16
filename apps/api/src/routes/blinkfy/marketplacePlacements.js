const express = require('express');
const { createMarketplacePlacementsController } = require('../../controllers/blinkfy/marketplacePlacementsController');

function createMarketplacePlacementsRouter({ requireWorkspaceRole, requireClientAccess, prisma }) {
    const router = express.Router({ mergeParams: true });
    const controller = createMarketplacePlacementsController({ prisma });

    router.post('/',
        requireWorkspaceRole('owner', 'admin'),
        requireClientAccess,
        controller.confirmPlacement,
    );

    return router;
}

module.exports = { createMarketplacePlacementsRouter };
