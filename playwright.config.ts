import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build --workspace=apps/web && npm run start --workspace=apps/web -- --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 180000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
