const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const { validateEnv } = require('./lib/env');
const tasklets = require('./lib/tasklets');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const candidateRoutes = require('./routes/candidate');
const paymentRoutes = require('./routes/payment');

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === 'production';

validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

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

app.get('/health', async (req, res) => {
    let dbStatus = 'unknown';
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'ok';
    } catch (e) {
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
    } catch (e) {
        res.status(503).json({ ready: false, error: e.message });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: isProd ? 'Internal server error' : err.message });
});

const server = app.listen(PORT, () => {
    console.log(`API server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

async function gracefulShutdown(signal) {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
        try {
            if (typeof tasklets.terminate === 'function') await tasklets.terminate();
            await prisma.$disconnect();
            console.log('Cleanup complete');
            process.exit(0);
        } catch (e) {
            console.error('Shutdown error:', e);
            process.exit(1);
        }
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
