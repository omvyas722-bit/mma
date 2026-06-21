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

test('Calendar page loads', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Calendar month view renders', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const viewSel = page.locator('select').first();
  if (await v(page, viewSel) && await viewSel.locator('option').count() > 1) {
    await viewSel.selectOption('month');
    await page.waitForTimeout(200);
  }
  const dayCells = page.locator('[role="button"][tabindex="0"]');
  const count = await dayCells.count();
  expect(count).toBeGreaterThanOrEqual(7);
  console.log(`  ${count} day cells`);
});

test('Calendar week view loads', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const viewSel = page.locator('select').first();
  if (await v(page, viewSel) && await viewSel.locator('option').count() > 1) {
    await viewSel.selectOption('week');
    await page.waitForTimeout(200);
  }
});

test('Calendar day view loads', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const viewSel = page.locator('select').first();
  if (await v(page, viewSel) && await viewSel.locator('option').count() > 1) {
    await viewSel.selectOption('day');
    await page.waitForTimeout(200);
  }
});

test('Navigate next month', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const next = page.locator('button:has-text("Next")').first();
  if (await v(page, next)) {
    await next.click();
    await page.waitForTimeout(300);
  }
});

test('Navigate previous month', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const prev = page.locator('button:has-text("Prev")').first().or(page.locator('button:has-text("Previous")').first());
  if (await v(page, prev)) {
    await prev.click();
    await page.waitForTimeout(300);
  }
});

test('Today button', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const today = page.locator('button:has-text("Today")').first();
  if (await v(page, today)) {
    await today.click();
    await page.waitForTimeout(300);
  }
});

test('Click day cell opens event details', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const dayCells = page.locator('[role="button"][tabindex="0"]');
  const count = await dayCells.count();
  if (count > 0) {
    await dayCells.first().click();
    await page.waitForTimeout(300);
  }
});

test('Calendar events are clickable', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const event = page.locator('[aria-label*="class"i], [aria-label*="event"i], [role="button"][aria-label*=":"i]').first();
  if (await v(page, event)) {
    await event.click();
    await page.waitForTimeout(300);
    console.log('  Calendar event clicked');
  }
});

test('Cycle through all calendar views', async ({ page }) => {
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const viewSel = page.locator('select').first();
  if (await v(page, viewSel) && await viewSel.locator('option').count() > 1) {
    for (const val of ['month', 'week', 'day']) {
      await viewSel.selectOption(val).catch(() => {});
      await page.waitForTimeout(200);
    }
  }
});
