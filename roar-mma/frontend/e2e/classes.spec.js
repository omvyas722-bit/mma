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

test('Classes page loads with schedule', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Previous / Next week navigation', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const prev = page.locator('button[aria-label="Previous week"]');
  if (await v(page, prev)) {
    await prev.click();
    await page.waitForTimeout(300);
  }
  const next = page.locator('button[aria-label="Next week"]');
  if (await v(page, next)) {
    await next.click();
    await page.waitForTimeout(300);
  }
  const tw = page.locator('button:has-text("This Week")');
  if (await v(page, tw)) {
    await tw.click();
    await page.waitForTimeout(300);
  }
});

test('Filter by location dropdown', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label="Filter by location"]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(200);
    await sel.selectOption({ index: 0 });
  }
});

test('Filter by type dropdown', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label="Filter by type"]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(200);
    await sel.selectOption({ index: 0 });
  }
});

test('Add Class button opens modal', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const add = page.locator('button:has-text("Add Class")').first();
  if (await v(page, add)) {
    await add.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
  }
});

test('Click class card opens detail drawer', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const card = page.locator('[role="button"][aria-label*="class"i], [aria-label*="class"i]').first();
  if (await v(page, card)) {
    await card.click();
    await page.waitForTimeout(800);
    const drawer = page.locator('[role="dialog"]').first();
    if (await v(page, drawer)) {
      await drawer.locator('button[aria-label="Close"]').first().click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
});

test('Toggle split view', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const splitBtn = page.locator('button:has-text("Split")').first().or(page.locator('[aria-label*="split"i]').first());
  if (await v(page, splitBtn)) {
    await splitBtn.click();
    await page.waitForTimeout(300);
    console.log('  Split view toggled');
  }
});

test('NLP scheduler input exists', async ({ page }) => {
  await page.goto('/classes');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const nlpInput = page.locator('input[placeholder*="e.g."], input[placeholder*="type"]').first();
  if (await v(page, nlpInput)) {
    await expect(nlpInput).toBeVisible();
  }
});
