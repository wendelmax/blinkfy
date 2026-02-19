/**
 * Tasklets singleton - Worker Threads pool for CPU-bound tasks.
 * @see https://www.npmjs.com/package/@wendelmax/tasklets
 */

const Tasklets = require('@wendelmax/tasklets');

const tasklets = new Tasklets();

tasklets.configure({
    maxWorkers: process.env.TASKLETS_MAX_WORKERS ? parseInt(process.env.TASKLETS_MAX_WORKERS, 10) : 'auto',
    minWorkers: process.env.NODE_ENV === 'production' ? 2 : 1,
    workload: 'cpu',
    adaptive: process.env.NODE_ENV === 'production',
    timeout: 30000,
    maxMemory: 85,
    logging: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
});

module.exports = tasklets;
