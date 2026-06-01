import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('shows login page with sign in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ROAR MMA')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('ROAR MMA')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('AI Chat', () => {
  test('shows AI dashboard page when unauthenticated redirects', async ({ page }) => {
    await page.goto('/ai');
    await expect(page.getByText('ROAR MMA')).toBeVisible({ timeout: 10000 });
  });
});
