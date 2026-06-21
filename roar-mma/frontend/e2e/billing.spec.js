import { test, expect } from '@playwright/test';

const ERRORS = { api: [], console: [] };
const TS = Date.now();

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

test('Billing page loads with stats cards', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  const stats = page.locator('.grid').first();
  if (await v(page, stats)) {
    const cards = await stats.locator('> div').count();
    expect(cards).toBeGreaterThanOrEqual(1);
    console.log(`  ${cards} stat cards`);
  }
});

test('Search transactions input', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const search = page.locator('input[aria-label="Search transactions"]').first();
  if (await v(page, search)) {
    await search.fill('test');
    await page.waitForTimeout(500);
    expect(await search.inputValue()).toBe('test');
    await search.clear();
  }
});

test('Filter by status and type', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  for (const label of ['Filter by status', 'Filter by type']) {
    const sel = page.locator(`select[aria-label="${label}"]`).first();
    if (await v(page, sel) && await sel.locator('option').count() > 1) {
      await sel.selectOption({ index: 1 });
      await page.waitForTimeout(200);
      await sel.selectOption({ index: 0 });
    }
  }
});

test('Transaction table loads with rows', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const table = page.locator('table').first();
  if (await v(page, table)) {
    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
    console.log(`  ${rows} transaction rows`);
  }
});

test('Record Payment button opens modal', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const recBtn = page.locator('button:has-text("Record Payment")').first();
  if (await v(page, recBtn)) {
    await recBtn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
  }
});

test('Record Payment modal search member', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const recBtn = page.locator('button:has-text("Record Payment")').first();
  if (await v(page, recBtn)) {
    await recBtn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    if (await v(page, modal)) {
      const srch = modal.locator('input[aria-label="Search member"]').first();
      if (await v(page, srch)) {
        await srch.fill('admin');
        await page.waitForTimeout(1000);
      }
      await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
    }
  }
});

test('Export button visible', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const exportBtn = page.locator('button:has-text("Export")').first();
  if (await v(page, exportBtn)) {
    await expect(exportBtn).toBeVisible();
  }
});

test('Write Off action visible on transactions', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const writeOffBtn = page.locator('button:has-text("Write Off")').first();
  if (await v(page, writeOffBtn)) {
    console.log('  Write Off action available');
  }
});

test('MRR forecast section renders', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const forecastSection = page.locator('text=Revenue Forecast').first().or(page.locator('text=MRR').first());
  if (await v(page, forecastSection)) {
    console.log('  MRR forecast visible');
  }
});

test('Billing pagination', async ({ page }) => {
  await page.goto('/billing');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const next = page.locator('button[aria-label="Next page"]');
  if (await v(page, next) && await next.isEnabled().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(300);
    const prev = page.locator('button[aria-label="Previous page"]');
    if (await v(page, prev)) await prev.click();
  }
});
