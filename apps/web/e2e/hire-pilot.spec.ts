import { expect, test } from '@playwright/test';

test('recruiter creates a job and lands on its review pipeline', async ({ page }) => {
  page.on('pageerror', (error) => console.log(`PAGEERROR ${error.message}`));
  await page.addInitScript(() => localStorage.setItem('blinkfy_client_id', 'client-e2e'));
  const job = { id: 'job-e2e', title: 'Senior Platform Engineer', requirements: ['Node.js'], status: 'draft' };
  await page.route('**/api/blinkfy/clients/client-e2e/jobs**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { items: [job] } });
    return route.fulfill({ status: 201, json: job });
  });
  await page.route('**/api/blinkfy/jobs/job-e2e/applications', async (route) => route.fulfill({ json: { items: [] } }));

  await page.goto('/hire/jobs/new?clientId=client-e2e');
  await expect(page.getByLabel('Job title')).toBeVisible();
  await page.getByLabel('Job title').fill('Senior Platform Engineer');
  await page.getByLabel('Requirements (one per line)').fill('Node.js');
  await expect(page.getByRole('button', { name: 'Create job' })).toBeEnabled();
  const createRequest = page.waitForRequest((request) => request.url().includes('/api/blinkfy/clients/client-e2e/jobs') && request.method() === 'POST');
  await page.getByRole('button', { name: 'Create job' }).click();
  await createRequest;
  await expect(page).toHaveURL(/\/hire\/jobs\/job-e2e$/);
  await expect(page.getByRole('heading', { name: 'Senior Platform Engineer' })).toBeVisible();
  await expect(page.getByText('No candidates in this stage.').first()).toBeVisible();
});
