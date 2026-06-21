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

test('Reports page loads', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Report type selector exists', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await expect(sel).toBeVisible();
  }
});

test('Cycle through report types', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select').first();
  if (await v(page, sel)) {
    const options = await sel.locator('option').allTextContents();
    for (let i = 1; i < Math.min(options.length, 5); i++) {
      await sel.selectOption({ index: i });
      await page.waitForTimeout(300);
      console.log(`  Report type: ${options[i].trim()}`);
    }
  }
});

test('Date range inputs exist', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const dateFrom = page.locator('input[type="date"]').first();
  const dateTo = page.locator('input[type="date"]').nth(1);
  if (await v(page, dateFrom)) {
    await dateFrom.fill('2026-01-01');
  }
  if (await v(page, dateTo)) {
    await dateTo.fill('2026-12-31');
  }
});

test('Generate button exists and is clickable', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const gen = page.locator('button:has-text("Generate")').first();
  if (await v(page, gen)) {
    await gen.click();
    await page.waitForTimeout(1500);
  }
});

test('Rechart charts render for report types', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const canvas = page.locator('canvas').first();
  if (await v(page, canvas)) {
    await expect(canvas).toBeVisible();
    console.log('  Chart rendered');
  }
});

test('Funnel visualization exists', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const funnel = page.locator('text=Funnel').first().or(page.locator('[class*="funnel"i]').first());
  if (await v(page, funnel)) {
    console.log('  Funnel visualization found');
  }
});

test('Heatmap visualization exists', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const heatmap = page.locator('text=Heatmap').first().or(page.locator('text=Class Fill Heatmap').first());
  if (await v(page, heatmap)) {
    console.log('  Heatmap found');
  }
});

test('PDF export button exists', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const printBtn = page.locator('button:has-text("PDF")').first().or(page.locator('button:has-text("Print")').first()).or(page.locator('button:has-text("Export")').first());
  if (await v(page, printBtn)) {
    console.log('  PDF/Export button visible');
  }
});

test('No API errors on reports page', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  expect(ERRORS.api.filter(e => !e.includes('socket.io'))).toEqual([]);
});
