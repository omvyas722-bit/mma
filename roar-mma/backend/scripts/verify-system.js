#!/usr/bin/env node
// System verification script - tests all major endpoints

const http = require('http');

const BASE_URL = 'http://localhost:3001';
let token = null;

// Helper function to make HTTP requests
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testHealth() {
  console.log('\n🔍 Testing Health Endpoint...');
  const res = await request('GET', '/api/health');

  if (res.status === 200) {
    console.log('✅ Health check passed');
    console.log(`   Database: ${res.data.database}`);
    console.log(`   WebSocket: ${res.data.websocket}`);
    return true;
  } else {
    console.log('❌ Health check failed');
    return false;
  }
}

async function testLogin() {
  console.log('\n🔍 Testing Authentication...');
  const res = await request('POST', '/api/auth/login', {
    email: 'admin@roarmma.com.au',
    password: 'changeme123'
  });

  if (res.status === 200 && res.data.token) {
    token = res.data.token;
    console.log('✅ Login successful');
    console.log(`   User: ${res.data.user.name}`);
    console.log(`   Role: ${res.data.user.role}`);
    return true;
  } else {
    console.log('❌ Login failed');
    console.log(`   Status: ${res.status}`);
    return false;
  }
}

async function testBeltLevels() {
  console.log('\n🔍 Testing Belt Grading System...');
  const res = await request('GET', '/api/grading/belts');

  if (res.status === 200 && Array.isArray(res.data)) {
    console.log(`✅ Belt levels loaded: ${res.data.length} belts`);
    return true;
  } else {
    console.log('❌ Belt levels failed');
    return false;
  }
}

async function testProducts() {
  console.log('\n🔍 Testing Stock System...');
  const res = await request('GET', '/api/stock/products');

  if (res.status === 200 && Array.isArray(res.data)) {
    console.log(`✅ Products loaded: ${res.data.length} products`);
    return true;
  } else {
    console.log('❌ Products failed');
    return false;
  }
}

async function testAnalytics() {
  console.log('\n🔍 Testing Analytics Dashboard...');
  const res = await request('GET', '/api/analytics/dashboard');

  if (res.status === 200 && res.data.revenue) {
    console.log('✅ Analytics dashboard working');
    console.log(`   Total revenue: $${res.data.revenue.total_revenue || 0}`);
    console.log(`   Total leads: ${res.data.leads.total_leads || 0}`);
    return true;
  } else {
    console.log('❌ Analytics failed');
    return false;
  }
}

async function testStockAlerts() {
  console.log('\n🔍 Testing Stock Alerts...');
  const res = await request('GET', '/api/stock/alerts');

  if (res.status === 200) {
    console.log(`✅ Stock alerts working: ${res.data.length} active alerts`);
    return true;
  } else {
    console.log('❌ Stock alerts failed');
    return false;
  }
}

async function testMessagingStats() {
  console.log('\n🔍 Testing Messaging System...');
  const res = await request('GET', '/api/messaging/stats');

  if (res.status === 200) {
    console.log('✅ Messaging stats working');
    console.log(`   SMS sent: ${res.data.sms_sent || 0}`);
    console.log(`   Email sent: ${res.data.email_sent || 0}`);
    return true;
  } else {
    console.log('❌ Messaging stats failed');
    return false;
  }
}

async function testPhoneAnalytics() {
  console.log('\n🔍 Testing Phone System...');
  const res = await request('GET', '/api/phone/analytics');

  if (res.status === 200) {
    console.log('✅ Phone analytics working');
    console.log(`   Total calls: ${res.data.total_calls || 0}`);
    return true;
  } else {
    console.log('❌ Phone analytics failed');
    return false;
  }
}

async function testRetentionAnalytics() {
  console.log('\n🔍 Testing Retention System...');
  const res = await request('GET', '/api/retention/analytics');

  if (res.status === 200) {
    console.log('✅ Retention analytics working');
    console.log(`   Total requests: ${res.data.total_requests || 0}`);
    console.log(`   Retention rate: ${res.data.retention_rate || 0}%`);
    return true;
  } else {
    console.log('❌ Retention analytics failed');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 ROAR MMA System Verification');
  console.log('================================\n');
  console.log(`Testing server at: ${BASE_URL}`);

  const results = [];

  try {
    // Test health first (no auth required)
    results.push(await testHealth());

    // Test login to get token
    results.push(await testLogin());

    if (!token) {
      console.log('\n❌ Cannot continue without authentication');
      process.exit(1);
    }

    // Test all systems
    results.push(await testBeltLevels());
    results.push(await testProducts());
    results.push(await testAnalytics());
    results.push(await testStockAlerts());
    results.push(await testMessagingStats());
    results.push(await testPhoneAnalytics());
    results.push(await testRetentionAnalytics());

    // Summary
    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n================================');
    console.log('📊 Test Summary');
    console.log('================================');
    console.log(`Passed: ${passed}/${total}`);
    console.log(`Failed: ${total - passed}/${total}`);

    if (passed === total) {
      console.log('\n✅ All systems operational!');
      console.log('\nSystem is ready for use.');
      console.log('Next steps:');
      console.log('1. Change default admin password');
      console.log('2. Configure Twilio/Brevo credentials');
      console.log('3. Start using the API\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some systems failed verification');
      console.log('Check the errors above and review logs\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error('\nMake sure the server is running:');
    console.error('  cd backend && node server.js\n');
    process.exit(1);
  }
}

// Run tests
runTests();
