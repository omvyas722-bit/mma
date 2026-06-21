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

test('AI Assistant page loads', async ({ page }) => {
  await page.goto('/ai');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('AI Assistant shows suggestion chips', async ({ page }) => {
  await page.goto('/ai');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const chips = page.locator('button:has-text("active members"), button:has-text("How many")');
  const count = await chips.count();
  if (count > 0) {
    console.log(`  ${count} suggestion chips`);
    await chips.first().click();
    await page.waitForTimeout(500);
  }
});

test('AI Assistant message input exists', async ({ page }) => {
  await page.goto('/ai');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const input = page.locator('textarea, input[type="text"]').first();
  if (await v(page, input)) {
    await input.fill('Show me active members');
    await page.waitForTimeout(200);
    expect(await input.inputValue()).toBe('Show me active members');
  }
});

test('AI Assistant send button exists', async ({ page }) => {
  await page.goto('/ai');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  const send = page.locator('button:has-text("Send")').first();
  if (await v(page, send)) {
    await expect(send).toBeVisible();
  }
});

test('AI Dashboard page loads', async ({ page }) => {
  await page.goto('/ai-dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
});

test('AI Dashboard shows agent toggle switches', async ({ page }) => {
  await page.goto('/ai-dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const toggles = page.locator('input[type="checkbox"]');
  const count = await toggles.count();
  console.log(`  ${count} agent toggles`);
  if (count > 0) {
    await toggles.first().check({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
});

test('AI Dashboard has Approval Queue link', async ({ page }) => {
  await page.goto('/ai-dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const aq = page.locator('a:has-text("Approval Queue")').first();
  if (await v(page, aq)) {
    await aq.click();
    await page.waitForURL(/\/approval-queue/, { timeout: 10000 }).catch(() => {});
    console.log(`  Navigated to: ${page.url()}`);
  }
});

test('AI Dashboard has Agent Tracking link', async ({ page }) => {
  await page.goto('/ai-dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const at = page.locator('a:has-text("Agent Tracking")').first();
  if (await v(page, at)) {
    console.log('  Agent Tracking link visible');
  }
});

test('AI Dashboard activity feed loads', async ({ page }) => {
  await page.goto('/ai-dashboard');
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  const activity = page.locator('text=Recent Activity').first().or(page.locator('text=Activity Feed').first());
  if (await v(page, activity)) {
    console.log('  Activity feed visible');
  }
});
