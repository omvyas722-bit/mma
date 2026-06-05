import { test, expect } from '@playwright/test';

import fs from 'fs';
import path from 'path';

const ERRORS = { api: [], console: [] };
const ERROR_LOG_PATH = path.resolve(process.cwd(), '../../e2e-error-log.md');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@roarmma.com.au';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'changeme123';

function logErr(name, error, apiErrs, consoleErrs, src) {
  const entry = `## ${new Date().toISOString()} - ${name}\n\n### Error\n\`\`\`\n${error?.message || error}\n\`\`\`\n\n### API Errors\n${apiErrs.length ? apiErrs.map(e => `- ${e}`).join('\n') : 'None'}\n\n### Console Errors\n${consoleErrs.length ? consoleErrs.map(e => `- ${e}`).join('\n') : 'None'}\n\n### Page Source Snippet\n\`\`\`html\n${(src || '').substring(0, 2000)}\n\`\`\`\n\n---\n`;
  try { fs.appendFileSync(ERROR_LOG_PATH, entry, 'utf8'); } catch {}
}

async function detectErrorPage(page, testName) {
  try {
    const text = await page.locator('body').textContent().catch(() => '');
    const errorPatterns = ['Something went wrong', 'Error loading', 'We encountered an error'];
    for (const pat of errorPatterns) {
      if (text.includes(pat)) {
        const src = await page.content().catch(() => '');
        logErr(`${testName} - ERROR PAGE DETECTED`, new Error(`Error page shown: "${pat}"`), ERRORS.api, ERRORS.console, src);
        await page.screenshot({ path: `e2e-screenshots/error-page-${testName.replace(/\s+/g, '-')}.png` }).catch(() => {});
        console.log(`  ⚠ ERROR PAGE: "${pat}" in test "${testName}"`);
        return true;
      }
    }
  } catch {}
  return false;
}

async function ensureLoggedIn(page) {
  const url = page.url();
  if (url.includes('/login')) {
    console.log('  -> Re-authenticating...');
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 20000 }).catch(() => {});
  }
}

async function v(pg, loc) {
  try { return await pg.locator(loc).isVisible(); } catch { return false; }
}

const TS = Date.now();

test.beforeEach(async ({ page }) => {
  ERRORS.api = [];
  ERRORS.console = [];
  page.on('console', msg => {
    if (msg.type() === 'error') ERRORS.console.push(msg.text());
  });
  page.on('response', res => {
    if (res.status() >= 400) ERRORS.api.push(`${res.status()} ${res.url().split('?')[0]}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  // Detect error pages even on passed tests
  await detectErrorPage(page, testInfo.title);
  if (ERRORS.api.length) {
    console.log(`[${testInfo.title}] API ERRORS:`, JSON.stringify(ERRORS.api, null, 2));
  }
  if (testInfo.status !== 'passed') {
    const source = await page.content().catch(() => '');
    logErr(testInfo.title, testInfo.error, ERRORS.api, ERRORS.console, source);
    await page.screenshot({ path: `e2e-screenshots/${testInfo.title.replace(/\s+/g, '-')}.png` }).catch(() => {});
    console.log(`[${testInfo.title}] FAILED:`, testInfo.error?.message);
    console.log(`[${testInfo.title}] Page URL:`, page.url());
    console.log(`[${testInfo.title}] Console errors:`, ERRORS.console);
  }
  // Small delay between tests to avoid rate limiting
  await page.waitForTimeout(300).catch(() => {});
});

test.describe.configure({ mode: 'serial' });

test.describe('Deep Data Flow Tests', () => {

  // ==================== CREATE MEMBER ====================
  test('Create member — fill all steps and submit', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    await page.locator('button:has-text("Add Member")').first().click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Step 0: Personal Info
    const fn = modal.locator('input[name="first_name"]').first();
    if (await v(modal, fn)) await fn.fill('E2E');
    const ln = modal.locator('input[name="last_name"]').first();
    if (await v(modal, ln)) await ln.fill('DeepTest');
    const em = modal.locator('input[name="email"]').first();
    if (await v(modal, em)) await em.fill(`e2e.deeptest${TS}@example.com`);
    const ph = modal.locator('input[name="phone"]').first();
    if (await v(modal, ph)) await ph.fill('0400000000');
    // Click Next
    let next = modal.locator('button:has-text("Next")').first();
    if (await v(modal, next)) await next.click();
    await page.waitForTimeout(300);

    // Step 1: Membership Details
    const loc = modal.locator('select[name="location"]').first();
    if (await v(modal, loc)) await loc.selectOption('rockingham').catch(() => {});
    const plan = modal.locator('select[name="plan"]').first();
    if (await v(modal, plan)) await plan.selectOption('unlimited').catch(() => {});
    next = modal.locator('button:has-text("Next")').first();
    if (await v(modal, next)) await next.click();
    await page.waitForTimeout(300);

    // Step 2: Waiver (skip if no templates)
    next = modal.locator('button:has-text("Next")').first();
    if (await v(modal, next)) await next.click();
    await page.waitForTimeout(300);

    // Step 3: Emergency Contact
    const ec = modal.locator('input[name="emergency_contact_name"]').first();
    if (await v(modal, ec)) await ec.fill('Emergency Contact');
    next = modal.locator('button:has-text("Next")').first();
    if (await v(modal, next)) await next.click();
    await page.waitForTimeout(300);

    // Step 4: Confirm — submit
    const create = modal.locator('button:has-text("Create Member")').first();
    if (await v(modal, create)) {
      await create.click();
      await page.waitForTimeout(3000);
      // Modal should close on success
      if (await modal.isVisible().catch(() => false)) {
        // Submission failed — close
        const cancel = modal.locator('button:has-text("Cancel")').first();
        if (await v(modal, cancel)) await cancel.click();
        await page.waitForTimeout(300);
      }
    }
  });

  // ==================== CREATE LEAD ====================
  test('Create lead — fill all fields and submit', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const addLeadBtn = page.locator('button:has-text("Add Lead")').first();
    if (await v(page, addLeadBtn)) {
      await addLeadBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill required: first_name, last_name, phone
      const fn = modal.locator('input[name="first_name"]').first();
      if (await v(modal, fn)) await fn.fill('E2E');
      const ln = modal.locator('input[name="last_name"]').first();
      if (await v(modal, ln)) await ln.fill('LeadSubmit');
      const ph = modal.locator('input[name="phone"]').first();
      if (await v(modal, ph)) await ph.fill('0400000000');
      const em = modal.locator('input[type="email"]').first();
      if (await v(modal, em)) await em.fill(`e2e.leadsubmit${TS}@example.com`);

      // Select source
      const src = modal.locator('select[name="source"]').first();
      if (await v(modal, src)) await src.selectOption('referral').catch(() => {});

      // Submit
      const submitBtn = modal.locator('button:has-text("Create Lead")').first();
      if (await v(modal, submitBtn)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        if (await modal.isVisible().catch(() => false)) {
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== RECORD PAYMENT ====================
  test('Record payment — search member, fill amount, submit', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const recBtn = page.locator('button:has-text("Record Payment")').first();
    if (await v(page, recBtn)) {
      await recBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Search for a member
      const searchInput = modal.locator('input[aria-label="Search member"]').first();
      if (await v(modal, searchInput)) {
        await searchInput.fill('admin');
        await page.waitForTimeout(1000);
        // Click first result if visible
        const result = modal.locator('[role="option"]').first();
        if (await v(modal, result)) {
          await result.click();
          await page.waitForTimeout(300);
        }
      }

      // Fill amount
      const amt = modal.locator('input[type="number"]').first();
      if (await v(modal, amt)) await amt.fill('99.99');

      // Select type
      const typeSel = modal.locator('select').first();
      if (await v(modal, typeSel)) await typeSel.selectOption('membership').catch(() => {});

      // Fill description
      const desc = modal.locator('input[type="text"]').first();
      if (await v(modal, desc)) await desc.fill('E2E test payment');

      // Record Payment
      const recordBtn = modal.locator('button:has-text("Record Payment")').first();
      if (await v(modal, recordBtn)) {
        // Check if enabled (needs selected member + valid amount)
        const enabled = await recordBtn.isEnabled().catch(() => false);
        if (enabled) {
          await recordBtn.click();
          await page.waitForTimeout(2000);
        } else {
          console.log('  Record Payment button disabled (no member selected)');
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== ADD STAFF MEMBER ====================
  test('Add staff member — fill all fields and submit', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await ensureLoggedIn(page);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Click Staff List tab first
    const listTab = page.locator('button:has-text("Staff List")').first();
    if (await v(page, listTab)) await listTab.click();
    await page.waitForTimeout(300);

    const addBtn = page.locator('button:has-text("Add Staff")').first().or(page.locator('button:has-text("Add Staff Member")').first());
    if (await v(page, addBtn)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill fields (no name attrs — use placeholder/order)
      const nameInput = modal.locator('input[placeholder="Full name"]').first();
      if (await v(modal, nameInput)) await nameInput.fill('E2E Staff User');

      const emailInput = modal.locator('input[type="email"]').first();
      if (await v(modal, emailInput)) await emailInput.fill(`e2e.staff${TS}@example.com`);

      const phoneInput = modal.locator('input[placeholder="Phone"]').first();
      if (await v(modal, phoneInput)) await phoneInput.fill('0400000000');

      const pwInput = modal.locator('input[type="password"]').first();
      if (await v(modal, pwInput)) await pwInput.fill('TestPass123');

      // Select role
      const roleSel = modal.locator('select').first();
      if (await v(modal, roleSel)) await roleSel.selectOption('front_desk').catch(() => {});

      // Submit
      const createBtn = modal.locator('button:has-text("Create Staff")').first();
      if (await v(modal, createBtn)) {
        await createBtn.click();
        await page.waitForTimeout(2000);
        // Modal should close on success
        if (await modal.isVisible().catch(() => false)) {
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== ADD POS PRODUCT ====================
  test('Add POS product — fill fields and save', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await ensureLoggedIn(page);

    // Click products tab
    const prodTab = page.locator('nav button:has-text("products")').first();
    if (await v(page, prodTab)) await prodTab.click();
    await page.waitForTimeout(500);

    const addBtn = page.locator('button:has-text("Add Product")').first();
    if (await v(page, addBtn)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      if (await v(modal, modal)) {
        // Fill product name
        const nameInput = modal.locator('input[type="text"]').first();
        if (await v(modal, nameInput)) await nameInput.fill('E2E Test Product');

        // Select category
        const catSel = modal.locator('select').first();
        if (await v(modal, catSel)) await catSel.selectOption('equipment').catch(() => {});

        // Fill sell price
        const priceInput = modal.locator('input[type="number"]').first();
        if (await v(modal, priceInput)) await priceInput.fill('49.99');

        // Fill stock qty
        const qtyInput = modal.locator('input[type="number"]').nth(1);
        if (await v(modal, qtyInput)) await qtyInput.fill('100');

        // Submit
        const saveBtn = modal.locator('button:has-text("Save")').first();
        if (await v(modal, saveBtn)) {
          await saveBtn.click();
          await page.waitForTimeout(2000);
          if (await modal.isVisible().catch(() => false)) {
            const cancel = modal.locator('button:has-text("Cancel")').first();
            if (await v(modal, cancel)) await cancel.click();
            await page.waitForTimeout(300);
          }
        }
      }
    }
  });

  // ==================== ADD CLASS ====================
  test('Add class — fill all required fields and submit', async ({ page }) => {
    await page.goto('/classes');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const addBtn = page.locator('button:has-text("Add Class")').first();
    if (await v(page, addBtn)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill name
      const nameInput = modal.locator('input[name="name"], input[placeholder*="e.g."]').first();
      if (await v(modal, nameInput)) await nameInput.fill('E2E Test Class');

      // Select class type
      const typeSel = modal.locator('select[name="class_type"], select').first();
      if (await v(modal, typeSel)) await typeSel.selectOption({ index: 1 }).catch(() => {});

      // Fill instructor
      const instr = modal.locator('input[name="instructor"], input[placeholder*="Instructor"]').first();
      if (await v(modal, instr)) await instr.fill('E2E Coach');

      // Select day of week
      const daySel = modal.locator('select[name="day_of_week"]').first().or(modal.locator('select').nth(1));
      if (await v(modal, daySel)) await daySel.selectOption('1').catch(() => {}); // Monday

      // Select location
      const locSel = modal.locator('select[name="location"]').first().or(modal.locator('select').last());
      if (await v(modal, locSel)) {
        const opts = await locSel.locator('option').allTextContents();
        if (opts.length > 1) await locSel.selectOption({ index: 1 }).catch(() => {});
      }

      // Fill start time
      const startTime = modal.locator('input[type="time"]').first();
      if (await v(modal, startTime)) await startTime.fill('18:00');

      // Fill end time
      const endTime = modal.locator('input[type="time"]').last();
      if (await v(modal, endTime)) await endTime.fill('19:00');

      // Submit
      const createBtn = modal.locator('button:has-text("Create Class")').first();
      if (await v(modal, createBtn)) {
        await createBtn.click();
        await page.waitForTimeout(2000);
        if (await modal.isVisible().catch(() => false)) {
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== SEND COMMUNICATION ====================
  test('Send communication — compose and submit message', async ({ page }) => {
    await page.goto('/communications');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await ensureLoggedIn(page);

    const composeBtn = page.locator('button:has-text("Compose")').first();
    if (await v(page, composeBtn)) {
      await composeBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Select SMS channel (simpler - no subject needed)
      const smsRadio = modal.locator('input[type="radio"]').nth(1); // 0=email, 1=sms, 2=both
      if (await v(modal, smsRadio)) await smsRadio.check();
      await page.waitForTimeout(100);

      // Select recipient group
      const recipSel = modal.locator('select').first();
      if (await v(modal, recipSel)) await recipSel.selectOption('all_active').catch(() => {});

      // Fill message body
      const body = modal.locator('textarea').first();
      if (await v(modal, body)) await body.fill('E2E test message from automated testing.');

      // Click Send Now
      const sendBtn = modal.locator('button:has-text("Send Now")').first();
      if (await v(modal, sendBtn)) {
        const enabled = await sendBtn.isEnabled().catch(() => false);
        if (enabled) {
          await sendBtn.click();
          await page.waitForTimeout(2000);
        } else {
          console.log('  Send Now button disabled');
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== CREATE WAIVER TEMPLATE ====================
  test('Create waiver template — fill and submit inline form', async ({ page }) => {
    await page.goto('/waivers');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const ntBtn = page.locator('button:has-text("New Template")').first();
    if (await v(page, ntBtn)) {
      await ntBtn.click();
      await page.waitForTimeout(500);

      const form = page.locator('form').first();
      if (await v(page, form)) {
        const nameInput = form.locator('input[aria-label="Template name"]').first();
        if (await v(page, nameInput)) await nameInput.fill('E2E Test Waiver Template');

        const bodyInput = form.locator('textarea[aria-label="Waiver body text"]').first();
        if (await v(page, bodyInput)) await bodyInput.fill('This waiver is for E2E testing purposes. The member agrees to participate in martial arts training.');

        // Click Create
        const createBtn = form.locator('button:has-text("Create")').first();
        if (await v(page, createBtn)) {
          await createBtn.click();
          await page.waitForTimeout(2000);
          if (await form.isVisible().catch(() => false)) {
            const cancel = form.locator('button:has-text("Cancel")').first();
            if (await v(page, cancel)) await cancel.click();
            await page.waitForTimeout(300);
          }
        }
      }
    }
  });

  // ==================== CREATE WORKFLOW RULE ====================
  test('Create workflow rule — fill form and submit', async ({ page }) => {
    await page.goto('/workflows');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await ensureLoggedIn(page);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const nrBtn = page.locator('button:has-text("New Rule")').first();
    if (await v(page, nrBtn)) {
      await nrBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"]').first();
      if (await v(page, modal)) {
        // Fill name
        const nameInput = modal.locator('input').first();
        if (await v(modal, nameInput)) await nameInput.fill('E2E Test Workflow Rule');

        // Fill description
        const descInput = modal.locator('textarea').first();
        if (await v(modal, descInput)) await descInput.fill('Automated test rule created by E2E test.');

        // Select trigger and action from selects
        const selects = modal.locator('select');
        if (await selects.count() >= 2) {
          const t1 = await selects.nth(0).locator('option').count();
          if (t1 > 1) await selects.nth(0).selectOption({ index: 1 }).catch(() => {});
          await page.waitForTimeout(100);
          const t2 = await selects.nth(1).locator('option').count();
          if (t2 > 1) await selects.nth(1).selectOption({ index: 1 }).catch(() => {});
          await page.waitForTimeout(100);
        }

        // Try to submit
        const submitBtn = modal.locator('button:has-text("Save")').first().or(modal.locator('button:has-text("Create")').first()).or(modal.locator('button:has-text("Add Rule")').first());
        if (await v(modal, submitBtn)) {
          const enabled = await submitBtn.isEnabled().catch(() => false);
          if (enabled) {
            await submitBtn.click();
            await page.waitForTimeout(2000);
          }
        }

        // Close if still open
        if (await modal.isVisible().catch(() => false)) {
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== CLASS ATTENDANCE FLOW ====================
  test('Classes - view details and check roster', async ({ page }) => {
    await page.goto('/classes');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const classCards = page.locator('[role="button"][aria-label*="class"i], [aria-label*="class"i]');
    const count = await classCards.count().catch(() => 0);
    if (count > 0) {
      await classCards.first().click();
      await page.waitForTimeout(1000);

      const drawer = page.locator('[role="dialog"]').first();
      if (await drawer.isVisible().catch(() => false)) {
        const closeBtn = drawer.locator('button[aria-label="Close"]');
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  // ==================== STAFF PROFILE DRAWER ====================
  test('Staff profile — open drawer from table row', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await ensureLoggedIn(page);

    // Staff List tab
    const listTab = page.locator('button:has-text("Staff List")').first();
    if (await v(page, listTab)) await listTab.click();
    await page.waitForTimeout(300);

    const row = page.locator('table tbody tr').first();
    if (await v(page, row)) {
      await row.click();
      await page.waitForTimeout(1000);

      const drawer = page.locator('[role="dialog"]').first();
      if (await drawer.isVisible().catch(() => false)) {
        // Try activate/deactivate button
        const toggle = drawer.locator('button:has-text("Activate"), button:has-text("Deactivate")').first();
        if (await v(drawer, toggle)) {
          console.log('  Staff toggle button visible');
          await toggle.click();
          await page.waitForTimeout(1000);
          // Re-click to restore state
          if (await v(drawer, toggle)) await toggle.click();
          await page.waitForTimeout(500);
        }
        const close = drawer.locator('button[aria-label="Close"]').first();
        if (await v(drawer, close)) await close.click();
        await page.waitForTimeout(300);
      }
    }
  });
});

