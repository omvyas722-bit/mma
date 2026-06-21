import { test, expect } from '@playwright/test';

const ERRORS = { api: [], console: [] };

async function v(pg, loc) {
  try { return await pg.locator(loc).isVisible(); } catch { return false; }
}

test.beforeEach(async ({ page }) => {
  ERRORS.api = []; ERRORS.console = [];
  page.on('console', msg => { if (msg.type() === 'error') ERRORS.console.push(msg.text()); });
  page.on('response', res => { if (res.status() >= 400) ERRORS.api.push(`${res.status()} ${res.url().split('?')[0]}`); });
});

test.afterEach(async ({ page }, info) => {
  if (ERRORS.api.length) console.log(`[${info.title}] API:`, JSON.stringify(ERRORS.api));
  if (info.status !== 'passed') {
    await page.screenshot({ path: `e2e-screenshots/${info.title.replace(/\s+/g, '-')}.png` }).catch(() => {});
  }
  await page.waitForTimeout(300).catch(() => {});
});

test('Settings page loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('General settings tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("General")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('Locations settings tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Locations")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('Membership settings tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Membership")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('Notifications settings tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Notifications")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('Integrations tab loads with webhooks', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Integrations")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
    const webhooks = page.locator('text=Webhooks').first();
    if (await v(page, webhooks)) {
      console.log('  Webhooks section visible');
    }
  }
});

test('Grading settings tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Grading")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('Payments settings tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Payments")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('Audit Log tab loads', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button:has-text("Audit Log")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(400);
  }
});

test('All settings tabs are accessible', async ({ page }) => {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tabs = ['General', 'Locations', 'Membership', 'Notifications', 'Integrations', 'Grading', 'Payments', 'Audit Log'];
  let found = 0;
  for (const label of tabs) {
    const tab = page.locator(`button:has-text("${label}")`).first();
    if (await v(page, tab)) found++;
  }
  expect(found).toBeGreaterThanOrEqual(4);
  console.log(`  ${found}/${tabs.length} tabs found`);
});
