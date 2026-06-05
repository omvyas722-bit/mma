import { test as setup, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@roarmma.com.au';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'changeme123';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('#email');
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 20000 });
  await page.context().storageState({ path: 'e2e/auth.json' });
});
