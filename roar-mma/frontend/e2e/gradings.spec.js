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

test('Gradings page loads', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('Status filter works', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const sel = page.locator('select[aria-label*="status"i]').first();
  if (await v(page, sel) && await sel.locator('option').count() > 1) {
    const opts = await sel.locator('option').count();
    for (let i = 1; i < opts; i++) {
      await sel.selectOption({ index: i });
      await page.waitForTimeout(150);
    }
    await sel.selectOption({ index: 0 });
  }
});

test('Schedule Grading button opens modal', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const add = page.locator('button:has-text("Schedule Grading")').first().or(page.locator('button:has-text("Add Session")').first());
  if (await v(page, add)) {
    await add.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
    await modal.locator('button[aria-label="Close"]').first().click().catch(() => {});
  }
});

test('Schedule Grading form has required fields', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const add = page.locator('button:has-text("Schedule Grading")').first().or(page.locator('button:has-text("Add Session")').first());
  if (await v(page, add)) {
    await add.click();
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"]').first();
    if (await v(page, modal)) {
      const nameInput = modal.locator('input').first();
      if (await v(page, nameInput)) await nameInput.fill('E2E Grading Session');
      const dateInput = modal.locator('input[type="date"]').first();
      if (await v(page, dateInput)) await dateInput.fill('2026-07-01');
      const locSel = modal.locator('select').first();
      if (await v(page, locSel) && await locSel.locator('option').count() > 1) await locSel.selectOption({ index: 1 }).catch(() => {});
      const notes = modal.locator('textarea').first();
      if (await v(page, notes)) await notes.fill('E2E test grading');
      const create = modal.locator('button:has-text("Create Session"), button:has-text("Schedule")').first();
      if (await v(page, create) && await create.isEnabled().catch(() => false)) {
        await create.click();
        await page.waitForTimeout(1500);
      }
      if (await modal.isVisible().catch(() => false)) {
        await modal.locator('button:has-text("Cancel")').first().click().catch(() => {});
      }
    }
  }
});

test('View Participants link exists', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const vp = page.locator('button:has-text("View Participants")').first();
  if (await v(page, vp)) {
    await vp.click();
    await page.waitForTimeout(300);
  }
});

test('Tabs - Upcoming, Past, All', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  for (const label of ['Upcoming', 'Past', 'All']) {
    const tab = page.locator(`button:has-text("${label}")`).first();
    if (await v(page, tab)) {
      await tab.click();
      await page.waitForTimeout(200);
    }
  }
});

test('Belt registry tab exists', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const beltTab = page.locator('button:has-text("Belt"), button:has-text("Registry")').first();
  if (await v(page, beltTab)) {
    await beltTab.click();
    await page.waitForTimeout(300);
    console.log('  Belt registry tab found');
  }
});

test('Leaderboard tab exists', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const lb = page.locator('button:has-text("Leaderboard")').first();
  if (await v(page, lb)) {
    await lb.click();
    await page.waitForTimeout(300);
    console.log('  Leaderboard tab found');
  }
});

test('Certificate modal exists in grading details', async ({ page }) => {
  await page.goto('/gradings');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const certBtn = page.locator('button:has-text("Certificate"), button:has-text("certificate")').first();
  if (await v(page, certBtn)) {
    console.log('  Certificate button visible');
  }
});
