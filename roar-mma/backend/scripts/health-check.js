#!/usr/bin/env node
// Quick Health Check - Fast system status verification
// Usage: node scripts/health-check.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const DB_PATH = path.join(__dirname, '../../data/roarmma.db');

// Quick HTTP request
function quickRequest(path) {
  return new Promise((resolve) => {
    const req = http.request(`${BASE_URL}${path}`, { method: 'GET', timeout: 2000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false });
        }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
    req.end();
  });
}

async function healthCheck() {
  console.log('🏥 ROAR MMA Health Check\n');

  let allGood = true;

  // 1. Server status
  process.stdout.write('Server (port 3001)... ');
  const serverCheck = await quickRequest('/api/health');
  if (serverCheck.ok) {
    console.log('✅ Running');
  } else {
    console.log('❌ Not responding');
    allGood = false;
  }

  // 2. Database file
  process.stdout.write('Database file....... ');
  if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ ${sizeMB} MB`);
  } else {
    console.log('❌ Missing');
    allGood = false;
  }

  // 3. Database connection
  if (serverCheck.ok && serverCheck.data.database) {
    process.stdout.write('Database connection. ');
    console.log(`✅ ${serverCheck.data.database}`);
  }

  // 4. WebSocket
  if (serverCheck.ok && serverCheck.data.websocket) {
    process.stdout.write('WebSocket........... ');
    console.log(`✅ ${serverCheck.data.websocket}`);
  }

  // 5. Quick table count check
  if (serverCheck.ok) {
    try {
      const db = require('better-sqlite3')(DB_PATH);
      const tables = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get();
      process.stdout.write('Database tables..... ');
      console.log(`✅ ${tables.count} tables`);

      // Check key tables
      const keyTables = ['staff', 'members', 'leads', 'products', 'belt_levels'];
      const missing = [];
      for (const table of keyTables) {
        const exists = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (exists.count === 0) missing.push(table);
      }

      if (missing.length > 0) {
        console.log(`⚠️  Missing tables: ${missing.join(', ')}`);
        allGood = false;
      }

      db.close();
    } catch (err) {
      console.log('⚠️  Could not verify tables');
    }
  }

  console.log('\n' + (allGood ? '✅ System healthy' : '⚠️  Issues detected'));
  process.exit(allGood ? 0 : 1);
}

healthCheck();
