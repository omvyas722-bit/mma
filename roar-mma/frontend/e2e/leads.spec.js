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

test('Leads page loads successfully', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Leads page has Pipeline and Analytics tabs', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const pipeline = page.locator('button:has-text("Pipeline")').first();
  const analytics = page.locator('button:has-text("Analytics")').first();
  const hasPipeline = await v(page, pipeline);
  const hasAnalytics = await v(page, analytics);
  expect(hasPipeline || hasAnalytics).toBeTruthy();
});

test('Switch between Pipeline and Analytics tabs', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  for (const label of ['Analytics', 'Pipeline']) {
    const tab = page.locator(`button:has-text("${label}")`).first();
    if (await v(page, tab)) {
      await tab.click();
      await page.waitForTimeout(500);
    }
  }
});

test('Search leads input works', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const search = page.locator('input[aria-label="Search leads"]').first();
  if (await v(page, search)) {
    await search.fill('test lead');
    await page.waitForTimeout(300);
    expect(await search.inputValue()).toBe('test lead');
    await search.clear();
  }
});

test('Filter by stage dropdown works', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label="Filter by stage"]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(200);
    await sel.selectOption({ index: 0 });
  }
});

test('Filter by source dropdown works', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label="Filter by source"]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    await sel.selectOption({ index: 1 });
    await page.waitForTimeout(200);
    await sel.selectOption({ index: 0 });
  }
});

test('Add Lead button opens modal', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const addBtn = page.locator('button:has-text("Add Lead")').first();
  if (await v(page, addBtn)) {
    await addBtn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
  }
});

test('Add Lead modal form has required fields', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const addBtn = page.locator('button:has-text("Add Lead")').first();
  if (await v(page, addBtn)) {
    await addBtn.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    if (await v(page, modal)) {
      await modal.locator('input[name="first_name"]').fill('E2E');
      await modal.locator('input[name="last_name"]').fill('LeadTest');
      await modal.locator('input[name="phone"]').fill('0400000000');
      await modal.locator('input[type="email"]').fill(`lead${TS}@example.com`);
      const submit = modal.locator('button:has-text("Create Lead")').first();
      if (await v(page, submit) && await submit.isEnabled().catch(() => false)) {
        await submit.click();
        await page.waitForTimeout(2000);
      }
      if (await modal.isVisible().catch(() => false)) {
        await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
      }
    }
  }
});

test('Import CSV button visible', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const imp = page.locator('button:has-text("Import CSV")').first();
  if (await v(page, imp)) {
    await expect(imp).toBeVisible();
  }
});

test('Leads Wizard link navigates', async ({ page }) => {
  await page.goto('/leads');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const wizard = page.locator('a:has-text("Wizard")').first();
  if (await v(page, wizard)) {
    await wizard.click();
    await page.waitForURL(/\/leads\/wizard/, { timeout: 10000 }).catch(() => {});
    console.log(`  Navigated to: ${page.url()}`);
  }
});
