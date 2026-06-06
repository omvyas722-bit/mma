import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('PerfectGym 12 Features', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/perfectgym');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=PerfectGym Feature Suite')).toBeVisible({ timeout: 10000 });
  });

  test('F1: Membership Management - plan config and cards', async ({ page }) => {
    await page.locator('button:has-text("Membership Management")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Membership Management');

    // Verify existing plan cards are displayed
    const planCards = page.locator('.card:has(h3)');
    const count = await planCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Click "New Plan" to show form
    await page.locator('button:has-text("New Plan")').click();
    await expect(page.locator('text=Create Membership Plan')).toBeVisible();

    // Fill in the form
    await page.locator('input[placeholder="e.g. Unlimited MMA"]').fill('Test Plan E2E');
    await page.locator('input[type="number"]').first().fill('75');
    await page.locator('button:has-text("Save Plan")').click();

    // Verify new plan card appears
    await expect(page.locator('text=Test Plan E2E')).toBeVisible();

    // Toggle plan active/inactive
    const deactivateBtns = page.locator('button:has-text("Deactivate")');
    if (await deactivateBtns.count() > 0) {
      await deactivateBtns.first().click();
      await page.waitForTimeout(300);
    }

    // Go back to hub
    await page.locator('button:has-text("Back to PerfectGym")').click();
    await expect(page.locator('text=PerfectGym Feature Suite')).toBeVisible();
  });

  test('F2: Automated Billing - settings panel and summary', async ({ page }) => {
    await page.locator('button:has-text("Automated Billing & Payments")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Automated Billing & Payments');

    // Change billing cycle
    await page.locator('select').first().selectOption('weekly');
    await page.waitForTimeout(200);

    // Change retry attempts
    await page.locator('input[type="number"]').fill('5');

    // Click save
    await page.locator('button:has-text("Save Settings")').click();
    await expect(page.locator('button:has-text("Saved!")')).toBeVisible({ timeout: 3000 });

    // Verify summary section
    await expect(page.locator('text=Current Settings Summary')).toBeVisible();
    await expect(page.locator('.bg-blue-50 .text-xl')).toContainText('weekly', { ignoreCase: true });
    await expect(page.locator('.bg-green-50 .text-xl')).toHaveText('5');

    // Verify recent transactions table
    await expect(page.locator('text=Recent Transactions')).toBeVisible();
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBe(4);

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F3: Access Control - rules editor', async ({ page }) => {
    await page.locator('button:has-text("Access Control")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Access Control');

    // Verify existing rules are shown
    const rules = page.locator('.card:has(h3)');
    expect(await rules.count()).toBeGreaterThanOrEqual(3);

    // Add new rule
    await page.locator('button:has-text("New Rule")').click();
    await expect(page.locator('text=Add Access Rule')).toBeVisible();

    await page.locator('select').first().selectOption('Day Pass');

    // Select a location
    await page.locator('button:has-text("Fremantle")').click();

    await page.locator('button:has-text("Save Rule")').click();
    await page.waitForTimeout(300);

    // Toggle a rule
    const disableBtns = page.locator('button:has-text("Disable")');
    if (await disableBtns.count() > 0) {
      await disableBtns.first().click();
      await page.waitForTimeout(300);
    }

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F4: Class & PT Booking - booking and waitlist', async ({ page }) => {
    await page.locator('button:has-text("Class & PT Booking")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Class & PT Booking');

    // Verify class cards are displayed
    const classCards = page.locator('.card:has(h3)');
    const cardCount = await classCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(6);

    // Find a bookable class (not full) and book it
    const bookBtns = page.locator('button:has-text("Book")');
    if (await bookBtns.count() > 0) {
      await bookBtns.first().click();
      await page.waitForTimeout(300);
      // Should now show Cancel Booking button
      await expect(page.locator('button:has-text("Cancel Booking")').first()).toBeVisible();
      // Cancel it
      await page.locator('button:has-text("Cancel Booking")').first().click();
      await page.waitForTimeout(300);
    }

    // Find a full class and try waitlist
    const waitlistBtns = page.locator('button:has-text("Join Waitlist")');
    if (await waitlistBtns.count() > 0) {
      await waitlistBtns.first().click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=On Waitlist').first()).toBeVisible();
    }

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F5: CRM & Lead Management - kanban board', async ({ page }) => {
    await page.locator('button:has-text("CRM & Lead Management")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('CRM & Lead Management');

    // Verify 5 kanban columns
    const columns = page.locator('.grid-cols-5 > div');
    expect(await columns.count()).toBe(5);

    // Verify column headers
    await expect(page.locator('text=NEW')).toBeVisible();
    await expect(page.locator('text=CONTACTED')).toBeVisible();
    await expect(page.locator('text=TRIAL BOOKED')).toBeVisible();
    await expect(page.locator('text=CONVERTED')).toBeVisible();
    await expect(page.locator('text=LOST')).toBeVisible();

    // Verify lead cards have draggable attribute
    const leadCards = page.locator('[draggable="true"]');
    expect(await leadCards.count()).toBeGreaterThanOrEqual(5);

    // Verify source tags exist
    await expect(page.locator('text=Walk-in').first()).toBeVisible();

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F6: Marketing Automation - workflow builder', async ({ page }) => {
    await page.locator('button:has-text("Marketing Automation")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Marketing Automation');

    // Verify workflow builder with 3 steps
    await expect(page.locator('text=Workflow Builder')).toBeVisible();
    await expect(page.locator('label:has-text("1. Trigger")')).toBeVisible();
    await expect(page.locator('label:has-text("2. Delay")')).toBeVisible();
    await expect(page.locator('label:has-text("3. Action")')).toBeVisible();

    // Change trigger and verify preview updates
    await page.locator('select').first().selectOption('birthday');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Happy Birthday,')).toBeVisible();

    // Add a workflow
    await page.locator('button:has-text("Add Workflow")').click();
    await page.waitForTimeout(300);

    // Verify active workflows section
    await expect(page.locator('text=Active Workflows')).toBeVisible();

    // Toggle workflow
    const pauseBtns = page.locator('button:has-text("Pause")');
    if (await pauseBtns.count() > 0) {
      await pauseBtns.first().click();
      await page.waitForTimeout(300);
    }

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F7: Branded Member App - mobile mockup', async ({ page }) => {
    await page.locator('button:has-text("Branded Member App")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Branded Member App');

    // Verify the mobile mockup is rendered
    const phoneFrame = page.locator('.rounded-\\[2rem\\]');
    await expect(phoneFrame).toBeVisible();

    // Verify greeting header
    await expect(page.locator('text=Good morning,')).toBeVisible();
    await expect(page.locator('text=Alex')).toBeVisible();

    // Verify 3 quick action buttons
    const quickActions = page.locator('text=Book a Class');
    await expect(quickActions).toBeVisible();
    await expect(page.locator('text=QR Code')).toBeVisible();
    await expect(page.locator('text=Payments')).toBeVisible();

    // Verify upcoming class card
    await expect(page.locator('text=Up Next')).toBeVisible();
    await expect(page.locator('text=Morning MMA')).toBeVisible();

    // Verify recent activity
    await expect(page.locator('text=Recent Activity')).toBeVisible();
    const activityItems = page.locator('text=Checked in');
    expect(await activityItems.count()).toBe(3);

    // Verify bottom nav
    await expect(page.locator('text=Home').last()).toBeVisible();
    await expect(page.locator('text=Classes').last()).toBeVisible();

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F8: Point of Sale - product grid and cart', async ({ page }) => {
    await page.locator('button:has-text("Point of Sale")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Point of Sale');

    // Verify product tiles are displayed
    const productTiles = page.locator('button:has-text("In Stock"), button:has-text("left")');
    expect(await productTiles.count()).toBeGreaterThanOrEqual(5);

    // Click a product to add to cart
    const firstProduct = page.locator('button:has-text("In Stock")').first();
    await firstProduct.click();
    await page.waitForTimeout(200);

    // Verify cart shows the item
    await expect(page.locator('text=1 items')).toBeVisible();
    const cartItems = page.locator('.sticky button:has-text("−")');
    expect(await cartItems.count()).toBeGreaterThanOrEqual(1);

    // Add more quantity
    const plusBtn = page.locator('.sticky button:has-text("+")').first();
    await plusBtn.click();
    await page.waitForTimeout(200);

    // Charge
    await page.locator('button:has-text("Charge")').click();
    await expect(page.locator('text=✓ Charged!')).toBeVisible({ timeout: 3000 });

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F9: Reporting & Analytics - KPIs and chart', async ({ page }) => {
    await page.locator('button:has-text("Reporting & Analytics")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Reporting & Analytics');

    // Verify 4 KPI cards
    await expect(page.locator('text=Active Members')).toBeVisible();
    await expect(page.locator('text=Monthly Recurring Revenue')).toBeVisible();
    await expect(page.locator('text=Churn Rate')).toBeVisible();
    await expect(page.locator('text=Classes Booked This Week')).toBeVisible();

    // Verify KPI values
    await expect(page.locator('text=847')).toBeVisible();
    await expect(page.locator('text=$67,432')).toBeVisible();
    await expect(page.locator('text=3.2%')).toBeVisible();
    await expect(page.locator('text=1,284')).toBeVisible();

    // Verify revenue chart
    await expect(page.locator('text=Monthly Revenue')).toBeVisible();
    const chartBars = page.locator('.bg-red-500.rounded-t');
    expect(await chartBars.count()).toBe(6);

    // Verify recent sign-ups table
    await expect(page.locator('text=Recent Sign-ups')).toBeVisible();
    const signupRows = page.locator('table tbody tr');
    expect(await signupRows.count()).toBe(5);

    // Verify export buttons
    await expect(page.locator('button:has-text("Export PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();

    // Verify date range filter
    await expect(page.locator('select').first()).toBeVisible();

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F10: Self-Service Kiosk - welcome screen', async ({ page }) => {
    await page.locator('button:has-text("Self-Service Kiosk")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toHaveText('Self-Service Kiosk & Client Portal');

    // Verify kiosk welcome screen
    await expect(page.getByRole('heading', { name: 'ROAR MMA', exact: true })).toBeVisible();
    await expect(page.locator('text=Perth CBD')).toBeVisible();

    // Verify two large buttons
    await expect(page.locator('button:has-text("New Member — Sign Up")')).toBeVisible();
    await expect(page.locator('button:has-text("Existing Member — Check In")')).toBeVisible();

    // Verify staff login link
    await expect(page.getByRole('button', { name: 'Staff login' })).toBeVisible();

    // Click sign up and verify form
    await page.locator('button:has-text("New Member — Sign Up")').click();
    await expect(page.locator('text=New Member Sign-up')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your name"]')).toBeVisible();
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible();

    // Go back
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.waitForTimeout(300);

    // Click check in
    await page.locator('button:has-text("Existing Member — Check In")').click();
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible();
    await expect(page.locator('input[placeholder="Member ID or scan card"]')).toBeVisible();

    // Back to kiosk main
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.waitForTimeout(300);

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F11: Staff Management - profile cards', async ({ page }) => {
    await page.locator('button:has-text("Staff Management")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Staff Management');

    // Verify staff cards are displayed
    const staffCards = page.locator('.card:has(h3)');
    expect(await staffCards.count()).toBeGreaterThanOrEqual(6);

    // Verify specific staff members
    await expect(page.locator('text=Alex Reid')).toBeVisible();
    await expect(page.locator('text=Carlos Santos')).toBeVisible();
    await expect(page.locator('text=Sakda Somchai')).toBeVisible();
    await expect(page.locator('text=Lena Park')).toBeVisible();

    // Verify role badges
    await expect(page.locator('text=Trainer').first()).toBeVisible();

    // Verify skills tags
    await expect(page.locator('text=MMA').first()).toBeVisible();
    await expect(page.locator('text=BJJ').first()).toBeVisible();

    // Verify schedule grid (Mon-Sun)
    await expect(page.locator('text=Mon').first()).toBeVisible();
    await expect(page.locator('text=Sun').first()).toBeVisible();
    const checkMarks = page.locator('text=✓');
    expect(await checkMarks.count()).toBeGreaterThanOrEqual(10);

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

  test('F12: Multi-Location Management - location switcher', async ({ page }) => {
    await page.locator('button:has-text("Multi-Location Management")').click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Multi-Location Management');

    // Verify location sidebar
    await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible();
    const locationItems = page.locator('.divide-y button:has-text("ROAR MMA")');
    expect(await locationItems.count()).toBe(5);

    // First location should be selected by default
    await expect(page.locator('.divide-y button:has-text("Perth CBD")').first()).toBeVisible();

    // Verify location detail panel
    await expect(page.locator('.bg-blue-50 .font-medium')).toBeVisible();
    await expect(page.locator('.bg-green-50 .font-medium')).toBeVisible();
    await expect(page.locator('.bg-purple-50 .font-medium')).toBeVisible();

    // Verify status indicators (green/grey dots)
    const greenDots = page.locator('.bg-green-500');
    expect(await greenDots.count()).toBeGreaterThanOrEqual(3);

    // Switch to a different location
    await page.locator('.divide-y button:has-text("Joondalup")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=312').first()).toBeVisible();

    // Verify quick actions
    await expect(page.locator('button:has-text("View Members")')).toBeVisible();
    await expect(page.locator('button:has-text("View Schedule")')).toBeVisible();
    await expect(page.locator('button:has-text("Location Settings")')).toBeVisible();

    await page.locator('button:has-text("Back to PerfectGym")').click();
  });

});
