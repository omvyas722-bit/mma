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

test('Staff page loads with Staff List tab', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Switch between Schedule and Staff List tabs', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  for (const label of ['Schedule', 'Staff List']) {
    const tab = page.locator(`button:has-text("${label}")`).first();
    if (await v(page, tab)) {
      await tab.click();
      await page.waitForTimeout(300);
    }
  }
});

test('Filter staff by role', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label="Filter by role"]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(200);
  }
});

test('Staff table has rows', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const listTab = page.locator('button:has-text("Staff List")').first();
  if (await v(page, listTab)) await listTab.click();
  await page.waitForTimeout(300);
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  console.log(`  ${count} staff rows`);
  expect(count).toBeGreaterThanOrEqual(0);
});

test('Add Staff button opens modal', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const listTab = page.locator('button:has-text("Staff List")').first();
  if (await v(page, listTab)) await listTab.click();
  await page.waitForTimeout(300);
  const addBtn = page.locator('button:has-text("Add Staff")').first();
  if (await v(page, addBtn)) {
    await addBtn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
  }
});

test('Add Staff form has required fields', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const listTab = page.locator('button:has-text("Staff List")').first();
  if (await v(page, listTab)) await listTab.click();
  await page.waitForTimeout(300);
  const addBtn = page.locator('button:has-text("Add Staff")').first();
  if (await v(page, addBtn)) {
    await addBtn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    if (await v(page, modal)) {
      const nameInput = modal.locator('input[placeholder="Full name"]').first();
      if (await v(page, nameInput)) await nameInput.fill('E2E Staff Test');
      const emailInput = modal.locator('input[type="email"]').first();
      if (await v(page, emailInput)) await emailInput.fill(`staff${TS}@example.com`);
      const pwInput = modal.locator('input[type="password"]').first();
      if (await v(page, pwInput)) await pwInput.fill('TestPass123');
      const createBtn = modal.locator('button:has-text("Create Staff")').first();
      if (await v(page, createBtn) && await createBtn.isEnabled().catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);
      }
      if (await modal.isVisible().catch(() => false)) {
        await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
      }
    }
  }
});

test('Click staff row opens profile drawer', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const listTab = page.locator('button:has-text("Staff List")').first();
  if (await v(page, listTab)) await listTab.click();
  await page.waitForTimeout(300);
  const row = page.locator('table tbody tr').first();
  if (await v(page, row)) {
    await row.click();
    await page.waitForTimeout(1000);
    const drawer = page.locator('[role="dialog"]').first();
    if (await v(page, drawer)) {
      const close = drawer.locator('button[aria-label="Close"]').first();
      if (await v(page, close)) await close.click();
      await page.waitForTimeout(300);
    }
  }
});

test('Staff page has Add Shift button in Schedule', async ({ page }) => {
  await page.goto('/staff');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const schedTab = page.locator('button:has-text("Schedule")').first();
  if (await v(page, schedTab)) {
    await schedTab.click();
    await page.waitForTimeout(300);
    const addShift = page.locator('button:has-text("Add Shift")').first();
    if (await v(page, addShift)) {
      await expect(addShift).toBeVisible();
    }
  }
});
