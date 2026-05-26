# ROAR MMA Troubleshooting Guide

**Purpose:** Quick solutions to common production issues.

---

## Quick Diagnostics

### 1. Is System Healthy?
```bash
npm run health
```
**Expected:** All checks pass with ✅

**If fails:** See specific section below.

### 2. Check Server Status
```bash
pm2 status roar-mma
pm2 logs roar-mma --lines 50
```

### 3. Check Database
```bash
ls -lh ../data/roarmma.db
npm run health
```

---

## Common Issues & Solutions

### Server Won't Start

**Symptoms:**
- `npm start` fails
- PM2 shows "errored" status
- Health check fails

**Diagnosis:**
```bash
# Check what's using port 3001
netstat -ano | findstr :3001    # Windows
lsof -i :3001                   # Unix/Mac

# Check logs
pm2 logs roar-mma --err --lines 100

# Try starting in foreground
node server.js
```

**Common Causes & Fixes:**

1. **Port Already in Use**
   ```bash
   # Kill process on port 3001
   taskkill //F //PID <PID>        # Windows
   kill -9 <PID>                   # Unix/Mac
   
   # Or change port in .env
   PORT=3002
   ```

2. **Database Missing**
   ```bash
   npm run db:init
   ```

3. **Missing Dependencies**
   ```bash
   npm install
   ```

4. **Environment File Missing**
   ```bash
   cp .env.example .env
   nano .env  # Add JWT_SECRET
   ```

5. **Permission Issues**
   ```bash
   # Fix file permissions
   chmod -R 755 /var/www/roar-mma
   chown -R $USER:$USER /var/www/roar-mma
   ```

---

### Database Errors

**Symptoms:**
- "Database locked" errors
- "No such table" errors
- Slow queries
- Corruption warnings

**Diagnosis:**
```bash
# Check database integrity
npm run health

# Check database size
ls -lh ../data/roarmma.db

# Check for locks
lsof ../data/roarmma.db
```

**Solutions:**

1. **Database Locked**
   ```bash
   # Restart server to release locks
   pm2 restart roar-mma
   
   # If persists, check for zombie processes
   ps aux | grep node
   kill -9 <PID>
   ```

2. **Table Missing**
   ```bash
   # Reinitialize database (WARNING: loses data)
   npm run db:init
   
   # Or restore from backup
   cp /var/backups/roar-mma/roarmma-YYYYMMDD.db ../data/roarmma.db
   pm2 restart roar-mma
   ```

3. **Database Corrupted**
   ```bash
   # Check integrity
   sqlite3 ../data/roarmma.db "PRAGMA integrity_check;"
   
   # If corrupted, restore from backup
   cp /var/backups/roar-mma/roarmma-YYYYMMDD.db ../data/roarmma.db
   pm2 restart roar-mma
   ```

4. **Database Too Large**
   ```bash
   # Check size
   du -h ../data/roarmma.db
   
   # If >100MB, consider:
   # - Archiving old data
   # - Migrating to PostgreSQL
   # - Cleaning up old records
   ```

---

### Messages Not Sending

**Symptoms:**
- SMS not delivered
- Emails not sent
- Messages stuck in "pending"

**Diagnosis:**
```bash
# Check message scheduler logs
pm2 logs roar-mma | grep "Message scheduler"

# Check scheduled messages
curl http://localhost:3001/api/messaging/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check provider settings
curl http://localhost:3001/api/messaging/providers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Solutions:**

1. **Provider Code Commented Out**
   ```bash
   # Edit services/messagingProviders.js
   # Uncomment Twilio/Brevo implementation
   nano services/messagingProviders.js
   pm2 restart roar-mma
   ```

2. **Missing Credentials**
   ```bash
   # Check .env file
   cat .env | grep TWILIO
   cat .env | grep BREVO
   
   # Add if missing
   nano .env
   pm2 restart roar-mma
   ```

3. **Invalid Credentials**
   ```bash
   # Test SMS
   curl -X POST http://localhost:3001/api/messaging/test/sms \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"phone":"+61412345678","message":"Test"}'
   
   # Check response for errors
   # Update credentials if invalid
   ```

4. **Rate Limiting**
   ```bash
   # Check rate limits
   curl http://localhost:3001/api/messaging/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   
   # Adjust limits in database if needed
   ```

---

### High Memory Usage

**Symptoms:**
- Server slow
- PM2 shows high memory
- Out of memory errors

**Diagnosis:**
```bash
# Check memory usage
pm2 monit

# Check system memory
free -h                # Unix/Mac
systeminfo | findstr Memory  # Windows

# Check for memory leaks
pm2 logs roar-mma | grep "memory"
```

**Solutions:**

1. **Restart Application**
   ```bash
   pm2 restart roar-mma
   pm2 monit  # Verify memory drops
   ```

2. **Increase Memory Limit**
   ```bash
   # Edit PM2 config
   pm2 delete roar-mma
   pm2 start server.js --name roar-mma --max-memory-restart 500M
   pm2 save
   ```

3. **Check for Memory Leaks**
   ```bash
   # Monitor over time
   watch -n 5 'pm2 info roar-mma | grep memory'
   
   # If steadily increasing, investigate code
   pm2 logs roar-mma --err
   ```

4. **Optimize Database Queries**
   ```bash
   # Check slow queries in logs
   pm2 logs roar-mma | grep "slow query"
   
   # Add indexes if needed
   ```

---

### Slow Performance

**Symptoms:**
- API responses slow (>1s)
- Health check timeout
- Users report lag

**Diagnosis:**
```bash
# Check response times
curl -w "@-" -o /dev/null -s http://localhost:3001/api/health << 'EOF'
time_total: %{time_total}s
EOF

# Check server load
top
htop  # If installed

# Check database size
ls -lh ../data/roarmma.db

# Check logs for slow queries
pm2 logs roar-mma | grep "slow"
```

**Solutions:**

1. **Restart Server**
   ```bash
   pm2 restart roar-mma
   ```

2. **Check Database Indexes**
   ```bash
   # Verify indexes exist
   sqlite3 ../data/roarmma.db ".indexes"
   
   # Analyze query performance
   sqlite3 ../data/roarmma.db "EXPLAIN QUERY PLAN SELECT * FROM leads;"
   ```

3. **Optimize Database**
   ```bash
   # Vacuum database
   sqlite3 ../data/roarmma.db "VACUUM;"
   
   # Analyze tables
   sqlite3 ../data/roarmma.db "ANALYZE;"
   ```

4. **Check Disk Space**
   ```bash
   df -h
   
   # If low, clean up:
   # - Old logs
   # - Old backups
   # - Temp files
   ```

---

### Authentication Issues

**Symptoms:**
- Login fails
- "Invalid token" errors
- "Access denied" errors

**Diagnosis:**
```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@roarmma.com.au","password":"changeme123"}'

# Check JWT_SECRET
cat .env | grep JWT_SECRET

# Check user exists
sqlite3 ../data/roarmma.db "SELECT * FROM staff WHERE email='admin@roarmma.com.au';"
```

**Solutions:**

1. **Wrong Password**
   ```bash
   # Reset admin password
   # Generate new hash
   node -e "console.log(require('bcrypt').hashSync('newpassword', 10))"
   
   # Update in database
   sqlite3 ../data/roarmma.db "UPDATE staff SET password_hash='<hash>' WHERE email='admin@roarmma.com.au';"
   ```

2. **JWT_SECRET Changed**
   ```bash
   # All existing tokens invalid after JWT_SECRET change
   # Users must login again
   # No fix needed, just inform users
   ```

3. **Token Expired**
   ```bash
   # Check JWT_EXPIRES_IN in .env
   # Default: 86400 (24 hours)
   # User must login again
   ```

4. **User Inactive**
   ```bash
   # Check user status
   sqlite3 ../data/roarmma.db "SELECT active FROM staff WHERE email='user@example.com';"
   
   # Activate if needed
   sqlite3 ../data/roarmma.db "UPDATE staff SET active=1 WHERE email='user@example.com';"
   ```

---

### Backup Issues

**Symptoms:**
- Backups not running
- Backup directory empty
- Backup restore fails

**Diagnosis:**
```bash
# Check backup directory
ls -lh /var/backups/roar-mma/

# Check cron jobs
crontab -l | grep maintenance

# Check maintenance script
bash scripts/maintenance.sh
```

**Solutions:**

1. **Backups Not Running**
   ```bash
   # Add cron job
   crontab -e
   # Add: 0 2 * * * cd /var/www/roar-mma/scripts && bash maintenance.sh
   
   # Or run manually
   bash scripts/maintenance.sh
   ```

2. **Backup Directory Full**
   ```bash
   # Check disk space
   df -h /var/backups
   
   # Clean old backups
   find /var/backups/roar-mma -name "*.db" -mtime +30 -delete
   ```

3. **Restore Fails**
   ```bash
   # Verify backup integrity
   sqlite3 /var/backups/roar-mma/roarmma-YYYYMMDD.db "PRAGMA integrity_check;"
   
   # If OK, restore:
   pm2 stop roar-mma
   cp /var/backups/roar-mma/roarmma-YYYYMMDD.db ../data/roarmma.db
   pm2 start roar-mma
   ```

---

### SSL/HTTPS Issues

**Symptoms:**
- Certificate expired
- "Not secure" warning
- HTTPS not working

**Diagnosis:**
```bash
# Check certificate
sudo certbot certificates

# Check Nginx config
sudo nginx -t

# Check certificate expiry
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com | openssl x509 -noout -dates
```

**Solutions:**

1. **Certificate Expired**
   ```bash
   # Renew certificate
   sudo certbot renew
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

2. **Auto-renewal Not Working**
   ```bash
   # Test renewal
   sudo certbot renew --dry-run
   
   # Check cron/systemd timer
   sudo systemctl status certbot.timer
   ```

3. **Wrong Domain**
   ```bash
   # Add new domain
   sudo certbot --nginx -d newdomain.com
   ```

---

### WebSocket Issues

**Symptoms:**
- Real-time updates not working
- "WebSocket connection failed"
- Connection drops frequently

**Diagnosis:**
```bash
# Check WebSocket in health check
curl http://localhost:3001/api/health

# Check Nginx WebSocket config
sudo cat /etc/nginx/sites-available/roar-mma | grep -A 5 "location /ws"

# Test WebSocket connection
# Use browser console or wscat
npm install -g wscat
wscat -c ws://localhost:3001
```

**Solutions:**

1. **Nginx Not Configured for WebSocket**
   ```bash
   # Add to Nginx config
   location /ws {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
   }
   
   sudo nginx -t
   sudo systemctl restart nginx
   ```

2. **Firewall Blocking**
   ```bash
   # Allow WebSocket port
   sudo ufw allow 3001/tcp
   ```

3. **Connection Timeout**
   ```bash
   # Increase timeout in Nginx
   proxy_read_timeout 3600s;
   proxy_send_timeout 3600s;
   ```

---

## Emergency Procedures

### Complete System Failure

1. **Check if server is running**
   ```bash
   pm2 status
   ```

2. **Check logs for errors**
   ```bash
   pm2 logs roar-mma --err --lines 100
   ```

3. **Restart everything**
   ```bash
   pm2 restart all
   sudo systemctl restart nginx
   ```

4. **If still failing, restore from backup**
   ```bash
   pm2 stop roar-mma
   cp /var/backups/roar-mma/roarmma-LATEST.db ../data/roarmma.db
   pm2 start roar-mma
   ```

5. **If backup fails, reinitialize**
   ```bash
   cd /var/www/roar-mma
   npm run db:init
   pm2 restart roar-mma
   # Note: This loses all data
   ```

### Data Loss Recovery

1. **Stop server immediately**
   ```bash
   pm2 stop roar-mma
   ```

2. **Don't write to database**

3. **Restore from most recent backup**
   ```bash
   ls -lt /var/backups/roar-mma/ | head -5
   cp /var/backups/roar-mma/roarmma-YYYYMMDD.db ../data/roarmma.db
   ```

4. **Verify integrity**
   ```bash
   sqlite3 ../data/roarmma.db "PRAGMA integrity_check;"
   ```

5. **Start server**
   ```bash
   pm2 start roar-mma
   npm run health
   ```

---

## Diagnostic Commands Reference

### Server Status
```bash
pm2 status                    # Process status
pm2 monit                     # Real-time monitoring
pm2 logs roar-mma            # View logs
pm2 logs roar-mma --err      # Error logs only
pm2 info roar-mma            # Detailed info
```

### System Resources
```bash
top                          # CPU/memory usage
df -h                        # Disk space
free -h                      # Memory usage
netstat -tulpn | grep 3001  # Port usage
```

### Database
```bash
npm run health               # Quick check
sqlite3 ../data/roarmma.db "PRAGMA integrity_check;"
sqlite3 ../data/roarmma.db ".tables"
sqlite3 ../data/roarmma.db "SELECT COUNT(*) FROM members;"
```

### Network
```bash
curl http://localhost:3001/api/health
curl -I https://yourdomain.com
ping yourdomain.com
traceroute yourdomain.com
```

---

## Getting Help

### 1. Collect Information
```bash
# System info
uname -a
node --version
npm --version
pm2 --version

# Application status
pm2 status
npm run health

# Recent logs
pm2 logs roar-mma --lines 100 > logs.txt

# Database info
ls -lh ../data/roarmma.db
sqlite3 ../data/roarmma.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
```

### 2. Check Documentation
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Common tasks
- [FINAL_STATUS_REPORT.md](FINAL_STATUS_REPORT.md) - System status
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API reference

### 3. Review Logs
```bash
# Application logs
pm2 logs roar-mma --lines 500

# System logs
sudo journalctl -u nginx -n 100
sudo tail -100 /var/log/syslog
```

---

## Prevention

### Daily
- Run `npm run health`
- Check PM2 status
- Review error logs

### Weekly
- Check disk space
- Review backup logs
- Check for updates

### Monthly
- Test backup restore
- Review performance metrics
- Update dependencies
- Security audit

---

**Last Updated:** 2026-05-08  
**Version:** 1.0.0
