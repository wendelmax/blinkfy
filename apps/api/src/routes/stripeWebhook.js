const express = require('express');
const { processWebhookEvent } = require('../services/blinkfy/stripeWebhookService');
const { logger } = require('../lib/logger');

function createStripeWebhookRouter({ prisma, billingProvider }) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const signature = req.get('stripe-signature');
        if (!signature) {
            logger.warn('stripe_webhook.missing_signature', { path: req.path });
            return res.status(401).json({ message: 'Missing stripe-signature header' });
        }

        let event;
        try {
            event = await billingProvider.constructWebhookEvent(req.body, signature);
        } catch (error) {
            logger.warn('stripe_webhook.signature_invalid', { error: error.message });
            return res.status(401).json({ message: 'Invalid webhook signature' });
        }

        try {
            const result = await processWebhookEvent({ prisma, eventType: event.type, data: event.data });
            logger.info('stripe_webhook.processed', { eventType: event.type, ...result });
            return res.status(200).json({ received: true, result });
        } catch (error) {
            logger.error('stripe_webhook.processing_error', { eventType: event.type, error: error.message });
            return res.status(500).json({ message: 'Webhook processing error' });
        }
    });

    return router;
}

module.exports = { createStripeWebhookRouter };
