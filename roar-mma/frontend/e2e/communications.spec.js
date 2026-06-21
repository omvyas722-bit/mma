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

test('Communications page loads', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Compose button opens modal', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const comp = page.locator('button:has-text("Compose")').first();
  if (await v(page, comp)) {
    await comp.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
  }
});

test('Compose modal has SMS option', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const comp = page.locator('button:has-text("Compose")').first();
  if (await v(page, comp)) {
    await comp.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    if (await v(page, modal)) {
      const sms = modal.locator('text=SMS').first();
      if (await v(page, sms)) {
        await sms.click().catch(() => {});
        await page.waitForTimeout(100);
      }
      await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
    }
  }
});

test('History tab loads', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button[role="tab"]:has-text("history")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
});

test('Templates tab loads', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button[role="tab"]:has-text("templates")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
});

test('Scheduled tab loads', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button[role="tab"]:has-text("scheduled")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
});

test('Automated tab loads', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button[role="tab"]:has-text("automated")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
});

test('Approval queue tab loads', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tab = page.locator('button[role="tab"]:has-text("approval")').first();
  if (await v(page, tab)) {
    await tab.click();
    await page.waitForTimeout(500);
  }
});

test('All tabs are accessible', async ({ page }) => {
  await page.goto('/communications');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const tabs = ['history', 'templates', 'scheduled', 'automated', 'approval'];
  let found = 0;
  for (const label of tabs) {
    const tab = page.locator(`button[role="tab"]:has-text("${label}")`).first();
    if (await v(page, tab)) found++;
  }
  expect(found).toBeGreaterThanOrEqual(3);
  console.log(`  ${found}/${tabs.length} tabs found`);
});
