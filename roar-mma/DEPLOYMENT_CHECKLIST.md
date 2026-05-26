# Production Deployment Checklist

## Pre-Deployment (Complete Before Going Live)

### 1. Security Configuration
- [ ] Change default admin password
  ```bash
  # Login and change via API or create new admin user
  curl -X POST http://localhost:3001/api/auth/change-password \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"old_password":"changeme123","new_password":"YOUR_SECURE_PASSWORD"}'
  ```

- [ ] Generate strong JWT_SECRET (32+ characters)
  ```bash
  # Generate random secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  # Add to .env: JWT_SECRET=<generated_value>
  ```

- [ ] Configure CORS for production domain
  ```javascript
  // In server.js, update CORS settings:
  app.use(cors({
    origin: 'https://yourdomain.com',
    credentials: true
  }));
  ```

- [ ] Review and restrict API permissions
  - Verify role-based access controls
  - Test with non-admin users
  - Ensure sensitive endpoints require authentication

### 2. Environment Configuration
- [ ] Copy and configure .env file
  ```bash
  cp .env.example .env
  nano .env
  ```

- [ ] Set production values:
  ```env
  NODE_ENV=production
  PORT=3001
  JWT_SECRET=<your_secure_secret>
  JWT_EXPIRES_IN=86400
  
  # Twilio (SMS)
  TWILIO_ACCOUNT_SID=<your_sid>
  TWILIO_AUTH_TOKEN=<your_token>
  TWILIO_FROM_NUMBER=<your_number>
  
  # Brevo (Email)
  BREVO_API_KEY=<your_key>
  BREVO_FROM_EMAIL=noreply@roarmma.com.au
  BREVO_FROM_NAME=ROAR MMA
  
  # Database
  DB_PATH=../data/roarmma.db
  
  # Server
  CORS_ORIGIN=https://yourdomain.com
  ```

- [ ] Uncomment provider code in `services/messagingProviders.js`
  - Remove mock implementations
  - Enable real Twilio/Brevo calls

### 3. Database Setup
- [ ] Initialize production database
  ```bash
  npm run db:init
  ```

- [ ] Verify database integrity
  ```bash
  npm run health
  ```

- [ ] Import existing data (if applicable)
  - Export from old system
  - Transform to match schema
  - Import via API or direct SQL

- [ ] Create initial admin user (if not using default)
  ```sql
  INSERT INTO staff (name, email, password_hash, role, active)
  VALUES ('Your Name', 'your@email.com', '<bcrypt_hash>', 'owner', 1);
  ```

### 4. Server Configuration
- [ ] Install Node.js 18+ on production server
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- [ ] Install PM2 for process management
  ```bash
  sudo npm install -g pm2
  ```

- [ ] Install dependencies
  ```bash
  cd backend
  npm install --production
  ```

- [ ] Configure PM2 ecosystem
  ```bash
  pm2 ecosystem
  # Edit ecosystem.config.js with production settings
  ```

### 5. Reverse Proxy (Nginx)
- [ ] Install Nginx
  ```bash
  sudo apt-get update
  sudo apt-get install nginx
  ```

- [ ] Configure Nginx
  ```nginx
  # /etc/nginx/sites-available/roarmma
  server {
      listen 80;
      server_name yourdomain.com;
      
      location / {
          proxy_pass http://localhost:3001;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      }
      
      # WebSocket support
      location /ws {
          proxy_pass http://localhost:3001;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "Upgrade";
          proxy_set_header Host $host;
      }
  }
  ```

- [ ] Enable site
  ```bash
  sudo ln -s /etc/nginx/sites-available/roarmma /etc/nginx/sites-enabled/
  sudo nginx -t
  sudo systemctl restart nginx
  ```

### 6. SSL/HTTPS Setup
- [ ] Install Certbot
  ```bash
  sudo apt-get install certbot python3-certbot-nginx
  ```

- [ ] Obtain SSL certificate
  ```bash
  sudo certbot --nginx -d yourdomain.com
  ```

- [ ] Verify auto-renewal
  ```bash
  sudo certbot renew --dry-run
  ```

### 7. Firewall Configuration
- [ ] Configure UFW (Ubuntu)
  ```bash
  sudo ufw allow 22/tcp      # SSH
  sudo ufw allow 80/tcp      # HTTP
  sudo ufw allow 443/tcp     # HTTPS
  sudo ufw enable
  ```

- [ ] Verify firewall rules
  ```bash
  sudo ufw status
  ```

### 8. Automated Backups
- [ ] Create backup directory
  ```bash
  sudo mkdir -p /var/backups/roar-mma
  sudo chown $USER:$USER /var/backups/roar-mma
  ```

- [ ] Schedule daily backups (cron)
  ```bash
  crontab -e
  # Add line:
  0 2 * * * cd /path/to/backend/scripts && bash maintenance.sh
  ```

- [ ] Test backup script
  ```bash
  bash scripts/maintenance.sh
  ```

- [ ] Configure off-site backup (optional)
  - AWS S3
  - Google Cloud Storage
  - Backblaze B2

### 9. Monitoring Setup
- [ ] Install monitoring tools
  ```bash
  # PM2 monitoring
  pm2 install pm2-logrotate
  
  # Optional: Install monitoring service
  # - New Relic
  # - DataDog
  # - Sentry
  ```

- [ ] Configure log rotation
  ```bash
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  ```

- [ ] Set up health check monitoring
  - Use UptimeRobot, Pingdom, or similar
  - Monitor: https://yourdomain.com/api/health
  - Alert on downtime

### 10. Testing
- [ ] Run health check
  ```bash
  npm run health
  ```

- [ ] Run full system verification
  ```bash
  npm run verify
  ```

- [ ] Test API workflows
  ```bash
  npm run examples
  ```

- [ ] Test from external network
  ```bash
  curl https://yourdomain.com/api/health
  ```

- [ ] Test WebSocket connection
  - Use browser console or WebSocket client
  - Connect to wss://yourdomain.com

- [ ] Test SMS sending (with real credentials)
  ```bash
  curl -X POST https://yourdomain.com/api/messaging/test/sms \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"phone":"+61412345678","message":"Test message"}'
  ```

- [ ] Test email sending (with real credentials)
  ```bash
  curl -X POST https://yourdomain.com/api/messaging/test/email \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"email":"test@example.com","subject":"Test","body":"Test message"}'
  ```

---

## Deployment Day

### 1. Final Preparations
- [ ] Announce maintenance window to users
- [ ] Backup current system (if replacing existing)
- [ ] Verify all credentials are correct
- [ ] Test rollback procedure

### 2. Deploy Application
```bash
# On production server
cd /var/www/roar-mma/backend

# Pull latest code (if using git)
git pull origin main

# Install dependencies
npm install --production

# Initialize database
npm run db:init

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### 3. Verify Deployment
- [ ] Check server status
  ```bash
  pm2 status
  pm2 logs roar-mma --lines 50
  ```

- [ ] Run health check
  ```bash
  curl https://yourdomain.com/api/health
  ```

- [ ] Test login
  ```bash
  curl -X POST https://yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@roarmma.com.au","password":"YOUR_NEW_PASSWORD"}'
  ```

- [ ] Verify automated services are running
  - Check logs for service startup messages
  - Verify message scheduler is processing

### 4. Post-Deployment
- [ ] Monitor logs for errors
  ```bash
  pm2 logs roar-mma
  ```

- [ ] Test key workflows manually
  - Create a lead
  - Book a trial
  - Record a PT session
  - Check analytics

- [ ] Verify automated messages are sending
  - Create test lead
  - Wait for 2-minute auto-response
  - Check message delivery logs

- [ ] Update DNS (if needed)
  - Point domain to new server
  - Wait for propagation (up to 48 hours)

- [ ] Notify users system is live
- [ ] Schedule follow-up check in 24 hours

---

## Post-Deployment Monitoring (First Week)

### Daily Checks
- [ ] Check server health
  ```bash
  curl https://yourdomain.com/api/health
  ```

- [ ] Review error logs
  ```bash
  pm2 logs roar-mma --err --lines 100
  ```

- [ ] Verify backups are running
  ```bash
  ls -lh /var/backups/roar-mma/
  ```

- [ ] Check disk space
  ```bash
  df -h
  ```

- [ ] Monitor response times
  - Use monitoring service dashboard
  - Check for slow endpoints

### Weekly Checks
- [ ] Review analytics
  - Lead conversion rates
  - PT session bookings
  - Revenue trends

- [ ] Check message delivery rates
  - SMS delivery success rate
  - Email bounce rates
  - Unsubscribe rates

- [ ] Review staff performance metrics
  - Response times
  - Task completion rates
  - Conversion rates

- [ ] Test backup restoration
  - Restore to test environment
  - Verify data integrity

---

## Rollback Procedure (If Needed)

### Quick Rollback
```bash
# Stop current version
pm2 stop roar-mma

# Restore database backup
cp /var/backups/roar-mma/roarmma-YYYYMMDD.db /var/www/roar-mma/data/roarmma.db

# Revert code (if using git)
git checkout previous-version

# Restart
pm2 start roar-mma
```

### Full Rollback
1. Stop new system
2. Restore old system from backup
3. Update DNS if changed
4. Notify users
5. Investigate issues before retry

---

## Troubleshooting Common Issues

### Server Won't Start
```bash
# Check logs
pm2 logs roar-mma --err

# Common issues:
# - Port already in use: Change PORT in .env
# - Database missing: Run npm run db:init
# - Missing dependencies: Run npm install
```

### SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### High Memory Usage
```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 restart roar-mma
```

### Database Locked
```bash
# Check for long-running queries
# Restart server if needed
pm2 restart roar-mma
```

---

## Success Criteria

Deployment is successful when:
- [ ] Server responds to health checks
- [ ] Users can login successfully
- [ ] All API endpoints return expected responses
- [ ] Automated services are running
- [ ] Messages are sending successfully
- [ ] Backups are running automatically
- [ ] Monitoring is active and alerting
- [ ] No critical errors in logs
- [ ] Response times are acceptable (<100ms average)
- [ ] SSL certificate is valid

---

## Support Contacts

**Technical Issues:**
- Server logs: `pm2 logs roar-mma`
- Health check: https://yourdomain.com/api/health
- Documentation: See QUICK_REFERENCE.md

**Service Providers:**
- Twilio Support: https://support.twilio.com
- Brevo Support: https://help.brevo.com
- Hosting Provider: [Your provider's support]

---

**Last Updated:** 2026-05-06  
**Version:** 1.0.0  
**Status:** Ready for deployment
