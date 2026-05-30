const { chromium } = require('playwright');

const FRONTEND = 'http://localhost:5173';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log('  \u2705 ' + name);
      passed++;
    } catch (err) {
      console.log('  \u274c ' + name + ': ' + err.message);
      failed++;
    }
  }

  console.log('\n\u2661 Playwright E2E Browser Tests\n');

  await test('Login page loads', async () => {
    await page.goto(FRONTEND + '/login', { waitUntil: 'networkidle' });
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 8000 });
  });

  async function doLogin(email, password) {
    await page.goto(FRONTEND + '/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  await test('Login with default admin credentials', async () => {
    const success = await doLogin('owner@roarmma.com.au', 'admin123');
    if (!success) {
      // Fallback to created admin
      const success2 = await doLogin('admin@roarmma.com.au', 'changeme123');
      if (!success2) throw new Error('Login failed with both credential sets');
    }
  });

  await test('AI Assistant page loads', async () => {
    await page.goto(FRONTEND + '/ai', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // Debug: capture text content
    const bodyText = await page.locator('body').textContent();
    if (!bodyText.toLowerCase().includes('ai') && !bodyText.toLowerCase().includes('assistant') && !bodyText.toLowerCase().includes('ask me')) {
      // Save screenshot for debugging
      await page.screenshot({ path: 'ai_debug.png' });
      throw new Error('AI page content not found. Body starts with: ' + bodyText.substring(0, 200));
    }
  });

  await test('AI Dashboard page loads', async () => {
    await page.goto(FRONTEND + '/ai-dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').textContent();
    if (!bodyText.toLowerCase().includes('ai') && !bodyText.toLowerCase().includes('dashboard') && !bodyText.toLowerCase().includes('monitor')) {
      await page.screenshot({ path: 'dashboard_debug.png' });
      throw new Error('Dashboard content not found. Body: ' + bodyText.substring(0, 200));
    }
  });

  await test('AI Dashboard shows status cards', async () => {
    await page.goto(FRONTEND + '/ai-dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    if (!bodyText.includes('AI Status') && !bodyText.includes('Uptime') && !bodyText.includes('Actions')) {
      throw new Error('No status cards. Body: ' + bodyText.substring(0, 300));
    }
  });

  await test('AI Dashboard shows agent controls', async () => {
    await page.goto(FRONTEND + '/ai-dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    if (!bodyText.includes('Agent')) {
      await page.screenshot({ path: 'agent_debug.png' });
      throw new Error('No agent controls. Body: ' + bodyText.substring(0, 300));
    }
  });

  console.log('\n\u2729 Results: ' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total\n');
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
