const express = require('express');
const auth = require('../../middleware/auth');
const { createWorkspaceMiddleware } = require('../../middleware/workspace');
const { createJobsRouter } = require('./jobs');

function createBlinkfyRouter({ prisma }) {
    const router = express.Router();
    const workspaceMiddleware = createWorkspaceMiddleware({ prisma });

    router.use(auth);
    router.use('/clients/:clientId/jobs', createJobsRouter({ ...workspaceMiddleware, prisma }));

    return router;
}

module.exports = { createBlinkfyRouter };
