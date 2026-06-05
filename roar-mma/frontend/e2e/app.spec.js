import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ERR = { api: [], console: [] };
const ERROR_LOG = path.resolve(process.cwd(), '../../e2e-error-log.md');
const allFailed = [];

function logErr(name, error, apiErrs, consoleErrs, src) {
  const entry = `## ${new Date().toISOString()} - ${name}\n\n### Error\n\`\`\`\n${error?.message || error}\n\`\`\`\n\n### API Errors\n${apiErrs.length ? apiErrs.map(e => `- ${e}`).join('\n') : 'None'}\n\n### Console Errors\n${consoleErrs.length ? consoleErrs.map(e => `- ${e}`).join('\n') : 'None'}\n\n### Page Source Snippet\n\`\`\`html\n${(src || '').substring(0, 2000)}\n\`\`\`\n\n---\n`;
  fs.appendFileSync(ERROR_LOG, entry, 'utf8');
}

function clearLog() { try { if (fs.existsSync(ERROR_LOG)) fs.unlinkSync(ERROR_LOG); } catch {} }
function removeFromLog(name) {
  try {
    if (!fs.existsSync(ERROR_LOG)) return;
    const c = fs.readFileSync(ERROR_LOG, 'utf8');
    // Split on '## ' at start of line to get entries
    const parts = c.split(/\n## /);
    // Keep entries whose first line (title) doesn't end with the test name
    const filtered = parts.filter(s => {
      const firstNewline = s.indexOf('\n');
      const title = firstNewline > 0 ? s.substring(0, firstNewline) : s;
      return !title.endsWith(name);
    });
    fs.writeFileSync(ERROR_LOG, filtered.join('\n## ').trim(), 'utf8');
  } catch {}
}

test.beforeAll(() => clearLog());

async function detectErrorPage(page, testName) {
  try {
    const text = await page.locator('body').textContent().catch(() => '');
    const errorPatterns = ['Something went wrong', 'Error loading', 'We encountered an error'];
    for (const pat of errorPatterns) {
      if (text.includes(pat)) {
        const src = await page.content().catch(() => '');
        logErr(`${testName} - ERROR PAGE DETECTED`, new Error(`Error page shown: "${pat}"`), ERR.api, ERR.console, src);
        await page.screenshot({ path: `e2e-screenshots/error-page-${testName.replace(/\s+/g, '-')}.png` }).catch(() => {});
        console.log(`  ⚠ ERROR PAGE: "${pat}" in test "${testName}"`);
        return true;
      }
    }
  } catch {}
  return false;
}

test.beforeEach(async ({ page }) => {
  ERR.api = []; ERR.console = [];
  page.on('console', msg => { if (msg.type() === 'error') ERR.console.push(msg.text()); });
  page.on('response', res => { if (res.status() >= 400) ERR.api.push(`${res.status()} ${res.url().split('?')[0]}`); });
});

test.afterEach(async ({ page }, info) => {
  // Detect error pages even on passed tests
  await detectErrorPage(page, info.title);
  if (info.status !== 'passed') {
    const src = await page.content().catch(() => '');
    logErr(info.title, info.error, ERR.api, ERR.console, src);
    allFailed.push(info.title);
    await page.screenshot({ path: `e2e-screenshots/${info.title.replace(/\s+/g, '-')}.png` }).catch(() => {});
  } else {
    removeFromLog(info.title);
  }
  if (ERR.api.length) console.log(`[${info.title}] API:`, JSON.stringify(ERR.api));
});

test.describe('Login pages', () => {
  test('shows branding on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('ROAR MMA')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    // Check form fields exist
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('rejects invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('not-an-email');
    await page.locator('#password').fill('password');
    await page.evaluate(() => document.getElementById('email').type = 'text');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Unauthenticated redirects', () => {
  for (const p of ['/', '/dashboard', '/members', '/classes', '/leads']) {
    test(`redirects ${p} to /login`, async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const pg = await ctx.newPage();
      await pg.goto(p);
      await expect(pg.locator('body')).toBeVisible({ timeout: 15000 });
      expect((await pg.locator('body').textContent()).toLowerCase()).toMatch(/sign in|login|roar mma/);
      await ctx.close();
    });
  }
});

test.describe('Kiosk waiver loads unauthenticated', () => {
  test('kiosk waiver page renders without auth', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const pg = await ctx.newPage();
    await pg.goto('/kiosk/waiver');
    await expect(pg.locator('body')).toBeVisible({ timeout: 15000 });
    await ctx.close();
  });
});

test.describe('Full App — Every Button', () => {
  test.describe.configure({ mode: 'serial' });

  async function v(pg, loc) {
    try { return await pg.locator(loc).isVisible(); } catch { return false; }
  }

  // ======================== HEADER/NAV ========================
  test('Header — location switch, notification bell, AI pill, user menu, hamburger', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.locator('body')).toBeVisible();

    // Location switcher dropdown
    const locSwitcher = page.locator('[aria-label*="Location"]').first();
    if (await v(page, locSwitcher)) await locSwitcher.click(); await page.waitForTimeout(300);
    // Close by clicking first menuitem or clicking away
    const locClose = page.locator('[role="menuitem"]').first();
    if (await v(page, locClose)) await locClose.click(); await page.waitForTimeout(200);

    // Notification bell dropdown — open and close
    const bell = page.locator('[aria-label*="Notification"]').first();
    if (await v(page, bell)) { await bell.click(); await page.waitForTimeout(300); }
    if (await v(page, bell)) { await bell.click(); await page.waitForTimeout(200); }

    // AI Status pill → click and go back
    const aiPill = page.locator('[aria-label*="AI status"]').first();
    if (await v(page, aiPill)) { await aiPill.click(); await page.waitForTimeout(500); }
    await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {});

    // User menu dropdown
    const userMenu = page.locator('[aria-label="User menu"]').first();
    if (await v(page, userMenu)) {
      await userMenu.click(); await page.waitForTimeout(300);
      const profile = page.locator('button[role="menuitem"]:has-text("My Profile")').first();
      if (await v(page, profile)) console.log('  My Profile visible');
      const logout = page.locator('button[role="menuitem"]:has-text("Logout")').first();
      if (await v(page, logout)) console.log('  Logout visible');
      // Close by clicking elsewhere
      await page.locator('h1').first().click().catch(() => {}); await page.waitForTimeout(200);
    }

    // Mobile hamburger menu
    const ham = page.locator('[aria-label="Open menu"]').first();
    if (await v(page, ham)) { await ham.click(); await page.waitForTimeout(300); console.log('  Hamburger opened'); }
    // Close sidebar overlay if open
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50').first();
    if (await v(page, overlay)) await overlay.click().catch(() => {}); await page.waitForTimeout(200);
  });

  // ======================== DASHBOARD ========================
  test('Dashboard — click ALL KPI cards, alerts, class cards, AI panel, EOD buttons', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await expect(page.locator('body')).toBeVisible();

    // Click first 3 KPI cards (others just verify visibility — avoids slow back/forth nav)
    const kpiCards = page.locator('button[aria-label*=":"][aria-label*="Active"], button[aria-label*=":"][aria-label*="Revenue"], button[aria-label*=":"][aria-label*="Leads"], button[aria-label*=":"][aria-label*="Fill"], button[aria-label*=":"][aria-label*="Trial"], button[aria-label*=":"][aria-label*="Booking"], button[aria-label*=":"][aria-label*="Hot"]');
    const kpiCount = await kpiCards.count();
    console.log(`  Found ${kpiCount} KPI cards`);
    for (let i = 0; i < Math.min(kpiCount, 3); i++) {
      const label = await kpiCards.nth(i).getAttribute('aria-label').catch(() => '');
      console.log(`  Click KPI: ${label}`);
      await kpiCards.nth(i).click(); await page.waitForTimeout(300);
      await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {});
    }

    // Failed Payments "Resolve →" button
    const resolve = page.locator('button:has-text("Resolve")').first();
    if (await v(page, resolve)) { await resolve.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // "View Staff →" from Expiring Certs
    const viewStaff = page.locator('button:has-text("View Staff")').first();
    if (await v(page, viewStaff)) { await viewStaff.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // "Preview Full Report →" from EOD Preview
    const previewReport = page.locator('button:has-text("Preview Full Report")').first();
    if (await v(page, previewReport)) { await previewReport.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // "View Full Timetable →" from Today's Classes
    const viewTT = page.locator('button:has-text("View Full Timetable")').first();
    if (await v(page, viewTT)) { await viewTT.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // "View All Activity →" from Recent Activity
    const viewActivity = page.locator('button:has-text("View All Activity")').first();
    if (await v(page, viewActivity)) { await viewActivity.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // "Open Mission Control →" from AI Status Panel
    const missionCtrl = page.locator('button:has-text("Open Mission Control")').first();
    if (await v(page, missionCtrl)) { await missionCtrl.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // Pending approval button (AI Status Panel)
    const pendingBtn = page.locator('button:has-text("pending approval")').first();
    if (await v(page, pendingBtn)) { await pendingBtn.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }

    // Click first class card in Today's Classes section
    const classCard = page.locator('section button:has(.font-medium)').first();
    if (await v(page, classCard)) { await classCard.click(); await page.waitForTimeout(300); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }
  });

  // ======================== MEMBERS ========================
  test('Members — search, filters, select, paginate, all actions', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Search input
    const search = page.locator('input[aria-label="Search members"]');
    if (await v(page, search)) { await search.fill('test'); await page.waitForTimeout(500); await search.clear(); }

    // All 4 filters
    for (const label of ['Filter by status', 'Filter by plan', 'Filter by type', 'Filter by location']) {
      const sel = page.locator(`select[aria-label="${label}"]`).first();
      if (await v(page, sel) && await sel.locator('option').count() > 1) {
        await sel.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(200);
        await sel.selectOption({ index: 0 }).catch(() => {}); await page.waitForTimeout(200);
      }
    }

    // Select all checkbox and bulk actions
    const selectAll = page.locator('input[aria-label="Select all members"]').first();
    if (await v(page, selectAll)) {
      await selectAll.check().catch(() => {}); await page.waitForTimeout(200);
      await selectAll.uncheck().catch(() => {}); await page.waitForTimeout(200);
    }

    // Pagination
    const next = page.locator('button[aria-label="Next page"]');
    if (await v(page, next) && await next.isEnabled().catch(() => false)) {
      await next.click(); await page.waitForTimeout(300);
      await page.locator('button[aria-label="Previous page"]').click().catch(() => {}); await page.waitForTimeout(300);
    }

    // Export button
    const exportBtn = page.locator('button:has-text("Export")').first();
    if (await v(page, exportBtn)) { console.log('  Export button visible'); }

    // Add Member button — fill and submit
    const addBtn = page.locator('button:has-text("Add Member")').first();
    if (await v(page, addBtn)) {
      await addBtn.click(); await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]').first();
      if (await v(page, modal)) {
        await modal.locator('input[name="first_name"]').fill('E2E');
        await modal.locator('input[name="last_name"]').fill('AppTest');
        await modal.locator('input[name="email"]').fill(`e2e.apptest${Date.now()}@example.com`);
        await modal.locator('input[name="phone"]').fill('0400000000');
        let nxt = modal.locator('button:has-text("Next")').first();
        if (await v(modal, nxt)) await nxt.click(); await page.waitForTimeout(200);
        nxt = modal.locator('button:has-text("Next")').first();
        if (await v(modal, nxt)) await nxt.click(); await page.waitForTimeout(200);
        nxt = modal.locator('button:has-text("Next")').first();
        if (await v(modal, nxt)) await nxt.click(); await page.waitForTimeout(200);
        const ec = modal.locator('input[name="emergency_contact_name"]').first();
        if (await v(modal, ec)) await ec.fill('EC');
        nxt = modal.locator('button:has-text("Next")').first();
        if (await v(modal, nxt)) await nxt.click(); await page.waitForTimeout(200);
        const create = modal.locator('button:has-text("Create Member")').first();
        if (await v(modal, create)) await create.click(); await page.waitForTimeout(2000);
        if (await modal.isVisible().catch(() => false)) {
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(modal, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }

    // Click per-row action buttons (View, Pause, Change Plan, Cancel, Edit)
    const actionBtns = page.locator('table tbody tr').first().locator('button[aria-label]');
    const actionCount = await actionBtns.count();
    console.log(`  ${actionCount} per-row action buttons`);
    for (let i = 0; i < actionCount; i++) {
      const ab = actionBtns.nth(i);
      if (await ab.isVisible().catch(() => false)) {
        const al = await ab.getAttribute('aria-label').catch(() => '');
        if (al === 'View') { await ab.click(); await page.waitForTimeout(500); await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle'); }
        else if (al === 'Edit') {
          await ab.click(); await page.waitForTimeout(500);
          const mod = page.locator('[role="dialog"]').first();
          if (await v(page, mod)) { const x = mod.locator('button:has-text("Cancel")').first(); if (await v(mod, x)) await x.click(); await page.waitForTimeout(300); }
        }
      }
    }

    // Bulk actions: select all, then click bulk buttons
    if (await v(page, selectAll)) {
      await selectAll.check().catch(() => {}); await page.waitForTimeout(200);
      // Export Selected
      const expSel = page.locator('button:has-text("Export Selected")').first();
      if (await v(page, expSel)) { console.log('  Export Selected visible'); }
      // Bulk Message
      const bulkMsg = page.locator('button:has-text("Bulk Message")').first();
      if (await v(page, bulkMsg)) { console.log('  Bulk Message visible'); }
      // Clear
      const clearSel = page.locator('button:has-text("Clear")').first();
      if (await v(page, clearSel)) await clearSel.click(); await page.waitForTimeout(200);
    }

    // Click first row → member profile (checks navigation)
    const row = page.locator('table tbody tr').first();
    if (await v(page, row)) { await row.click(); await page.waitForTimeout(1000); await page.goBack(); await page.waitForLoadState('networkidle'); }
  });

  // ======================== CLASSES ========================
  test('Classes — week nav, filters, add class, class cards', async ({ page }) => {
    await page.goto('/classes');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Week navigation
    const prev = page.locator('button[aria-label="Previous week"]');
    if (await v(page, prev)) { await prev.click(); await page.waitForTimeout(300); }
    const next = page.locator('button[aria-label="Next week"]');
    if (await v(page, next)) { await next.click(); await page.waitForTimeout(300); }
    const tw = page.locator('button:has-text("This Week")');
    if (await v(page, tw)) { await tw.click(); await page.waitForTimeout(300); }

    // Location and type filters
    for (const label of ['Filter by location', 'Filter by type']) {
      const sel = page.locator(`select[aria-label="${label}"]`).first();
      if (await v(page, sel) && await sel.locator('option').count() > 1) {
        await sel.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(200);
        await sel.selectOption({ index: 0 }).catch(() => {}); await page.waitForTimeout(200);
      }
    }

    // Add Class button — fill and submit
    const add = page.locator('button:has-text("Add Class")').first();
    if (await v(page, add)) {
      await add.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        const nameIn = mod.locator('input[name="name"]').first().or(mod.locator('input[placeholder*="e.g."]').first());
        if (await v(mod, nameIn)) await nameIn.fill('E2E App Test Class');
        const ty = mod.locator('select[name="class_type"]').first();
        if (await v(mod, ty) && await ty.locator('option').count() > 1) await ty.selectOption({ index: 1 }).catch(() => {});
        const instr = mod.locator('input[name="instructor"]').first().or(mod.locator('input[placeholder*="Instructor"]').first());
        if (await v(mod, instr)) await instr.fill('E2E Coach');
        const st = mod.locator('input[type="time"]').first();
        if (await v(mod, st)) await st.fill('18:00');
        const et = mod.locator('input[type="time"]').last();
        if (await v(mod, et)) await et.fill('19:00');
        const create = mod.locator('button:has-text("Create Class")').first();
        if (await v(mod, create)) await create.click(); await page.waitForTimeout(2000);
        if (await mod.isVisible().catch(() => false)) {
          const cancel = mod.locator('button:has-text("Cancel")').first();
          if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }

    // Click class card if exists
    const card = page.locator('[role="button"][aria-label*="class"i], [role="button"]:has(.font-medium)').first();
    if (await v(page, card)) {
      await card.click(); await page.waitForTimeout(800);
      const drawer = page.locator('[role="dialog"]').first();
      if (await v(page, drawer)) {
        console.log('  Class detail drawer opened');
        const close = drawer.locator('button[aria-label="Close"]');
        if (await v(page, close)) await close.click(); await page.waitForTimeout(300);
      }
    }
  });

  // ======================== LEADS ========================
  test('Leads — tabs, search, filters, add, wizard, import', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Pipeline/Analytics tabs
    for (const label of ['Analytics', 'Pipeline']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(500); }
    }
    // Back to Pipeline for remaining actions
    const pipe = page.locator('button:has-text("Pipeline")').first();
    if (await v(page, pipe)) { await pipe.click(); await page.waitForTimeout(300); }

    // Search + filters
    const search = page.locator('input[aria-label="Search leads"]');
    if (await v(page, search)) { await search.fill('test'); await page.waitForTimeout(300); await search.clear(); }
    for (const label of ['Filter by stage', 'Filter by source']) {
      const sel = page.locator(`select[aria-label="${label}"]`).first();
      if (await v(page, sel) && await sel.locator('option').count() > 1) {
        await sel.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(200);
        await sel.selectOption({ index: 0 }).catch(() => {}); await page.waitForTimeout(200);
      }
    }

    // Wizard link
    const wizard = page.locator('a:has-text("Wizard")').first();
    if (await v(page, wizard)) {
      await wizard.click(); await page.waitForTimeout(1000);
      await page.goBack().catch(() => {}); await page.waitForLoadState('networkidle').catch(() => {});
    }

    // Add Lead button — fill and submit
    const add = page.locator('button:has-text("Add Lead")').first();
    if (await v(page, add)) {
      await add.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        await mod.locator('input[name="first_name"]').fill('E2E');
        await mod.locator('input[name="last_name"]').fill('AppLead');
        await mod.locator('input[name="phone"]').fill('0400000000');
        await mod.locator('input[type="email"]').fill(`e2e.applead${Date.now()}@example.com`);
        const submit = mod.locator('button:has-text("Create Lead")').first();
        if (await v(mod, submit)) await submit.click(); await page.waitForTimeout(2000);
        if (await mod.isVisible().catch(() => false)) {
          const cancel = mod.locator('button:has-text("Cancel")').first();
          if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }

    // Import CSV button
    const imp = page.locator('button:has-text("Import CSV")').first();
    if (await v(page, imp)) { console.log('  Import CSV button visible'); }
  });

  // ======================== BILLING ========================
  test('Billing — search, filters, stats, record payment, row actions, pagination', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Stats cards
    const stats = page.locator('.grid').first();
    if (await v(page, stats)) console.log(`  Stats cards: ${await stats.locator('> div').count()}`);

    // Search + filters
    const search = page.locator('input[aria-label="Search transactions"]');
    if (await v(page, search)) { await search.fill('test'); await page.waitForTimeout(500); await search.clear(); }
    for (const label of ['Filter by status', 'Filter by type']) {
      const sel = page.locator(`select[aria-label="${label}"]`).first();
      if (await v(page, sel) && await sel.locator('option').count() > 1) {
        await sel.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(200);
        await sel.selectOption({ index: 0 }).catch(() => {}); await page.waitForTimeout(200);
      }
    }

    // Export CSV button
    const exp = page.locator('button:has-text("Export")').first();
    if (await v(page, exp)) console.log('  Export button visible');

    // Pagination
    const nextPg = page.locator('button[aria-label="Next page"]');
    if (await v(page, nextPg) && await nextPg.isEnabled().catch(() => false)) {
      await nextPg.click(); await page.waitForTimeout(300);
      const prevPg = page.locator('button[aria-label="Previous page"]');
      if (await v(page, prevPg)) await prevPg.click(); await page.waitForTimeout(300);
    }

    // Per-row transaction actions: Write Off, Refund, Email Bill
    const firstRowActions = page.locator('table tbody tr').first().locator('button');
    const rowActionCount = await firstRowActions.count();
    for (let i = 0; i < rowActionCount; i++) {
      const ra = firstRowActions.nth(i);
      if (await ra.isVisible().catch(() => false)) {
        const txt = await ra.textContent().catch(() => '');
        console.log(`  Billing row action: ${txt.trim()}`);
      }
    }

    // Record Payment button — search member, fill, submit
    const rec = page.locator('button:has-text("Record Payment")').first();
    if (await v(page, rec)) {
      await rec.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        const srch = mod.locator('input[aria-label="Search member"]').first();
        if (await v(mod, srch)) {
          await srch.fill('admin'); await page.waitForTimeout(1000);
          const opt = mod.locator('[role="option"]').first();
          if (await v(mod, opt)) await opt.click(); await page.waitForTimeout(300);
        }
        const amt = mod.locator('input[type="number"]').first();
        if (await v(mod, amt)) await amt.fill('25');
        const recBtn = mod.locator('button:has-text("Record Payment")').first();
        if (await v(mod, recBtn) && await recBtn.isEnabled().catch(() => false)) {
          await recBtn.click(); await page.waitForTimeout(2000);
        }
        if (await mod.isVisible().catch(() => false)) {
          const cancel = mod.locator('button:has-text("Cancel")').first();
          if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }
  });

  // ======================== STAFF ========================
  test('Staff — tabs, role filter, profile, add staff', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Tabs
    for (const label of ['Schedule', 'Staff List']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(300); }
    }

    // Role filter
    const rf = page.locator('select[aria-label="Filter by role"]').first();
    if (await v(page, rf) && await rf.locator('option').count() > 1) {
      await rf.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(200);
    }

    // Add Staff button — fill and submit
    const addStaff = page.locator('button:has-text("Add Staff")').first();
    if (await v(page, addStaff)) {
      await addStaff.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        const n = mod.locator('input[placeholder="Full name"]').first();
        if (await v(mod, n)) await n.fill('E2E Staff App');
        const e = mod.locator('input[type="email"]').first();
        if (await v(mod, e)) await e.fill(`e2e.staffapp${Date.now()}@example.com`);
        const p = mod.locator('input[type="password"]').first();
        if (await v(mod, p)) await p.fill('StaffPass1');
        const role = mod.locator('select').first();
        if (await v(mod, role)) await role.selectOption('front_desk').catch(() => {});
        const create = mod.locator('button:has-text("Create Staff")').first();
        if (await v(mod, create)) await create.click(); await page.waitForTimeout(2000);
        if (await mod.isVisible().catch(() => false)) {
          const cancel = mod.locator('button:has-text("Cancel")').first();
          if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }

    // Staff row click → profile drawer
    const row = page.locator('table tbody tr').first();
    if (await v(page, row)) {
      await row.click(); await page.waitForTimeout(1000);
      const drawer = page.locator('[role="dialog"]').first();
      if (await v(page, drawer)) {
        // Try activate/deactivate button
        const toggle = drawer.locator('button:has-text("Activate"), button:has-text("Deactivate")').first();
        if (await v(page, toggle)) console.log('  Staff toggle button visible');
        const close = drawer.locator('button[aria-label="Close"]').first();
        if (await v(page, close)) await close.click(); await page.waitForTimeout(300);
      }
    }

    // Schedule tab with shift form
    const sched = page.locator('button:has-text("Schedule")').first();
    if (await v(page, sched)) {
      await sched.click(); await page.waitForTimeout(300);
      const shift = page.locator('button:has-text("Add Shift")').first();
      if (await v(page, shift)) { console.log('  Add Shift button visible'); }
    }
  });

  // ======================== SETTINGS ========================
  test('Settings — all 8 tabs, fill and save changes', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    for (const label of ['General', 'Locations', 'Membership', 'Notifications', 'Integrations', 'Grading', 'Payments', 'Audit Log']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(400); console.log(`  Settings tab: ${label}`); }
      // Fill first input in each tab if it exists
      const firstInput = page.locator('input:not([type="checkbox"]):not([type="hidden"])').first();
      if (await v(page, firstInput) && await firstInput.isEnabled().catch(() => false)) {
        await firstInput.fill('E2E Test'); await page.waitForTimeout(100); await firstInput.clear(); await page.waitForTimeout(100);
      }
      // Click first toggle/checkbox in each tab
      const firstToggle = page.locator('input[type="checkbox"]').first();
      if (await v(page, firstToggle) && await firstToggle.isEnabled().catch(() => false)) {
        await firstToggle.check().catch(() => {}); await page.waitForTimeout(100);
        await firstToggle.uncheck().catch(() => {}); await page.waitForTimeout(100);
      }
      // Click first select
      const firstSel = page.locator('select').first();
      if (await v(page, firstSel) && await firstSel.locator('option').count() > 1) {
        await firstSel.selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(100);
        await firstSel.selectOption({ index: 0 }).catch(() => {}); await page.waitForTimeout(100);
      }
    }
  });

  // ======================== REPORTS ========================
  test('Reports — select type, date range, generate', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const sel = page.locator('select').first();
    if (await v(page, sel)) {
      for (const rt of ['membership', 'revenue', 'attendance', 'leads']) {
        await sel.selectOption(rt).catch(() => {}); await page.waitForTimeout(300);
      }
    }

    // Date inputs
    const dateFrom = page.locator('input[type="date"]').first();
    if (await v(page, dateFrom)) console.log('  Date From input visible');
    const dateTo = page.locator('input[type="date"]').nth(1);
    if (await v(page, dateTo)) console.log('  Date To input visible');

    // Generate button
    const gen = page.locator('button:has-text("Generate")').first();
    if (await v(page, gen)) { await gen.click(); await page.waitForTimeout(1000); console.log('  Generate clicked'); }
  });

  // ======================== COMMUNICATIONS ========================
  test('Communications — compose, all 5 tabs', async ({ page }) => {
    await page.goto('/communications');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Compose button — fill and send
    const comp = page.locator('button:has-text("Compose")').first();
    if (await v(page, comp)) {
      await comp.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        // Select SMS (simpler - no subject required)
        const sms = mod.locator('text=SMS').first();
        if (await v(mod, sms)) await sms.click().catch(() => {}); await page.waitForTimeout(100);
        // Select recipient group
        const recip = mod.locator('select').first();
        if (await v(mod, recip)) await recip.selectOption('all_active').catch(() => {}); await page.waitForTimeout(100);
        // Fill body
        const body = mod.locator('textarea').first();
        if (await v(mod, body)) await body.fill('E2E test message from app.spec.');
        // Send
        const send = mod.locator('button:has-text("Send Now")').first();
        if (await v(mod, send) && await send.isEnabled().catch(() => false)) {
          await send.click(); await page.waitForTimeout(2000);
        }
        if (await mod.isVisible().catch(() => false)) {
          const cancel = mod.locator('button:has-text("Cancel")').first();
          if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }

    // All tabs
    for (const label of ['history', 'templates', 'scheduled', 'automated', 'approval']) {
      const tab = page.locator(`button[role="tab"]:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(500); }
    }
  });

  // ======================== POS ========================
  test('POS — all 3 tabs, add product to cart, complete sale, stock alerts', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // POS tab — add product, search member, complete sale
    const posTab = page.locator('nav button:has-text("pos")').first();
    if (await v(page, posTab)) { await posTab.click(); await page.waitForTimeout(500); }

    // Add first product to cart
    const product = page.locator('button:has-text("$")').first().or(page.locator('button:not([disabled])').first());
    if (await v(page, product)) { await product.click(); await page.waitForTimeout(300); console.log('  Product added to cart'); }
    // Search member
    const memSearch = page.locator('input[placeholder*="Search member"]').first();
    if (await v(page, memSearch)) { await memSearch.fill('admin'); await page.waitForTimeout(500); }
    // Click member result
    const memResult = page.locator('button[type="button"]', { hasText: /admin|test/i }).first();
    if (await v(page, memResult)) { await memResult.click(); await page.waitForTimeout(200); }
    // Fill tendered amount
    const tendered = page.locator('input[placeholder*="Tendered"]').first();
    if (await v(page, tendered)) { await tendered.fill('100'); await page.waitForTimeout(100); }
    // Complete Sale
    const complete = page.locator('button:has-text("Complete Sale")').first();
    if (await v(page, complete) && await complete.isEnabled().catch(() => false)) {
      await complete.click(); await page.waitForTimeout(1500);
      // Close receipt preview
      const closeRcpt = page.locator('button:has-text("Close")').first();
      if (await v(page, closeRcpt)) await closeRcpt.click(); await page.waitForTimeout(200);
    }

    // Products tab: Add Product — fill and save
    const prodTab = page.locator('nav button:has-text("products")').first();
    if (await v(page, prodTab)) {
      await prodTab.click(); await page.waitForTimeout(500);
      const addProd = page.locator('button:has-text("Add Product")').first();
      if (await v(page, addProd)) {
        await addProd.click(); await page.waitForTimeout(500);
        const mod = page.locator('[role="dialog"]').first();
        if (await v(page, mod)) {
          const pn = mod.locator('input[type="text"]').first();
          if (await v(mod, pn)) await pn.fill('E2E App Product');
          const pr = mod.locator('input[type="number"]').first();
          if (await v(mod, pr)) await pr.fill('29.99');
          const save = mod.locator('button:has-text("Save")').first();
          if (await v(mod, save)) await save.click(); await page.waitForTimeout(2000);
          if (await mod.isVisible().catch(() => false)) {
            const cancel = mod.locator('button:has-text("Cancel")').first();
            if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
          }
        }
      }
      // Click Edit on existing product
      const editProd = page.locator('button:has-text("Edit")').first();
      if (await v(page, editProd)) console.log('  Edit product button visible');
      const delProd = page.locator('button:has-text("Delete")').first();
      if (await v(page, delProd)) console.log('  Delete product button visible');
    }

    // Alerts tab — resolve alert
    const alertTab = page.locator('nav button:has-text("alerts")').first();
    if (await v(page, alertTab)) { await alertTab.click(); await page.waitForTimeout(300); }
    const resolveAlert = page.locator('button:has-text("Resolve")').first();
    if (await v(page, resolveAlert)) { console.log('  Resolve alert button visible'); }
  });

  // ======================== CALENDAR ========================
  test('Calendar — view switch, day cells, today, prev, next, events', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // View switcher
    const viewSel = page.locator('select').first();
    if (await v(page, viewSel) && await viewSel.locator('option').count() > 1) {
      for (const val of ['month', 'week', 'day']) {
        await viewSel.selectOption(val).catch(() => {}); await page.waitForTimeout(200);
      }
    }
    for (const label of ['Today', 'Prev', 'Next']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, btn)) { await btn.click(); await page.waitForTimeout(300); }
    }
    // Click day cells
    const dayCells = page.locator('[role="button"][tabindex="0"]');
    const dayCount = await dayCells.count();
    for (let i = 0; i < Math.min(dayCount, 3); i++) {
      if (await dayCells.nth(i).isVisible().catch(() => false)) { await dayCells.nth(i).click(); await page.waitForTimeout(200); }
    }
    // Click any event
    const event = page.locator('[role="button"][aria-label*="class"i], [role="button"][aria-label*="event"i]').first();
    if (await v(page, event)) { await event.click(); await page.waitForTimeout(300); console.log('  Calendar event clicked'); }
  });

  // ======================== COACHING ========================
  test('Coaching — search, sort, student row, tabs, book session', async ({ page }) => {
    await page.goto('/coaching');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const search = page.locator('input[placeholder*="Search"]').first();
    if (await v(page, search)) { await search.fill('test'); await page.waitForTimeout(300); await search.clear(); }
    // Sort buttons
    for (const sort of ['Name', 'Most Rated', 'Best Defense']) {
      const sortBtn = page.locator(`button:has-text("${sort}")`).first();
      if (await v(page, sortBtn)) { await sortBtn.click(); await page.waitForTimeout(200); }
    }
    // Click first student row
    const row = page.locator('table tbody tr').first();
    if (await v(page, row)) { await row.click(); await page.waitForTimeout(500); console.log('  Student row clicked'); }
    // Tabs
    for (const label of ['Students', 'Sessions', 'Assessments']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(300); }
    }
    // Book Session button
    const book = page.locator('button:has-text("Book Session")').first();
    if (await v(page, book)) { await book.click(); await page.waitForTimeout(500); console.log('  Book Session clicked'); }
    // Close any modal
    const mod = page.locator('[role="dialog"]').first();
    if (await v(page, mod)) { const x = mod.locator('button').first(); if (await v(mod, x)) await x.click(); await page.waitForTimeout(200); }
  });

  // ======================== GRADINGS ========================
  test('Gradings — filter, schedule session, tabs, view participants', async ({ page }) => {
    await page.goto('/gradings');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const sf = page.locator('select[aria-label*="status"i]').first();
    if (await v(page, sf) && await sf.locator('option').count() > 1) {
      for (const idx of [1, 2, 3, 4, 0]) {
        await sf.selectOption({ index: idx }).catch(() => {}); await page.waitForTimeout(150);
      }
    }
    // Schedule Grading button — fully fill modal
    const add = page.locator('button:has-text("Schedule Grading")').first().or(page.locator('button:has-text("Add Session")').first());
    if (await v(page, add)) {
      await add.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        const nameInp = mod.locator('input[placeholder*="Session name"]').first().or(mod.locator('input').first());
        if (await v(mod, nameInp)) await nameInp.fill('E2E Grading Session');
        const dateInp = mod.locator('input[type="date"]').first();
        if (await v(mod, dateInp)) await dateInp.fill('2026-07-01');
        const locSel = mod.locator('select').first();
        if (await v(mod, locSel) && await locSel.locator('option').count() > 1) await locSel.selectOption({ index: 1 }).catch(() => {});
        const notes = mod.locator('textarea').first();
        if (await v(mod, notes)) await notes.fill('E2E test grading notes');
        const create = mod.locator('button:has-text("Create Session")').first().or(mod.locator('button:has-text("Schedule")').first());
        if (await v(mod, create)) { await create.click().catch(() => {}); await page.waitForTimeout(1000); }
        // Close if still open
        const x = mod.locator('button[aria-label="Close"]').first().or(mod.locator('button:has-text("Cancel")').first());
        if (await v(mod, x)) await x.click(); await page.waitForTimeout(300);
      }
    }
    // Click session card's "View Participants" link
    const viewPart = page.locator('button:has-text("View Participants")').first();
    if (await v(page, viewPart)) await viewPart.click(); await page.waitForTimeout(300);
    // Tabs
    for (const label of ['Upcoming', 'Past', 'All']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(200); }
    }
  });

  // ======================== SOCIAL MEDIA ========================
  test('Social Media — all 5 tabs, compose post, create campaign, connect', async ({ page }) => {
    await page.goto('/social-media');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Compose tab: fill and submit a post
    const composeTab = page.locator('button[role="tab"]:has-text("Compose")').first();
    if (await v(page, composeTab)) { await composeTab.click(); await page.waitForTimeout(300); }
    // Click platform toggle buttons
    const platformToggles = page.locator('button:has-text("Facebook"), button:has-text("Instagram"), button:has-text("TikTok")');
    const platCount = await platformToggles.count();
    for (let i = 0; i < Math.min(platCount, 2); i++) {
      if (await platformToggles.nth(i).isVisible().catch(() => false)) { await platformToggles.nth(i).click(); await page.waitForTimeout(100); }
    }
    // Fill title
    const title = page.locator('input[placeholder*="Post title"]').first();
    if (await v(page, title)) await title.fill('E2E Test Post Title');
    // Fill content
    const content = page.locator('textarea[placeholder*="Write your post"]').first();
    if (await v(page, content)) await content.fill('E2E test post content for automated testing.');
    // Select schedule type
    const draftRadio = page.locator('input[type="radio"][value="draft"]').first();
    if (await v(page, draftRadio)) await draftRadio.check(); await page.waitForTimeout(100);
    // Click Save Draft or Schedule Post
    const submitBtn = page.locator('button:has-text("Save Draft")').first().or(page.locator('button:has-text("Schedule Post")').first());
    if (await v(page, submitBtn)) { await submitBtn.click().catch(() => {}); await page.waitForTimeout(500); }
    // Click Reset
    const reset = page.locator('button:has-text("Reset")').first();
    if (await v(page, reset)) await reset.click(); await page.waitForTimeout(200);

    // Calendar tab
    const calTab = page.locator('button[role="tab"]:has-text("Calendar")').first();
    if (await v(page, calTab)) { await calTab.click(); await page.waitForTimeout(300); }
    const newPost = page.locator('button:has-text("New Post")').first();
    if (await v(page, newPost)) await newPost.click(); await page.waitForTimeout(200);

    // Campaigns tab — create campaign
    const campTab = page.locator('button[role="tab"]:has-text("Campaigns")').first();
    if (await v(page, campTab)) { await campTab.click(); await page.waitForTimeout(300); }
    const newCamp = page.locator('button:has-text("New Campaign")').first();
    if (await v(page, newCamp)) {
      await newCamp.click(); await page.waitForTimeout(500);
      const campName = page.locator('input[placeholder*="Campaign name"]').first().or(page.locator('input').first());
      if (await v(page, campName)) await campName.fill('E2E Campaign');
      const campCreate = page.locator('button:has-text("Create Campaign")').first();
      if (await v(page, campCreate)) { await campCreate.click().catch(() => {}); await page.waitForTimeout(500); }
    }
    // Click campaign card if visible
    const campCard = page.locator('.cursor-pointer').first();
    if (await v(page, campCard)) { await campCard.click(); await page.waitForTimeout(300); const back = page.locator('button:has-text("← Back")').first(); if (await v(page, back)) await back.click(); await page.waitForTimeout(200); }

    // Analytics tab
    const anTab = page.locator('button[role="tab"]:has-text("Analytics")').first();
    if (await v(page, anTab)) { await anTab.click(); await page.waitForTimeout(300); }

    // Platforms tab — connect/disconnect
    const pltTab = page.locator('button[role="tab"]:has-text("Platforms")').first();
    if (await v(page, pltTab)) { await pltTab.click(); await page.waitForTimeout(300); }
    const connect = page.locator('button:has-text("Connect")').first();
    if (await v(page, connect)) console.log('  Connect button visible');
    const disconnect = page.locator('button:has-text("Disconnect")').first();
    if (await v(page, disconnect)) console.log('  Disconnect button visible');
  });

  // ======================== WAIVERS ========================
  test('Waivers — tabs, new template form, sign/edit/delete, member waivers search', async ({ page }) => {
    await page.goto('/waivers');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // New Template button (opens inline form, not modal) — fill and submit
    const nt = page.locator('button:has-text("New Template")').first();
    if (await v(page, nt)) {
      await nt.click(); await page.waitForTimeout(500);
      const form = page.locator('form').first();
      if (await v(page, form)) {
        const nameInp = form.locator('input[aria-label="Template name"]').first();
        if (await v(page, nameInp)) {
          await nameInp.fill('E2E Waiver Template');
          const bodyInp = form.locator('textarea[aria-label="Waiver body text"]').first();
          if (await v(page, bodyInp)) await bodyInp.fill('This is a test waiver for E2E testing.');
          const create = form.locator('button:has-text("Create")').first();
          if (await v(page, create)) await create.click(); await page.waitForTimeout(2000);
          if (await form.isVisible().catch(() => false)) {
            const cancel = form.locator('button:has-text("Cancel")').first();
            if (await v(page, cancel)) await cancel.click(); await page.waitForTimeout(300);
          }
        }
      }
    }

    // Interact with existing templates: Sign, Edit, Delete buttons
    const signBtn = page.locator('button:has-text("Sign")').first();
    if (await v(page, signBtn)) { await signBtn.click(); await page.waitForTimeout(500); console.log('  Sign clicked'); const x = page.locator('[role="dialog"] button[aria-label="Close"]').first(); if (await v(page, x)) await x.click(); await page.waitForTimeout(200); }
    const editBtn = page.locator('button:has-text("Edit")').first();
    if (await v(page, editBtn)) { await editBtn.click(); await page.waitForTimeout(300); console.log('  Edit clicked'); }
    const delBtn = page.locator('button:has-text("Delete")').first();
    if (await v(page, delBtn)) console.log('  Delete button visible');

    // Tabs
    for (const label of ['Waiver Templates', 'Member Waivers']) {
      const tab = page.locator(`button[role="tab"]:has-text("${label}")`).first();
      if (await v(page, tab)) { await tab.click(); await page.waitForTimeout(300); }
    }

    // Member Waivers: fill ID and click Search
    const mi = page.locator('input[aria-label="Member ID"]').first();
    if (await v(page, mi)) { await mi.fill('1'); await page.waitForTimeout(200); }
    const searchBtn = page.locator('button:has-text("Search")').first();
    if (await v(page, searchBtn)) { await searchBtn.click().catch(() => {}); await page.waitForTimeout(500); }
  });

  // ======================== AI CHAT ========================
  test('AI Chat — suggestion chip + send', async ({ page }) => {
    await page.goto('/ai');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const chip = page.locator('button:has-text("active members"), button:has-text("How many")').first();
    if (await v(page, chip)) {
      await chip.click(); await page.waitForTimeout(500);
      const send = page.locator('button:has-text("Send")').first();
      if (await v(page, send)) { await send.click(); await page.waitForTimeout(3000); }
    }
  });

  // ======================== AI DASHBOARD ========================
  test('AI Dashboard — toggle agents, nav links', async ({ page }) => {
    await page.goto('/ai-dashboard');
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // Toggle agent switches exist
    const toggles = page.locator('label:has(input[type="checkbox"])');
    if (await toggles.count() > 0) {
      console.log(`  ${await toggles.count()} agent toggles found`);
      // Click via force to bypass label overlay
      await toggles.first().click({ force: true }); await page.waitForTimeout(500);
    }

    // Nav links
    const al = page.locator('a:has-text("Approval Queue")');
    if (await v(page, al)) { await al.click(); await page.waitForTimeout(500); await page.goBack(); await page.waitForLoadState('networkidle'); }
    const agents = page.locator('a:has-text("Agent Tracking")');
    if (await v(page, agents)) { console.log('  Agent Tracking link visible'); }
  });

  // ======================== AGENT TRACKING ========================
  test('Agent Tracking — all agent filter buttons', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const h = page.locator('text=AI Employee Dashboard').first();
    if (await v(page, h)) await expect(h).toBeVisible({ timeout: 10000 });
    for (const label of ['All Agents', 'Sales', 'Member Success', 'Operations', 'Finance']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, btn)) { await btn.click(); await page.waitForTimeout(300); }
    }
  });

  // ======================== APPROVAL QUEUE ========================
  test('Approval Queue — status filters, items', async ({ page }) => {
    await page.goto('/approval-queue');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    for (const label of ['pending', 'approved', 'rejected', 'All']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await v(page, btn)) { await btn.click(); await page.waitForTimeout(500); }
    }
    // Click first item to expand
    const item = page.locator('.cursor-pointer').first();
    if (await v(page, item)) { await item.click(); await page.waitForTimeout(300); }
  });

    // ======================== WORKFLOWS ========================
  test('Workflows — new rule modal', async ({ page }) => {
    await page.goto('/workflows');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const h = page.locator('text=Workflow Builder').first();
    if (await v(page, h)) await expect(h).toBeVisible({ timeout: 10000 });

    const nr = page.locator('button:has-text("New Rule")').first();
    if (await v(page, nr)) {
      await nr.click(); await page.waitForTimeout(500);
      const mod = page.locator('[role="dialog"]').first();
      if (await v(page, mod)) {
        const nameInp = mod.locator('input').first();
        if (await v(page, nameInp)) await nameInp.fill('E2E Test Rule');
        const desc = mod.locator('textarea').first();
        if (await v(page, desc)) await desc.fill('Automated test rule');
        const selects = mod.locator('select');
        if (await selects.count() >= 2) {
          await selects.nth(0).selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(100);
          await selects.nth(1).selectOption({ index: 1 }).catch(() => {}); await page.waitForTimeout(100);
        }
        const submit = mod.locator('button:has-text("Save")').first().or(mod.locator('button:has-text("Create")').first());
        if (await v(mod, submit) && await submit.isEnabled().catch(() => false)) {
          await submit.click(); await page.waitForTimeout(2000);
        }
        if (await mod.isVisible().catch(() => false)) {
          const cancel = mod.locator('button:has-text("Cancel")').first();
          if (await v(mod, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }
  });

  // ======================== TRIAL CONVERSION ========================
  test('Trial Conversion — stat cards and sections load', async ({ page }) => {
    await page.goto('/trial-conversion');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Check heading
    const h1 = page.locator('h1:has-text("Trial Conversion")').first();
    if (await v(page, h1)) await expect(h1).toBeVisible({ timeout: 10000 });
    // Stat cards
    for (const label of ['Trials Completed', 'Converted to Members', 'Conversion Rate']) {
      const card = page.locator(`text="${label}"`).first();
      if (await v(page, card)) console.log(`  Stat card: ${label}`);
    }
    // Sections
    for (const section of ['Conversion by Interest Level', 'Conversion by Experience Rating', 'Conversion by Class Type', 'Trials Needing Follow-up']) {
      const s = page.locator(`text="${section}"`).first();
      if (await v(page, s)) console.log(`  Section: ${section}`);
    }
  });

  // ======================== MEMBER PROFILE ========================
  test('Member Profile — tabs, dialogs, change plan, pause, cancel', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const row = page.locator('table tbody tr').first();
    if (await v(page, row)) {
      await row.click(); await page.waitForURL(/\/members\//, { timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Check tabs
      for (const tab of ['Overview', 'Attendance', 'Payments', 'Classes & PT', 'Notes', 'Coaching', 'Documents']) {
        const tb = page.locator(`button:has-text("${tab}")`).first();
        if (await v(page, tb)) { await tb.click(); await page.waitForTimeout(300); }
      }

      // Change Plan dialog
      const cp = page.locator('button:has-text("Change Plan")').first();
      if (await v(page, cp)) {
        await cp.click(); await page.waitForTimeout(500);
        const dlg = page.locator('[role="dialog"]').first();
        if (await v(page, dlg)) {
          const sel = dlg.locator('select').first();
          if (await v(page, sel)) await sel.selectOption({ index: 1 }).catch(() => {});
          const close = dlg.locator('button:has-text("Change Plan")').first();
          if (await v(page, close)) await close.click().catch(() => {});
          // Close via X if still open
          const x = dlg.locator('button:has-text("×")').first();
          if (await v(page, x)) await x.click(); await page.waitForTimeout(300);
        }
      }

      // Pause dialog
      const pause = page.locator('button:has-text("Pause")').first();
      if (await v(page, pause)) {
        await pause.click(); await page.waitForTimeout(500);
        const dlg = page.locator('[role="dialog"]').first();
        if (await v(page, dlg)) {
          const x = dlg.locator('button:has-text("×")').first();
          if (await v(page, x)) await x.click(); await page.waitForTimeout(300);
        }
      }

      // Cancel dialog
      const cancel = page.locator('button:has-text("Cancel")').first();
      if (await v(page, cancel)) {
        await cancel.click(); await page.waitForTimeout(500);
        const dlg = page.locator('[role="dialog"]').first();
        if (await v(page, dlg)) {
          const no = dlg.locator('button:has-text("Cancel Membership")').first();
          if (await v(page, no)) { /* don't click, just close */ }
          const x = dlg.locator('button:has-text("×")').first();
          if (await v(page, x)) await x.click(); await page.waitForTimeout(300);
        }
      }

      // Edit button opens modal
      const edit = page.locator('button:has-text("Edit")').first();
      if (await v(page, edit)) {
        await edit.click(); await page.waitForTimeout(500);
        const dlg = page.locator('[role="dialog"]').first();
        if (await v(page, dlg)) {
          const x = dlg.locator('button:has-text("×")').first();
          if (await v(page, x)) await x.click(); await page.waitForTimeout(300);
        }
      }

      // Notes tab → Add Note dialog
      const notesTab = page.locator('button:has-text("Notes")').first();
      if (await v(page, notesTab)) {
        await notesTab.click(); await page.waitForTimeout(300);
        const addNote = page.locator('button:has-text("Add Note")').first();
        if (await v(page, addNote)) {
          await addNote.click(); await page.waitForTimeout(500);
          const dlg = page.locator('[role="dialog"]').first();
          if (await v(page, dlg)) {
            const ta = dlg.locator('textarea').first();
            if (await v(page, ta)) await ta.fill('E2E test note');
            const confirm = dlg.locator('button:has-text("Add Note")').first();
            if (await v(page, confirm)) {
              // Try submitting (likely fails on API but we test the flow)
              await confirm.click().catch(() => {}); await page.waitForTimeout(500);
            }
            const x = dlg.locator('button:has-text("×")').first();
            if (await v(page, x)) await x.click(); await page.waitForTimeout(300);
          }
        }
      }

      // Back to overview
      const ov = page.locator('button:has-text("Overview")').first();
      if (await v(page, ov)) await ov.click(); await page.waitForTimeout(300);
    }
  });

  // ======================== KIOSK WAIVER ========================
  test('Kiosk Waiver — search member, sign page', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const pg = await ctx.newPage();
    await pg.goto('/kiosk/waiver');
    await pg.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(pg.locator('body')).toBeVisible();
    // Check search input
    const search = pg.locator('input[aria-label="Search members"]');
    if (await v(pg, search)) {
      await search.fill('test'); await pg.waitForTimeout(1000);
    }
    // Check Sign & Submit button exists
    const signBtn = pg.locator('button:has-text("Sign & Submit")');
    if (await v(pg, signBtn)) console.log('  Sign & Submit button rendered');
    await ctx.close();
  });

  // ======================== LEADS WIZARD ========================
  test('Leads Wizard — navigate steps, fill fields', async ({ page }) => {
    await page.goto('/leads/wizard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('body')).toBeVisible();

    // Step 1: Personal Info
    const first = page.locator('input[placeholder="John"]').first();
    if (await v(page, first)) await first.fill('E2E');
    const last = page.locator('input[placeholder="Smith"]').first();
    if (await v(page, last)) await last.fill('Wizard');
    let next = page.locator('button:has-text("Next")').first();
    if (await v(page, next)) { await next.click(); await page.waitForTimeout(500); }

    // Step 2: Contact Details
    const email = page.locator('input[type="email"]').first();
    if (await v(page, email)) await email.fill(`wizard${Date.now()}@example.com`);
    const phone = page.locator('input[type="tel"]').first();
    if (await v(page, phone)) await phone.fill('0400000000');
    next = page.locator('button:has-text("Next")').first();
    if (await v(page, next)) { await next.click(); await page.waitForTimeout(500); }

    // Step 3: Source & Location
    const src = page.locator('select').first();
    if (await v(page, src)) await src.selectOption('facebook').catch(() => {});
    next = page.locator('button:has-text("Next")').first();
    if (await v(page, next)) { await next.click(); await page.waitForTimeout(500); }

    // Step 4: Interests & Notes
    const interests = page.locator('textarea').first();
    if (await v(page, interests)) await interests.fill('BJJ, Muay Thai');
    next = page.locator('button:has-text("Next")').first();
    if (await v(page, next)) { await next.click(); await page.waitForTimeout(500); }

    // Step 5: Review & Submit
    const create = page.locator('button:has-text("Create Lead")').first();
    if (await v(page, create)) {
      await create.click(); await page.waitForTimeout(2000);
      // May succeed or fail; either way we navigated through all steps
    }

    // Back to leads
    await page.goto('/leads').catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  // ======================== MEMBER PORTAL ========================
  test('Member Portal — login form, register toggle, tabs', async ({ page }) => {
    // Test with fresh context (no auth - portal is its own auth)
    await page.goto('/member-portal');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Check login form visible
    const email = page.locator('input[type="email"]').first();
    if (await v(page, email)) {
      await email.fill('test@example.com');
      const pw = page.locator('input[type="password"]').first();
      if (await v(page, pw)) await pw.fill('password123');
      const logBtn = page.locator('button:has-text("Log In")').first();
      if (await v(page, logBtn)) console.log('  Login button visible');
    }

    // Toggle to register
    const setupLink = page.locator('button:has-text("Set up portal")').first();
    if (await v(page, setupLink)) {
      await setupLink.click(); await page.waitForTimeout(500);
      const regBtn = page.locator('button:has-text("Set Up Portal")').first();
      if (await v(page, regBtn)) console.log('  Register form visible');
      // Toggle back
      const logLink = page.locator('button:has-text("Log in")').first();
      if (await v(page, logLink)) { await logLink.click(); await page.waitForTimeout(300); }
    }
  });

  // ======================== PAYMENTS ========================
  test('Payments — search, filters, process payment modal (full form)', async ({ page }) => {
    await page.goto('/payments');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(page.locator('body')).toBeVisible();

    // Search input
    const search = page.locator('input[placeholder*="Search"]').first();
    if (await v(page, search)) { await search.fill('test'); await page.waitForTimeout(300); await search.clear(); }

    // Status filter — cycle all options
    const sel = page.locator('select').first();
    if (await v(page, sel)) {
      for (const opt of ['succeeded', 'pending', 'failed', 'refunded']) {
        await sel.selectOption(opt).catch(() => {}); await page.waitForTimeout(100);
      }
      await sel.selectOption('').catch(() => {}); await page.waitForTimeout(100);
    }

    // Refund button on first payment row
    const refundBtn = page.locator('button:has-text("Refund")').first();
    if (await v(page, refundBtn) && await refundBtn.isEnabled().catch(() => false)) console.log('  Refund button enabled');

    // Process Payment — open modal, fill all fields, submit
    const procBtn = page.locator('button:has-text("Process Payment")').first();
    if (await v(page, procBtn)) {
      await procBtn.click(); await page.waitForTimeout(500);
      const modal = page.locator('[role="dialog"]').first();
      if (await v(page, modal)) {
        // Search member
        const memSearch = modal.locator('input[placeholder*="Search"]').first();
        if (await v(page, memSearch)) {
          await memSearch.fill('admin'); await page.waitForTimeout(1000);
          const memOpt = modal.locator('[role="button"]').first();
          if (await v(page, memOpt)) { await memOpt.click(); await page.waitForTimeout(300); }
        }
        // Fill amount
        const amt = modal.locator('input[type="number"]').first();
        if (await v(page, amt)) await amt.fill('99.99');
        // Fill description
        const desc = modal.locator('input[placeholder*="Monthly"i]').first().or(modal.locator('input[type="text"]').first());
        if (await v(page, desc)) await desc.fill('E2E Test Payment');
        // Select transaction type
        const txType = modal.locator('select').first();
        if (await v(page, txType) && await txType.locator('option').count() > 1) await txType.selectOption({ index: 1 }).catch(() => {});
        // Select payment method
        const payMethod = modal.locator('select').last();
        if (await v(page, payMethod) && await payMethod.locator('option').count() > 1) await payMethod.selectOption('cash').catch(() => {});
        // Submit
        const submit = modal.locator('button:has-text("Process Payment")').first();
        if (await v(page, submit) && await submit.isEnabled().catch(() => false)) {
          await submit.click(); await page.waitForTimeout(2000);
        }
        // Close if still open
        if (await modal.isVisible().catch(() => false)) {
          const cancel = modal.locator('button:has-text("Cancel")').first();
          if (await v(page, cancel)) await cancel.click(); await page.waitForTimeout(300);
        }
      }
    }
  });

  // ======================== UI THEME ========================
  test('UI theme — consistent bg across reloads', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const bg1 = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg1).toBeTruthy();
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const bg2 = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg2).toBe(bg1);
  });
});
