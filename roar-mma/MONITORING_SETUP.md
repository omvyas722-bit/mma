# Production Monitoring & Alerting Setup Guide

**Purpose:** Set up comprehensive monitoring and alerting for ROAR MMA system in production.

---

## Overview

Production monitoring ensures:
- Early detection of issues
- Performance tracking
- Uptime monitoring
- Resource usage alerts
- Error tracking

---

## 1. Server Monitoring with PM2

### PM2 Built-in Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Logs
pm2 logs roar-mma
pm2 logs roar-mma --err  # Errors only
```

### PM2 Plus (Cloud Monitoring)

```bash
# Link to PM2 Plus (free tier available)
pm2 link <secret_key> <public_key>

# Features:
# - Real-time dashboard
# - Error tracking
# - Performance metrics
# - Custom metrics
# - Alerts via email/Slack
```

**Setup:**
1. Sign up at https://app.pm2.io
2. Get keys from dashboard
3. Run `pm2 link` command
4. Configure alerts in web dashboard

---

## 2. Uptime Monitoring

### Option A: UptimeRobot (Free)

**Setup:**
1. Sign up at https://uptimerobot.com
2. Add monitor:
   - Type: HTTP(s)
   - URL: https://yourdomain.com/api/health
   - Interval: 5 minutes
3. Configure alerts:
   - Email notifications
   - SMS (paid)
   - Slack/Discord webhooks

**Alert Conditions:**
- Down for 2+ checks
- Response time > 5 seconds
- Status code != 200

### Option B: Pingdom

**Setup:**
1. Sign up at https://www.pingdom.com
2. Create uptime check
3. Set alert contacts
4. Configure thresholds

### Option C: Self-hosted (Uptime Kuma)

```bash
# Install Uptime Kuma
docker run -d --restart=always -p 3002:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1

# Access at http://localhost:3002
```

---

## 3. Application Performance Monitoring (APM)

### Option A: New Relic (Free tier available)

**Setup:**
```bash
# Install New Relic agent
npm install newrelic --save

# Create newrelic.js config
cp node_modules/newrelic/newrelic.js .

# Edit newrelic.js with license key
nano newrelic.js

# Add to server.js (first line)
require('newrelic');
```

**Features:**
- Transaction tracing
- Error tracking
- Database query analysis
- Custom metrics
- Alerts

### Option B: DataDog

**Setup:**
```bash
# Install DataDog agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<YOUR_KEY> \
  bash -c "$(curl -L https://s.datadoghq.com/scripts/install_script.sh)"

# Install Node.js tracer
npm install dd-trace --save

# Add to server.js
require('dd-trace').init()
```

### Option C: Sentry (Error Tracking)

**Setup:**
```bash
# Install Sentry
npm install @sentry/node --save

# Add to server.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Add error handler
app.use(Sentry.Handlers.errorHandler());
```

---

## 4. Database Monitoring

### SQLite Monitoring Script

Create `scripts/db-monitor.js`:
```javascript
const Database = require('better-sqlite3');
const db = new Database('../data/roarmma.db');

function checkDatabase() {
  const stats = {
    size: require('fs').statSync('../data/roarmma.db').size / 1024 / 1024,
    tables: db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count,
    members: db.prepare("SELECT COUNT(*) as count FROM members").get().count,
    leads: db.prepare("SELECT COUNT(*) as count FROM leads").get().count,
    integrity: db.prepare("PRAGMA integrity_check").get().integrity_check
  };

  // Alert if database > 100MB
  if (stats.size > 100) {
    console.error(`WARNING: Database size ${stats.size}MB exceeds threshold`);
  }

  // Alert if integrity check fails
  if (stats.integrity !== 'ok') {
    console.error(`ERROR: Database integrity check failed: ${stats.integrity}`);
  }

  return stats;
}

console.log(JSON.stringify(checkDatabase(), null, 2));
```

**Schedule with cron:**
```bash
# Check database every hour
0 * * * * cd /var/www/roar-mma/scripts && node db-monitor.js >> /var/log/roar-mma-db.log 2>&1
```

---

## 5. Log Management

### Centralized Logging with PM2

```bash
# Install log rotation
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Log Aggregation (Optional)

**Option A: Papertrail**
```bash
# Install remote_syslog2
wget https://github.com/papertrail/remote_syslog2/releases/download/v0.20/remote_syslog_linux_amd64.tar.gz
tar xzf remote_syslog*.tar.gz
cd remote_syslog
sudo cp remote_syslog /usr/local/bin

# Configure
sudo nano /etc/log_files.yml
```

**Option B: Logtail**
```bash
# Install Logtail source
npm install @logtail/node --save

# Add to server.js
const { Logtail } = require("@logtail/node");
const logtail = new Logtail("YOUR_SOURCE_TOKEN");

// Log to Logtail
logtail.info("Server started");
```

---

## 6. Custom Health Checks

### Enhanced Health Check Endpoint

Add to `routes/health.js`:
```javascript
router.get('/health/detailed', (req, res) => {
  const db = getDatabase();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: true,
      size: fs.statSync('../data/roarmma.db').size,
      tables: db.prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").get()
    },
    services: {
      messageScheduler: true,  // Check if running
      taskAutomation: true,
      // ... other services
    },
    metrics: {
      totalMembers: db.prepare("SELECT COUNT(*) FROM members").get(),
      totalLeads: db.prepare("SELECT COUNT(*) FROM leads").get(),
      activeStaff: db.prepare("SELECT COUNT(*) FROM staff WHERE active=1").get()
    }
  };

  res.json(health);
});
```

### Monitor with cron:
```bash
# Check every 5 minutes
*/5 * * * * curl -f https://yourdomain.com/api/health/detailed || echo "Health check failed" | mail -s "ROAR MMA Alert" admin@roarmma.com.au
```

---

## 7. Alert Configuration

### Critical Alerts (Immediate)
- Server down
- Database corruption
- Out of disk space (>90%)
- Memory usage >90%
- Error rate spike

### Warning Alerts (15 min delay)
- High response times (>1s)
- Disk space >80%
- Memory usage >80%
- Failed backup

### Info Alerts (Daily digest)
- Daily statistics
- Backup success
- Performance summary

---

## 8. Slack Integration

### Webhook Setup

```bash
# Create incoming webhook in Slack
# Get webhook URL

# Create alert script
cat > scripts/slack-alert.sh << 'EOF'
#!/bin/bash
WEBHOOK_URL="YOUR_SLACK_WEBHOOK_URL"
MESSAGE="$1"

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"🚨 ROAR MMA Alert: $MESSAGE\"}" \
  $WEBHOOK_URL
EOF

chmod +x scripts/slack-alert.sh
```

### Use in monitoring:
```bash
# Alert on server down
if ! curl -f http://localhost:3001/api/health; then
  ./scripts/slack-alert.sh "Server is down!"
fi
```

---

## 9. Performance Metrics

### Custom Metrics Collection

Create `scripts/collect-metrics.js`:
```javascript
const db = require('better-sqlite3')('../data/roarmma.db');

function collectMetrics() {
  const metrics = {
    timestamp: new Date().toISOString(),
    
    // Business metrics
    leads_today: db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE DATE(created_at) = DATE('now')
    `).get().count,
    
    trials_today: db.prepare(`
      SELECT COUNT(*) as count FROM leads 
      WHERE stage = 'trial_booked' 
      AND DATE(trial_date) = DATE('now')
    `).get().count,
    
    pt_sessions_today: db.prepare(`
      SELECT COUNT(*) as count FROM pt_sessions 
      WHERE DATE(scheduled_date) = DATE('now')
    `).get().count,
    
    revenue_today: db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM pt_sessions 
      WHERE status = 'completed' 
      AND DATE(completed_at) = DATE('now')
    `).get().total,
    
    // System metrics
    total_members: db.prepare("SELECT COUNT(*) FROM members WHERE status='active'").get(),
    pending_tasks: db.prepare("SELECT COUNT(*) FROM staff_tasks WHERE status='pending'").get(),
    stock_alerts: db.prepare("SELECT COUNT(*) FROM stock_alerts WHERE status='active'").get()
  };

  // Send to monitoring service or log
  console.log(JSON.stringify(metrics));
  
  return metrics;
}

collectMetrics();
```

**Schedule:**
```bash
# Collect metrics every hour
0 * * * * cd /var/www/roar-mma/scripts && node collect-metrics.js >> /var/log/roar-mma-metrics.log
```

---

## 10. Dashboard Setup

### Grafana + Prometheus (Advanced)

**Install Prometheus:**
```bash
# Download and install
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Configure prometheus.yml
cat > prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'roar-mma'
    static_configs:
      - targets: ['localhost:3001']
EOF

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

**Install Grafana:**
```bash
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

**Access:** http://localhost:3000 (admin/admin)

---

## 11. Monitoring Checklist

### Daily Checks
- [ ] Server uptime (automated)
- [ ] Error logs review
- [ ] Performance metrics
- [ ] Backup verification

### Weekly Checks
- [ ] Disk space trends
- [ ] Memory usage trends
- [ ] Response time trends
- [ ] Database size growth

### Monthly Checks
- [ ] Security updates
- [ ] Dependency updates
- [ ] Performance optimization
- [ ] Capacity planning

---

## 12. Alert Response Procedures

### Server Down
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs roar-mma --err`
3. Restart if needed: `pm2 restart roar-mma`
4. If persists, check system resources
5. Escalate if unresolved in 15 min

### High Memory Usage
1. Check PM2 monit: `pm2 monit`
2. Restart application: `pm2 restart roar-mma`
3. Check for memory leaks in logs
4. Monitor after restart

### Database Issues
1. Run integrity check: `npm run health`
2. Check disk space: `df -h`
3. Restore from backup if corrupted
4. Investigate root cause

### Slow Response Times
1. Check server load: `top`
2. Check database queries in logs
3. Check network connectivity
4. Restart if needed

---

## 13. Monitoring Costs

### Free Tier Options
- PM2 Plus: Free for 1 server
- UptimeRobot: 50 monitors free
- Sentry: 5k events/month free
- New Relic: 100GB/month free

### Paid Options (if needed)
- PM2 Plus Pro: $20/month
- DataDog: $15/host/month
- New Relic: $99/month
- Pingdom: $10/month

**Recommended Free Stack:**
- UptimeRobot (uptime)
- PM2 Plus (performance)
- Sentry (errors)
- Custom scripts (business metrics)

**Total Cost:** $0/month

---

## 14. Quick Setup Script

```bash
#!/bin/bash
# Quick monitoring setup

# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Setup health check cron
(crontab -l 2>/dev/null; echo "*/5 * * * * curl -f http://localhost:3001/api/health || echo 'Health check failed' | mail -s 'ROAR MMA Alert' admin@roarmma.com.au") | crontab -

# Setup metrics collection
(crontab -l 2>/dev/null; echo "0 * * * * cd /var/www/roar-mma/scripts && node collect-metrics.js >> /var/log/roar-mma-metrics.log") | crontab -

echo "Monitoring setup complete!"
echo "Next steps:"
echo "1. Sign up for UptimeRobot and add monitor"
echo "2. Link PM2 Plus: pm2 link <keys>"
echo "3. Configure Slack webhook (optional)"
```

---

## 15. Testing Alerts

```bash
# Test server down alert
pm2 stop roar-mma
# Wait for alert
pm2 start roar-mma

# Test high memory alert
# Simulate high memory usage

# Test error alert
# Trigger an error in application

# Verify all alerts received
```

---

## Summary

**Minimum Setup (15 minutes):**
1. PM2 log rotation
2. UptimeRobot monitor
3. Health check cron job

**Recommended Setup (1 hour):**
1. PM2 Plus integration
2. UptimeRobot with Slack
3. Sentry error tracking
4. Custom metrics collection
5. Daily health reports

**Advanced Setup (4 hours):**
1. Full APM (New Relic/DataDog)
2. Grafana dashboards
3. Custom alerting rules
4. Log aggregation
5. Performance profiling

---

**Last Updated:** 2026-05-08  
**Status:** Ready for implementation
