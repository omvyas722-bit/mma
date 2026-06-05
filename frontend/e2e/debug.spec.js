import { test } from '@playwright/test';

test('debug login page', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`PAGE ERROR: ${err.message}`));

  await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const html = await page.content();
  console.log('HTML length:', html.length);
  console.log('Has root:', html.includes('id="root"'));
  console.log('Has ROAR:', html.includes('ROAR MMA'));
  console.log('Has Sign in:', html.includes('Sign in'));
  console.log('Console logs:', logs.join('\n'));

  await page.screenshot({ path: 'login_debug.png', fullPage: true });
});
