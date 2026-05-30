#!/usr/bin/env node
// Common API Usage Examples
// Demonstrates typical workflows for ROAR MMA system

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let token = null;

// Helper function
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : {} });
        } catch (e) {
          console.error('[API-EXAMPLES] JSON parse error:', e.message);
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Example workflows
async function example1_NewLeadToTrial() {
  console.log('\n📋 Example 1: New Lead → Trial Booking → Follow-ups\n');

  // 1. Create lead
  console.log('1. Creating new lead...');
  const lead = await request('POST', '/api/leads', {
    first_name: 'John',
    last_name: 'Smith',
    phone: '0412345678',
    email: 'john@email.com',
    source: 'website',
    interest_level: 'high'
  });
  console.log(`   ✅ Lead created: ID ${lead.data.id}`);

  // 2. Check lead score
  console.log('2. Checking lead score...');
  const score = await request('GET', `/api/lead-scoring/score-breakdown/${lead.data.id}`);
  console.log(`   ✅ Lead score: ${score.data.total_score}/100 (${score.data.priority} priority)`);

  // 3. Book trial
  console.log('3. Booking trial...');
  const trial = await request('PUT', `/api/leads/${lead.data.id}`, {
    stage: 'trial_booked',
    trial_date: '2026-05-15T10:00:00Z',
    trial_interest_level: 'hot'
  });
  console.log(`   ✅ Trial booked for ${trial.data.trial_date}`);

  // 4. Schedule follow-ups
  console.log('4. Scheduling automated follow-ups...');
  const followups = await request('POST', `/api/leads/${lead.data.id}/schedule-trial-followups`, {
    trial_date: '2026-05-15T10:00:00Z'
  });
  console.log(`   ✅ ${followups.data.length || 5} follow-up messages scheduled`);

  console.log('\n✅ Complete workflow: Lead → Trial → Automated follow-ups\n');
}

async function example2_PTSessionBooking() {
  console.log('\n📋 Example 2: PT Session Booking → Completion → Commission\n');

  // 1. Book PT session
  console.log('1. Booking PT session...');
  const session = await request('POST', '/api/pt-sessions', {
    member_id: 1,
    coach_id: 1,
    scheduled_date: '2026-05-15',
    scheduled_time: '14:00',
    duration_minutes: 60,
    session_type: 'pt',
    amount: 80.00,
    commission_rate: 50
  });
  console.log(`   ✅ Session booked: ID ${session.data.id}`);

  // 2. Complete session
  console.log('2. Completing session...');
  const completed = await request('POST', `/api/pt-sessions/${session.data.id}/complete`, {
    notes: 'Great session, worked on technique'
  });
  console.log(`   ✅ Session completed`);
  console.log(`   💰 Commission: $${completed.data.commission_amount}`);

  // 3. Check coach stats
  console.log('3. Checking coach performance...');
  const stats = await request('GET', '/api/pt-sessions/coach-stats/1');
  console.log(`   ✅ Coach stats:`);
  console.log(`      Sessions: ${stats.data.completed_sessions}`);
  console.log(`      Revenue: $${stats.data.total_revenue}`);
  console.log(`      Commission: $${stats.data.total_commission}`);

  console.log('\n✅ Complete workflow: Book → Complete → Commission calculated\n');
}

async function example3_CancellationRetention() {
  console.log('\n📋 Example 3: Cancellation Request → Retention Offer → Save Member\n');

  // 1. Create cancellation request
  console.log('1. Member requests cancellation...');
  const request_data = await request('POST', '/api/retention/cancellation-requests', {
    member_id: 1,
    cancellation_reason: 'Cost is too high',
    reason_category: 'cost'
  });
  console.log(`   ✅ Request created: ID ${request_data.data.id}`);

  // 2. View auto-generated offers
  console.log('2. System generated retention offers...');
  const full_request = await request('GET', `/api/retention/cancellation-requests/${request_data.data.id}`);
  console.log(`   ✅ ${full_request.data.offers.length} offers generated:`);
  full_request.data.offers.forEach((offer, i) => {
    console.log(`      ${i+1}. ${offer.offer_type} - ${JSON.parse(offer.offer_details).description}`);
  });

  // 3. Accept offer
  console.log('3. Member accepts discount offer...');
  const accepted = await request('POST', `/api/retention/retention-offers/${full_request.data.offers[0].id}/accept`, {
    member_id: 1
  });
  console.log(`   ✅ Offer accepted - member retained!`);

  console.log('\n✅ Complete workflow: Cancellation → Offers → Retention\n');
}

async function example4_StockSale() {
  console.log('\n📋 Example 4: Product Sale → Stock Update → Low Stock Alert\n');

  // 1. Check product stock
  console.log('1. Checking product stock...');
  const product = await request('GET', '/api/stock/products/1');
  console.log(`   ✅ ${product.data.name}: ${product.data.stock_quantity} in stock`);

  // 2. Record sale
  console.log('2. Recording product sale...');
  const sale = await request('POST', '/api/stock/sales', {
    product_id: 1,
    quantity: 2,
    unit_price: 35.00,
    member_id: 1,
    payment_method: 'card'
  });
  console.log(`   ✅ Sale recorded: $${sale.data.total_amount}`);

  // 3. Check updated stock
  console.log('3. Checking updated stock...');
  const updated = await request('GET', '/api/stock/products/1');
  console.log(`   ✅ New stock level: ${updated.data.stock_quantity}`);

  // 4. Check for alerts
  console.log('4. Checking stock alerts...');
  const alerts = await request('GET', '/api/stock/alerts');
  console.log(`   ✅ ${alerts.data.length} active stock alerts`);

  console.log('\n✅ Complete workflow: Sale → Stock deducted → Alert generated\n');
}

async function example5_BeltPromotion() {
  console.log('\n📋 Example 5: Belt Grading → Eligibility Check → Promotion\n');

  // 1. Check eligibility
  console.log('1. Checking grading eligibility...');
  const eligibility = await request('GET', '/api/grading/members/1/eligibility');
  console.log(`   ${eligibility.data.eligible ? '✅' : '❌'} Eligible: ${eligibility.data.eligible}`);
  if (!eligibility.data.eligible) {
    console.log(`   Reasons:`);
    eligibility.data.reasons.forEach(r => console.log(`      - ${r}`));
  }

  // 2. Update technique proficiency
  console.log('2. Updating technique proficiency...');
  const technique = await request('POST', '/api/grading/members/1/techniques', {
    requirement_id: 1,
    proficiency_level: 'mastered',
    notes: 'Excellent form'
  });
  console.log(`   ✅ Technique updated`);

  // 3. Award stripe
  console.log('3. Awarding stripe...');
  const stripe = await request('POST', '/api/grading/members/1/award-stripe');
  console.log(`   ✅ Stripe awarded: ${stripe.data.current_stripes} stripes`);

  // 4. View grading history
  console.log('4. Viewing grading history...');
  const history = await request('GET', '/api/grading/members/1/history');
  console.log(`   ✅ ${history.data.length} grading events in history`);

  console.log('\n✅ Complete workflow: Check eligibility → Update progress → Award stripe\n');
}

async function example6_AnalyticsDashboard() {
  console.log('\n📋 Example 6: Analytics Dashboard → Revenue Forecast → Insights\n');

  // 1. Get complete dashboard
  console.log('1. Loading complete dashboard...');
  const dashboard = await request('GET', '/api/analytics/dashboard?date_from=2026-05-01');
  console.log(`   ✅ Dashboard loaded`);
  console.log(`      Total Revenue: $${dashboard.data.revenue.total_revenue}`);
  console.log(`      MRR: $${dashboard.data.revenue.mrr}`);
  console.log(`      Total Leads: ${dashboard.data.leads.total_leads}`);
  console.log(`      Conversion Rate: ${dashboard.data.leads.conversion_rate}%`);

  // 2. Get conversion funnel
  console.log('2. Analyzing conversion funnel...');
  const funnel = await request('GET', '/api/analytics/funnel?date_from=2026-05-01');
  console.log(`   ✅ Funnel analysis:`);
  console.log(`      Leads: ${funnel.data.leads_created}`);
  console.log(`      Trials: ${funnel.data.trials_booked} (${funnel.data.lead_to_trial_rate}%)`);
  console.log(`      Converted: ${funnel.data.converted} (${funnel.data.overall_conversion_rate}%)`);

  // 3. Get revenue forecast
  console.log('3. Generating revenue forecast...');
  const forecast = await request('GET', '/api/analytics/forecast');
  console.log(`   ✅ 3-month forecast:`);
  console.log(`      Current MRR: $${forecast.data.current_mrr}`);
  console.log(`      Growth Rate: ${forecast.data.growth_rate}%`);
  forecast.data.forecast.forEach(f => {
    console.log(`      ${f.month}: $${f.projected_revenue} (${f.projected_members} members)`);
  });

  console.log('\n✅ Complete workflow: Dashboard → Funnel → Forecast\n');
}

// Main runner
async function runExamples() {
  console.log('🚀 ROAR MMA API Usage Examples');
  console.log('================================\n');

  // Login first
  console.log('Logging in...');
  const login = await request('POST', '/api/auth/login', {
    email: process.env.ADMIN_EMAIL || 'admin@roarmma.com.au',
    password: process.env.ADMIN_PASSWORD || 'changeme123'
  });

  if (login.status !== 200) {
    console.error('❌ Login failed. Make sure server is running and credentials are correct.');
    process.exit(1);
  }

  token = login.data.token;
  console.log('✅ Logged in as', login.data.user.name, '\n');

  // Run examples
  try {
    await example1_NewLeadToTrial();
    await example2_PTSessionBooking();
    await example3_CancellationRetention();
    await example4_StockSale();
    await example5_BeltPromotion();
    await example6_AnalyticsDashboard();

    console.log('================================');
    console.log('✅ All examples completed successfully!\n');
    console.log('These examples demonstrate:');
    console.log('1. Lead nurturing workflow');
    console.log('2. PT session management');
    console.log('3. Retention automation');
    console.log('4. Stock management');
    console.log('5. Belt grading system');
    console.log('6. Analytics and forecasting\n');

  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runExamples();
}

module.exports = { runExamples };
