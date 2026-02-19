/**
 * PM2 ecosystem for production deployment.
 * Usage: pm2 start ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'api',
      cwd: './apps/api',
      script: 'src/index.js',
      instances: process.env.API_INSTANCES || 1,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
    },
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M',
    },
  ],
};
