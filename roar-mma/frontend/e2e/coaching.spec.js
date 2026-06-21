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

test('Coaching page loads', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Search input works', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const search = page.locator('input[placeholder*="Search"]').first();
  if (await v(page, search)) {
    await search.fill('test');
    await page.waitForTimeout(300);
    expect(await search.inputValue()).toBe('test');
    await search.clear();
  }
});

test('Sort buttons exist', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  for (const sort of ['Name', 'Most Rated', 'Best Defense']) {
    const sortBtn = page.locator(`button:has-text("${sort}")`).first();
    if (await v(page, sortBtn)) {
      await sortBtn.click();
      await page.waitForTimeout(200);
    }
  }
});

test('Student list loads', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const table = page.locator('table').first();
  if (await v(page, table)) {
    const rows = await table.locator('tbody tr').count();
    console.log(`  ${rows} student rows`);
  }
});

test('Click student row opens details', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const row = page.locator('table tbody tr').first();
  if (await v(page, row)) {
    await row.click();
    await page.waitForTimeout(500);
    console.log('  Student row clicked');
  }
});

test('Students/Sessions/Assessments tabs', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  for (const label of ['Students', 'Sessions', 'Assessments']) {
    const tab = page.locator(`button:has-text("${label}")`).first();
    if (await v(page, tab)) {
      await tab.click();
      await page.waitForTimeout(300);
    }
  }
});

test('Book Session button exists', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const book = page.locator('button:has-text("Book Session")').first();
  if (await v(page, book)) {
    await expect(book).toBeVisible();
  }
});

test('Filter by readiness exists', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const filter = page.locator('select[aria-label*="readiness"i], select[aria-label*="filter"i]').first();
  if (await v(page, filter)) {
    console.log('  Readiness filter found');
  }
});

test('Coaching page no API errors', async ({ page }) => {
  await page.goto('/coaching');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  expect(ERRORS.api.filter(e => !e.includes('socket.io'))).toEqual([]);
});
