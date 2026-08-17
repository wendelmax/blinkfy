const express = require('express');
const { createBillingController } = require('../controllers/billingController');

function createBillingRouter({ requireWorkspaceRole, prisma, billingProvider }) {
    const router = express.Router();
    const controller = createBillingController({ prisma, billingProvider });

    const candidateAccess = [requireWorkspaceRole('owner', 'admin', 'recruiter', 'viewer'), async (req, res, next) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { userType: true } });
        if (!user || user.userType !== 'candidate') return res.status(403).json({ message: 'Candidate access required' });
        return next();
    }];

    router.get('/subscription', candidateAccess, controller.getSubscription);
    router.post('/checkout', candidateAccess, controller.createCheckout);
    router.get('/checkout/status', candidateAccess, controller.getCheckoutStatus);
    router.post('/portal', candidateAccess, controller.createPortalSession);

    return router;
}

module.exports = { createBillingRouter };
