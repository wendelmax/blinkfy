const dotenv = require('dotenv');

dotenv.config();

const { validateEnv } = require('./lib/env');
const tasklets = require('./lib/tasklets');
const { createApp } = require('./app');
const { disconnectPrisma } = require('./lib/prisma');

validateEnv();

const app = createApp();
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`API server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

async function gracefulShutdown(signal) {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
        try {
            if (typeof tasklets.terminate === 'function') await tasklets.terminate();
            await disconnectPrisma();
            console.log('Cleanup complete');
            process.exit(0);
        } catch (error) {
            console.error('Shutdown error:', error);
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
