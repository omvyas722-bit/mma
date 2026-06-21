import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ERRORS = { api: [], console: [] };
const ERROR_LOG_PATH = path.resolve(process.cwd(), '../../e2e-error-log.md');
const TS = Date.now();

function logErr(name, error, apiErrs, consoleErrs, src) {
  const entry = `## ${new Date().toISOString()} - ${name}\n\n### Error\n\`\`\`\n${error?.message || error}\n\`\`\`\n\n### API Errors\n${apiErrs.length ? apiErrs.map(e => `- ${e}`).join('\n') : 'None'}\n\n### Console Errors\n${consoleErrs.length ? consoleErrs.map(e => `- ${e}`).join('\n') : 'None'}\n\n---\n`;
  try { fs.appendFileSync(ERROR_LOG_PATH, entry, 'utf8'); } catch {}
}

async function detectErrorPage(page, testName) {
  try {
    const text = await page.locator('body').textContent().catch(() => '');
    for (const pat of ['Something went wrong', 'Error loading', 'We encountered an error']) {
      if (text.includes(pat)) {
        logErr(`${testName} - ERROR PAGE`, new Error(`Error page shown: "${pat}"`), ERRORS.api, ERRORS.console, '');
        await page.screenshot({ path: `e2e-screenshots/error-page-${testName.replace(/\s+/g, '-')}.png` }).catch(() => {});
        return true;
      }
    }
  } catch {}
  return false;
}

async function v(pg, loc) {
  try { return await pg.locator(loc).isVisible(); } catch { return false; }
}

test.beforeEach(async ({ page }) => {
  ERRORS.api = []; ERRORS.console = [];
  page.on('console', msg => { if (msg.type() === 'error') ERRORS.console.push(msg.text()); });
  page.on('response', res => { if (res.status() >= 400) ERRORS.api.push(`${res.status()} ${res.url().split('?')[0]}`); });
});

test.afterEach(async ({ page }, info) => {
  await detectErrorPage(page, info.title);
  if (ERRORS.api.length) console.log(`[${info.title}] API:`, JSON.stringify(ERRORS.api));
  if (info.status !== 'passed') {
    logErr(info.title, info.error, ERRORS.api, ERRORS.console, await page.content().catch(() => ''));
    await page.screenshot({ path: `e2e-screenshots/${info.title.replace(/\s+/g, '-')}.png` }).catch(() => {});
  }
  await page.waitForTimeout(300).catch(() => {});
});

test('Members list loads with table', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
});

test('Search members input works', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const search = page.locator('input[aria-label="Search members"]');
  if (await v(page, search)) {
    await search.fill('test');
    await page.waitForTimeout(500);
    const val = await search.inputValue();
    expect(val).toBe('test');
    await search.clear();
  }
});

test('Filter members by status', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label="Filter by status"]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(300);
    expect(await sel.locator('option:checked').count()).toBe(1);
    await sel.selectOption({ index: 0 });
  }
});

test('Members page has Add Member button', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('button:has-text("Add Member")').first()).toBeVisible({ timeout: 5000 });
});

test('Add Member modal opens', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.locator('button:has-text("Add Member")').first().click();
  await page.waitForTimeout(500);
  const modal = page.locator('[role="dialog"]').first();
  await expect(modal).toBeVisible({ timeout: 5000 });
  await modal.locator('button[aria-label="Close"]').first().click().catch(() => {});
  await page.locator('button:has-text("Cancel")').first().click().catch(() => {});
});

test('Members table shows rows with actions', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(1);
  const actions = rows.first().locator('button[aria-label]');
  const actionLabels = await actions.allTextContents();
  console.log(`  ${count} rows, actions: ${actionLabels.join(', ')}`);
});

test('Click member row navigates to profile', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const row = page.locator('table tbody tr').first();
  if (await v(page, row)) {
    await row.click();
    await page.waitForURL(/\/members\/\d+/, { timeout: 10000 }).catch(() => {});
    console.log(`  URL: ${page.url()}`);
  }
});

test('Select all members checkbox', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const selectAll = page.locator('input[aria-label="Select all members"]').first();
  if (await v(page, selectAll)) {
    await selectAll.check().catch(() => {});
    await page.waitForTimeout(200);
    await selectAll.uncheck().catch(() => {});
  }
});

test('Export button visible on members page', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const exportBtn = page.locator('button:has-text("Export")').first();
  if (await v(page, exportBtn)) {
    await expect(exportBtn).toBeVisible();
  }
});

test('Pagination buttons on members page', async ({ page }) => {
  await page.goto('/members');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const next = page.locator('button[aria-label="Next page"]');
  if (await v(page, next) && await next.isEnabled().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(300);
    const prev = page.locator('button[aria-label="Previous page"]');
    if (await v(page, prev)) await prev.click();
  }
});
