import { test, expect } from '@playwright/test';

test.describe('No stale cache / service worker', () => {
  test('no service worker registered after page load', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasSW = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.length;
    });
    expect(hasSW).toBe(0);
  });

  test('all caches cleared on load', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const cacheCount = await page.evaluate(async () => {
      const names = await caches.keys();
      return names.length;
    });
    expect(cacheCount).toBe(0);
  });

  test('same UI version after hard refresh', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const body = page.locator('body');
    const bg1 = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);

    const html = page.locator('html');
    const hasDark1 = await html.evaluate(el => el.classList.contains('dark'));

    const navLinks = await page.locator('nav a').count();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const bg2 = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const hasDark2 = await html.evaluate(el => el.classList.contains('dark'));

    expect(bg2).toBe(bg1);
    expect(hasDark2).toBe(hasDark1);
    await expect(page.locator('nav a')).toHaveCount(navLinks);
  });
});
