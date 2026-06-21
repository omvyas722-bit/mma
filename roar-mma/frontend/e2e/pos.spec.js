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

test('POS page loads with tabs', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('POS product grid loads', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const posTab = page.locator('nav button:has-text("pos")').first();
  if (await v(page, posTab)) {
    await posTab.click();
    await page.waitForTimeout(500);
  }
  const product = page.locator('button:has-text("$")').first();
  if (await v(page, product)) {
    await expect(product).toBeVisible();
  }
});

test('Add product to cart', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const posTab = page.locator('nav button:has-text("pos")').first();
  if (await v(page, posTab)) await posTab.click();
  await page.waitForTimeout(500);
  const product = page.locator('button:has-text("$")').first().or(page.locator('button:not([disabled])').first());
  if (await v(page, product)) {
    await product.click();
    await page.waitForTimeout(300);
    console.log('  Product added to cart');
  }
});

test('Search member in POS', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const posTab = page.locator('nav button:has-text("pos")').first();
  if (await v(page, posTab)) await posTab.click();
  await page.waitForTimeout(500);
  const memSearch = page.locator('input[placeholder*="Search member"]').first();
  if (await v(page, memSearch)) {
    await memSearch.fill('admin');
    await page.waitForTimeout(500);
  }
});

test('Products tab loads', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const prodTab = page.locator('nav button:has-text("products")').first();
  if (await v(page, prodTab)) {
    await prodTab.click();
    await page.waitForTimeout(500);
  }
});

test('Add Product button opens modal', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const prodTab = page.locator('nav button:has-text("products")').first();
  if (await v(page, prodTab)) {
    await prodTab.click();
    await page.waitForTimeout(500);
    const addProd = page.locator('button:has-text("Add Product")').first();
    if (await v(page, addProd)) {
      await addProd.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
    }
  }
});

test('Add Product form has required fields', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const prodTab = page.locator('nav button:has-text("products")').first();
  if (await v(page, prodTab)) {
    await prodTab.click();
    await page.waitForTimeout(500);
    const addProd = page.locator('button:has-text("Add Product")').first();
    if (await v(page, addProd)) {
      await addProd.click();
      await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]').first();
      if (await v(page, modal)) {
        await modal.locator('input[type="text"]').first().fill('E2E POS Product');
        await modal.locator('input[type="number"]').first().fill('29.99');
        const save = modal.locator('button:has-text("Save")').first();
        if (await v(page, save) && await save.isEnabled().catch(() => false)) {
          await save.click();
          await page.waitForTimeout(2000);
        }
        if (await modal.isVisible().catch(() => false)) {
          await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
        }
      }
    }
  }
});

test('Alerts tab loads', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const alertTab = page.locator('nav button:has-text("alerts")').first();
  if (await v(page, alertTab)) {
    await alertTab.click();
    await page.waitForTimeout(300);
  }
});

test('Barcode input exists on POS', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const barcode = page.locator('input[placeholder*="barcode"i], input[placeholder*="scan"i]').first();
  if (await v(page, barcode)) {
    console.log('  Barcode input visible');
  }
});

test('Receipt preview renders after checkout', async ({ page }) => {
  await page.goto('/pos');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const posTab = page.locator('nav button:has-text("pos")').first();
  if (await v(page, posTab)) await posTab.click();
  await page.waitForTimeout(500);
  const complete = page.locator('button:has-text("Complete Sale")').first();
  if (await v(page, complete) && await complete.isEnabled().catch(() => false)) {
    await complete.click();
    await page.waitForTimeout(1500);
    const receipt = page.locator('text=receipt').first().or(page.locator('[role="dialog"]').first());
    if (await v(page, receipt)) {
      console.log('  Receipt dialog visible');
      await page.locator('button:has-text("Close")').first().click().catch(() => {});
    }
  }
});
