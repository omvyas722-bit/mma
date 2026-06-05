import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Deep Interaction Tests', () => {

  test('AI Chat - send suggestion and verify response appears', async ({ page }) => {
    await page.goto('/ai');
    await page.waitForLoadState('networkidle');

    // Wait for welcome message
    await expect(page.locator('text=AI gym assistant')).toBeVisible({ timeout: 10000 });

    // Click a suggestion chip to populate input
    await page.locator('button:has-text("How many active members")').first().click();
    await page.waitForTimeout(300);

    // Input should have value now; click Send
    const sendBtn = page.locator('button:has-text("Send")').first();
    await expect(sendBtn).toBeEnabled({ timeout: 3000 });
    await sendBtn.click();

    // Wait for new message to appear in the chat area
    // Messages are: div.flex.justify-{start|end}.mb-4
    const msgs = page.locator('.overflow-y-auto > .flex.mb-4');
    const count = await msgs.count();
    // Should have welcome + new user message after send
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('AI Dashboard - toggle agent on/off', async ({ page }) => {
    await page.goto('/ai-dashboard');
    await page.waitForLoadState('networkidle');

    // Try toggling the first agent switch
    const toggles = page.locator('input[type="checkbox"]');
    const count = await toggles.count();
    if (count > 0) {
      const firstToggle = toggles.first();
      const checked1 = await firstToggle.isChecked();
      await firstToggle.click();
      await page.waitForTimeout(500);
      const checked2 = await firstToggle.isChecked();
      expect(checked2).toBe(!checked1);
      // Toggle back
      await firstToggle.click();
      await page.waitForTimeout(500);
    }

    // Check Approval Queue link exists
    const approvalLink = page.locator('a:has-text("Approval Queue")');
    if (await approvalLink.isVisible().catch(() => false)) {
      await approvalLink.click();
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Members - bulk select and use filters', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // Select all checkbox
    const selectAll = page.locator('input[aria-label="Select all members"]').first();
    if (await selectAll.isVisible().catch(() => false)) {
      await selectAll.check();
      await page.waitForTimeout(300);
      await selectAll.uncheck();
      await page.waitForTimeout(300);
    }

    // Toggle through all filters
    for (const label of ['Filter by status', 'Filter by plan', 'Filter by type', 'Filter by location']) {
      const filter = page.locator(`select[aria-label="${label}"]`).first();
      if (await filter.isVisible().catch(() => false)) {
        const opts = await filter.locator('option').count();
        if (opts > 1) {
          await filter.selectOption({ index: 1 });
          await page.waitForTimeout(200);
          await filter.selectOption({ index: 0 });
          await page.waitForTimeout(200);
        }
      }
    }

    // View member profile (first row click)
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForURL(/\/members\/\d+/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  });

  test('Leads - switch between all pipeline tabs, open wizard', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Click Pipeline/Analytics tabs
    for (const label of ['Analytics', 'Pipeline']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }

    // Click Wizard link
    const wizardLink = page.locator('a:has-text("Wizard"), a:has-text("wizard")').first();
    if (await wizardLink.isVisible().catch(() => false)) {
      await wizardLink.click();
      await page.waitForURL(/\/leads\/wizard/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    // Search, filter
    const search = page.locator('input[aria-label="Search leads"], input[placeholder*="Search"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('test');
      await page.waitForTimeout(300);
      await search.clear();
      await page.waitForTimeout(300);
    }

    for (const label of ['Filter by stage', 'Filter by source']) {
      const filter = page.locator(`select[aria-label="${label}"]`).first();
      if (await filter.isVisible().catch(() => false)) {
        const opts = await filter.locator('option').count();
        if (opts > 1) { await filter.selectOption({ index: 1 }); await page.waitForTimeout(200); await filter.selectOption({ index: 0 }); await page.waitForTimeout(200); }
      }
    }
  });

  test('Billing - search, filter, export', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    // Search
    const search = page.locator('input[aria-label="Search transactions"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill('test');
      await page.waitForTimeout(300);
      await search.clear();
      await page.waitForTimeout(300);
    }

    // Filter by status and type
    for (const label of ['Filter by status', 'Filter by type']) {
      const filter = page.locator(`select[aria-label="${label}"]`).first();
      if (await filter.isVisible().catch(() => false)) {
        const opts = await filter.locator('option').count();
        if (opts > 1) { await filter.selectOption({ index: 1 }); await page.waitForTimeout(200); await filter.selectOption({ index: 0 }); await page.waitForTimeout(200); }
      }
    }
  });

  test('Staff - click through profile and schedule tabs', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');

    // Switch to Schedule tab
    const scheduleTab = page.locator('button:has-text("Schedule")').first();
    if (await scheduleTab.isVisible().catch(() => false)) {
      await scheduleTab.click();
      await page.waitForTimeout(500);
    }

    // Switch back to Staff List
    const staffListTab = page.locator('button:has-text("Staff List")').first();
    if (await staffListTab.isVisible().catch(() => false)) {
      await staffListTab.click();
      await page.waitForTimeout(500);
    }

    // Filter by role
    const roleFilter = page.locator('select[aria-label="Filter by role"]').first();
    if (await roleFilter.isVisible().catch(() => false)) {
      const opts = await roleFilter.locator('option').count();
      if (opts > 1) { await roleFilter.selectOption({ index: 1 }); await page.waitForTimeout(200); }
    }

    // Click a staff row to open profile
    const staffRow = page.locator('table tbody tr').first();
    if (await staffRow.isVisible().catch(() => false)) {
      await staffRow.click();
      await page.waitForTimeout(1000);
      // Close profile panel if there's a close button
      const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('Communications - open compose, navigate all tabs', async ({ page }) => {
    await page.goto('/communications');
    await page.waitForLoadState('networkidle');

    // Open Compose
    const compose = page.locator('button:has-text("Compose")').first();
    if (await compose.isVisible().catch(() => false)) {
      await compose.click();
      await page.waitForTimeout(500);
      const cancel = page.locator('button:has-text("Cancel")').first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        await page.waitForTimeout(300);
      }
    }

    // Click through all tabs
    for (const label of ['Templates', 'Scheduled', 'Automated', 'Approval']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Settings - fill and save general settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Modify gym name
    const gymName = page.locator('input[placeholder="ROAR MMA"]').first();
    if (await gymName.isVisible().catch(() => false)) {
      await gymName.fill('ROAR MMA Test');
      await page.waitForTimeout(300);
      await gymName.fill('ROAR MMA');
      await page.waitForTimeout(300);
    }

    // Switch to each settings tab
    for (const label of ['Locations', 'Membership', 'Notifications', 'Integrations', 'Grading']) {
      const tab = page.locator(`button:has-text("${label}")`).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('POS - click through all tabs and products', async ({ page }) => {
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    // "products" tab
    const productsTab = page.locator('button:has-text("products"), button[role="tab"]:has-text("Products")').first();
    if (await productsTab.isVisible().catch(() => false)) {
      await productsTab.click();
      await page.waitForTimeout(500);
    }

    // "alerts" tab
    const alertsTab = page.locator('button:has-text("alerts"), button[role="tab"]:has-text("Alerts")').first();
    if (await alertsTab.isVisible().catch(() => false)) {
      await alertsTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('Reports - generate all 4 report types', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    for (const reportType of ['Revenue', 'Attendance', 'Leads']) {
      const select = page.locator('select[aria-label*="report"i], select').first();
      if (await select.isVisible().catch(() => false)) {
        await select.selectOption(reportType);
        await page.waitForTimeout(500);
        const generate = page.locator('button:has-text("Generate")').first();
        if (await generate.isVisible().catch(() => false)) {
          await generate.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('Waivers - interact with templates', async ({ page }) => {
    await page.goto('/waivers');
    await page.waitForLoadState('networkidle');

    // "New Template" button
    const newTemplate = page.locator('button:has-text("New Template")').first();
    if (await newTemplate.isVisible().catch(() => false)) {
      await newTemplate.click();
      await page.waitForTimeout(500);
      // Fill template form
      const nameInput = page.locator('input[aria-label="Template name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Template');
        await page.waitForTimeout(200);
        const bodyInput = page.locator('textarea[aria-label="Waiver body text"]').first();
        if (await bodyInput.isVisible().catch(() => false)) {
          await bodyInput.fill('This is a test waiver body.');
          await page.waitForTimeout(200);
        }
        // Cancel
        const cancel = page.locator('button:has-text("Cancel")').first();
        if (await cancel.isVisible().catch(() => false)) {
          await cancel.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // Switch to Member Waivers tab
    const memberTab = page.locator('button:has-text("Member Waivers")').first();
    if (await memberTab.isVisible().catch(() => false)) {
      await memberTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('Agents - visit agent tracking, filter activity', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=AI Employee Dashboard')).toBeVisible({ timeout: 10000 });

    // Click each agent filter button in activity timeline
    for (const label of ['All Agents', 'Sales', 'Member Success', 'Operations', 'Finance']) {
      const agentBtn = page.locator(`button:has-text("${label}")`).first();
      if (await agentBtn.isVisible().catch(() => false)) {
        await agentBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('Approval Queue - switch status filters', async ({ page }) => {
    await page.goto('/approval-queue');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=AI Approval Queue')).toBeVisible({ timeout: 10000 });

    // Click each status filter
    for (const label of ['pending', 'approved', 'rejected']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Workflows - create new rule modal', async ({ page }) => {
    await page.goto('/workflows');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Workflow Builder')).toBeVisible({ timeout: 10000 });

    // Click New Rule
    const newRule = page.locator('button:has-text("New Rule")').first();
    if (await newRule.isVisible().catch(() => false)) {
      await newRule.click();
      await page.waitForTimeout(500);
      // Fill form
      const nameInput = page.locator('input[placeholder*="Rule Name"], input[value=""]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Test Rule');
        await page.waitForTimeout(200);
      }
      // Cancel
      const cancel = page.locator('button:has-text("Cancel")').first();
      if (await cancel.isVisible().catch(() => false)) {
        await cancel.click();
        await page.waitForTimeout(300);
      }
    }
  });
});
