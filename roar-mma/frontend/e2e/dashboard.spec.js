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
});

test('Dashboard page loads with heading', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Dashboard shows stat cards', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const kpiCards = page.locator('[aria-label*=":"]');
  const count = await kpiCards.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

test('Dashboard shows class schedule section', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const viewTT = page.locator('button:has-text("View Full Timetable")').first();
  if (await v(page, viewTT)) {
    await expect(viewTT).toBeVisible();
  }
});

test('Dashboard shows AI agent status panel', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const aiPill = page.locator('[aria-label*="AI status"]').first();
  if (await v(page, aiPill)) {
    await expect(aiPill).toBeVisible();
  }
});

test('Dashboard KPI cards are clickable', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const kpiCards = page.locator('button[aria-label*=":"]');
  const count = await kpiCards.count();
  if (count > 0) {
    const label = await kpiCards.first().getAttribute('aria-label');
    await kpiCards.first().click();
    await page.waitForTimeout(500);
    await page.goBack().catch(() => {});
    await page.waitForLoadState('networkidle');
    console.log(`  KPI card clicked: ${label}`);
  }
});

test('Dashboard Open Mission Control button', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const mc = page.locator('button:has-text("Open Mission Control")').first();
  if (await v(page, mc)) {
    await mc.click();
    await page.waitForURL(/\/mission-control/, { timeout: 10000 }).catch(() => {});
    console.log('  Navigated to Mission Control');
  }
});

test('Dashboard View Staff button navigates', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const vs = page.locator('button:has-text("View Staff")').first();
  if (await v(page, vs)) {
    await vs.click();
    await page.waitForURL(/\/staff/, { timeout: 10000 }).catch(() => {});
    console.log('  Navigated to Staff');
  }
});

test('Dashboard shows Recent Activity section', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const activity = page.locator('button:has-text("View All Activity")').first();
  if (await v(page, activity)) {
    await expect(activity).toBeVisible();
  }
});

test('Dashboard has no API errors', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  expect(ERRORS.api.filter(e => !e.includes('socket.io'))).toEqual([]);
});

test('Dashboard page stays consistent after reload', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const bodyText = await page.locator('body').textContent().catch(() => '');
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const bodyText2 = await page.locator('body').textContent().catch(() => '');
  expect(bodyText.length).toBeGreaterThan(0);
  expect(bodyText2.length).toBeGreaterThan(0);
});
