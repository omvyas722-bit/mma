# ROAR MMA Quick Reference Guide

## Daily Commands

### Start/Stop Server
```bash
# Start server
cd backend
npm start

# Start with auto-reload (development)
npm run dev

# Check if running
npm run health
```

### Health Checks
```bash
# Quick check (5 seconds)
npm run health

# Full verification (30 seconds)
npm run verify

# Test all workflows
npm run examples
```

### Database Operations
```bash
# Initialize/reset database
npm run db:init

# Backup database (manual)
cp ../data/roarmma.db ../data/backup-$(date +%Y%m%d).db

# Check database size
ls -lh ../data/roarmma.db
```

### Maintenance
```bash
# Windows
powershell -ExecutionPolicy Bypass -File scripts/maintenance.ps1

# Unix/Mac
bash scripts/maintenance.sh
```

---

## Common API Calls

### Authentication
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@roarmma.com.au","password":"changeme123"}'

# Returns: {"token":"...", "user":{...}}
```

### Create Lead
```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "first_name":"John",
    "last_name":"Smith",
    "phone":"0412345678",
    "email":"john@email.com",
    "source":"website",
    "interest_level":"high"
  }'
```

### Book PT Session
```bash
curl -X POST http://localhost:3001/api/pt-sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "member_id":1,
    "coach_id":1,
    "scheduled_date":"2026-05-15",
    "scheduled_time":"14:00",
    "duration_minutes":60,
    "amount":80.00,
    "commission_rate":50
  }'
```

### Check Analytics
```bash
curl http://localhost:3001/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Server Won't Start
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001    # Windows
lsof -i :3001                   # Unix/Mac

# Kill process on port 3001
taskkill //F //PID <PID>        # Windows
kill -9 <PID>                   # Unix/Mac
```

### Database Issues
```bash
# Reinitialize database (WARNING: deletes all data)
npm run db:init

# Check database integrity
npm run health
```

### Messages Not Sending
1. Check provider settings in database
2. Verify credentials in .env file
3. Uncomment provider code in `services/messagingProviders.js`
4. Test with: `curl http://localhost:3001/api/messaging/test/sms`

### Health Check Fails
```bash
# Check server is running
curl http://localhost:3001/api/health

# Check logs
pm2 logs roar-mma              # If using PM2
node server.js                 # Run in foreground to see errors
```

---

## File Locations

### Configuration
- `.env` - Environment variables (JWT_SECRET, ports, etc.)
- `package.json` - Dependencies and scripts

### Database
- `../data/roarmma.db` - Main database file
- `db/migrations/` - Schema migrations (9 files)

### Scripts
- `scripts/init-database.js` - Database initialization
- `scripts/health-check.js` - Quick health check
- `scripts/verify-system.js` - Full system verification
- `scripts/api-examples.js` - API workflow tests
- `scripts/maintenance.ps1` - Windows maintenance
- `scripts/maintenance.sh` - Unix/Mac maintenance

### Logs
- `logs/` - Application logs (if configured)
- PM2 logs: `~/.pm2/logs/`

---

## Important URLs

### Local Development
- Server: http://localhost:3001
- Health: http://localhost:3001/api/health
- WebSocket: ws://localhost:3001

### API Endpoints
- Auth: `/api/auth/login`
- Leads: `/api/leads`
- Members: `/api/members`
- PT Sessions: `/api/pt-sessions`
- Stock: `/api/stock/products`
- Analytics: `/api/analytics/dashboard`

Full API docs: See `API_DOCUMENTATION.md`

---

## Default Credentials

**Admin User:**
- Email: `admin@roarmma.com.au`
- Password: `changeme123`
- Role: `owner` (full permissions)

**⚠️ CHANGE PASSWORD IMMEDIATELY IN PRODUCTION**

---

## Quick Checks

### Is System Healthy?
```bash
npm run health
# Exit code 0 = healthy, 1 = issues
```

### How Many Leads Today?
```bash
curl http://localhost:3001/api/leads/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### How Much Revenue This Month?
```bash
curl http://localhost:3001/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Any Stock Alerts?
```bash
curl http://localhost:3001/api/stock/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Any Pending Cancellations?
```bash
curl http://localhost:3001/api/retention/cancellation-requests?status=pending \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Automated Services Status

All services run automatically when server starts:

1. **Message Scheduler** - Sends scheduled SMS/email (60s interval)
2. **Task Automation** - Creates staff tasks for high-priority leads
3. **Nurturing Sequences** - Multi-day lead follow-ups
4. **Win-back Automation** - 4-stage campaigns for cancelled members
5. **AI Phone Service** - Handles incoming calls 24/7
6. **Messaging Providers** - Twilio/Brevo integration
7. **Unified Analytics** - Aggregates metrics from all systems
8. **Stock Alerts** - Monitors inventory levels
9. **Belt Progress** - Tracks member grading progression

Check logs to verify services are running.

---

## Performance Tips

### Database
- SQLite works well up to ~100 concurrent users
- For larger scale, migrate to PostgreSQL
- Regular backups recommended (automated in maintenance script)

### API
- Use pagination for large result sets
- Cache frequently accessed data
- Monitor response times with health checks

### Messaging
- Rate limits: 5 SMS, 10 email per day per contact
- Costs tracked in `message_costs` table
- Unsubscribe management built-in

---

## Security Checklist

### Pre-Production
- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Configure firewall (allow only ports 80, 443, 3001)
- [ ] Enable SSL/HTTPS
- [ ] Set CORS to production domain only
- [ ] Review API permissions
- [ ] Configure automated backups
- [ ] Set up monitoring/alerting

### Post-Production
- [ ] Monitor logs daily
- [ ] Review security alerts
- [ ] Update dependencies monthly
- [ ] Test backups weekly
- [ ] Review access logs
- [ ] Audit user permissions quarterly

---

## Getting Help

### Documentation
1. `README.md` - Main documentation
2. `GETTING_STARTED.md` - Quick start guide
3. `API_DOCUMENTATION.md` - Complete API reference
4. `DEPLOYMENT.md` - Production deployment
5. `FINAL_STATUS_REPORT.md` - System status

### Scripts
```bash
npm run health      # Quick health check
npm run verify      # Full verification
npm run examples    # Test workflows
```

### Common Issues
See `TROUBLESHOOTING.md` (if exists) or check logs:
```bash
pm2 logs roar-mma
# or
tail -f logs/app.log
```

---

## Backup & Recovery

### Manual Backup
```bash
# Backup database
cp ../data/roarmma.db ../data/backup-$(date +%Y%m%d).db

# Backup with compression
tar -czf roarmma-backup-$(date +%Y%m%d).tar.gz ../data/roarmma.db .env
```

### Restore from Backup
```bash
# Stop server first
pm2 stop roar-mma

# Restore database
cp ../data/backup-20260506.db ../data/roarmma.db

# Restart server
pm2 start roar-mma
```

### Automated Backups
Windows: Schedule `maintenance.ps1` in Task Scheduler
Unix/Mac: Add to crontab:
```bash
0 2 * * * cd /path/to/backend/scripts && bash maintenance.sh
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Start server | `npm start` |
| Health check | `npm run health` |
| Full verify | `npm run verify` |
| Test workflows | `npm run examples` |
| Reset database | `npm run db:init` |
| Backup database | `cp ../data/roarmma.db ../data/backup.db` |
| View logs | `pm2 logs roar-mma` |
| Restart server | `pm2 restart roar-mma` |

---

**Last Updated:** 2026-05-06  
**Version:** 1.0.0
