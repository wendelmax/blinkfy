const { recordAuditEvent } = require('../services/blinkfy/auditService');
const { createCheckoutSession, resolveCheckoutSession } = require('../services/blinkfy/checkoutSessionService');
const { getSubscriptionByCandidateId } = require('../services/blinkfy/subscriptionLifecycleService');

function createBillingController({ prisma, billingProvider }) {
    async function getSubscription(req, res) {
        const candidate = await prisma.candidate.findFirst({
            where: { workspaceId: req.workspace.id, userId: req.user.id },
            select: { id: true },
        });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });
        const subscription = await getSubscriptionByCandidateId({ prisma, candidateId: candidate.id });
        return res.json({
            plan: subscription?.plan || 'free',
            status: subscription?.status || 'active',
            provider: subscription?.provider || null,
            currentPeriodStart: subscription?.currentPeriodStart?.toISOString() || null,
            currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
        });
    }

    async function createCheckout(req, res) {
        const candidate = await prisma.candidate.findFirst({
            where: { workspaceId: req.workspace.id, userId: req.user.id },
            include: { user: { select: { email: true } } },
        });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });

        try {
            const session = await createCheckoutSession({
                billingProvider,
                prisma,
                candidateId: candidate.id,
                email: candidate.user?.email,
            });
            await recordAuditEvent({
                prisma,
                workspaceId: req.workspace.id,
                actorUserId: req.user.id,
                entityType: 'candidate_checkout_session',
                entityId: candidate.id,
                action: 'candidate.checkout_created',
                metadata: { sessionId: session.sessionId },
            });
            return res.status(201).json({ url: session.url, sessionId: session.sessionId, expiresAt: session.expiresAt });
        } catch (error) {
            if (error.message.includes('already has an active')) return res.status(422).json({ message: error.message });
            throw error;
        }
    }

    async function getCheckoutStatus(req, res) {
        const sessionId = req.query.session_id || req.params.sessionId;
        if (!sessionId) return res.status(422).json({ message: 'session_id is required' });
        try {
            const status = await resolveCheckoutSession({ billingProvider, prisma, sessionId });
            return res.json(status);
        } catch (error) {
            return res.status(404).json({ message: error.message });
        }
    }

    async function createPortalSession(req, res) {
        const candidate = await prisma.candidate.findFirst({
            where: { workspaceId: req.workspace.id, userId: req.user.id },
            select: { id: true },
        });
        if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });

        const subscription = await getSubscriptionByCandidateId({ prisma, candidateId: candidate.id });
        if (!subscription?.providerCustomerId) {
            return res.status(422).json({ message: 'No active subscription to manage' });
        }

        const returnUrl = req.body?.returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/talent`;
        const portal = await billingProvider.createPortalSession({ stripeCustomerId: subscription.providerCustomerId, returnUrl });
        return res.json({ url: portal.url });
    }

    return { getSubscription, createCheckout, getCheckoutStatus, createPortalSession };
}

module.exports = { createBillingController };
