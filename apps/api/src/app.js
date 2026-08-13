const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { getPrisma } = require('./lib/prisma');
const { logger } = require('./lib/logger');
const { requestContext } = require('./middleware/requestContext');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const candidateRoutes = require('./routes/candidate');
const paymentRoutes = require('./routes/payment');
const { createBlinkfyRouter } = require('./routes/blinkfy');
const { createConciergeWebhookRouter } = require('./routes/conciergeWebhook');
const { createScreeningProviderWebhookRouter } = require('./routes/screeningProviderWebhook');

function createApp({ prisma = getPrisma() } = {}) {
    const app = express();
    const isProd = process.env.NODE_ENV === 'production';

    app.use(requestContext);

    app.use(helmet({ contentSecurityPolicy: isProd }));
    app.use(compression());
    app.use(cors({
        origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || true,
        credentials: true,
    }));
    app.use(express.json({ limit: '1mb' }));

    app.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: isProd ? 200 : 1000,
        standardHeaders: true,
        legacyHeaders: false,
    }));

    app.use('/api/auth', authRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/candidate', candidateRoutes);
    app.use('/api/payment', paymentRoutes);
    app.use('/api/job', require('./routes/job'));
    app.use('/api/metadata', require('./routes/metadata'));
    app.use('/api/company', require('./routes/company'));
    app.use('/api/blinkfy', createBlinkfyRouter({ prisma }));
    app.use('/api/webhooks/concierge', createConciergeWebhookRouter({ prisma }));
    app.use('/api/webhooks/screening', createScreeningProviderWebhookRouter({ prisma }));

    app.get('/health', async (_req, res) => {
        let dbStatus = 'unknown';

        try {
            await prisma.$queryRaw`SELECT 1`;
            dbStatus = 'ok';
        } catch {
            dbStatus = 'error';
        }

        res.json({
            status: dbStatus === 'ok' ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            db: dbStatus,
        });
    });

    app.get('/ready', async (req, res) => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            res.status(200).json({ ready: true });
        } catch (error) {
            logger.error('api.readiness_failed', { requestId: req.requestId, error });
            res.status(503).json({ ready: false, error: error.message });
        }
    });

    app.use((err, _req, res, _next) => {
        logger.error('api.unhandled_error', { requestId: _req.requestId, method: _req.method, path: _req.originalUrl, error: err });
        res.status(500).json({ message: isProd ? 'Internal server error' : err.message });
    });

    return app;
}

module.exports = { createApp };
