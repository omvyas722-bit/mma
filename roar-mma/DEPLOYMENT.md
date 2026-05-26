# Production Deployment Guide

## Prerequisites

- Ubuntu 20.04+ or similar Linux server
- Node.js 18+ installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- Minimum 2GB RAM, 20GB storage

## Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx for reverse proxy
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

## Step 2: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/roar-mma
sudo chown $USER:$USER /var/www/roar-mma

# Clone or upload code
cd /var/www/roar-mma
# Upload your code here

# Install dependencies
cd backend
npm install --production

# Create data directory
mkdir -p ../data
chmod 755 ../data
```

## Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required changes:**
- `NODE_ENV=production`
- `JWT_SECRET=` (generate with: `openssl rand -base64 32`)
- `CORS_ORIGIN=https://yourdomain.com`
- Add Twilio credentials
- Add Brevo API key
- Update gym information

## Step 4: Initialize Database

```bash
# Run database initialization
npm run db:init

# Verify database created
ls -la ../data/roarmma.db

# Set proper permissions
chmod 644 ../data/roarmma.db
```

## Step 5: Configure PM2

```bash
# Start application with PM2
pm2 start server.js --name roar-mma

# Configure PM2 to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs roar-mma
```

## Step 6: Configure Nginx

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/roar-mma
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name api.roarmma.com.au;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/roar-mma /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 7: Configure SSL

```bash
# Get SSL certificate
sudo certbot --nginx -d api.roarmma.com.au

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 8: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Check status
sudo ufw status
```

## Step 9: Enable Messaging

```bash
# Update provider settings in database
sqlite3 /var/www/roar-mma/data/roarmma.db

UPDATE messaging_provider_settings 
SET setting_value = 'YOUR_TWILIO_ACCOUNT_SID' 
WHERE provider = 'twilio' AND setting_key = 'account_sid';

UPDATE messaging_provider_settings 
SET setting_value = 'YOUR_TWILIO_AUTH_TOKEN' 
WHERE provider = 'twilio' AND setting_key = 'auth_token';

UPDATE messaging_provider_settings 
SET setting_value = 'true' 
WHERE provider = 'twilio' AND setting_key = 'enabled';

UPDATE messaging_provider_settings 
SET setting_value = 'YOUR_BREVO_API_KEY' 
WHERE provider = 'brevo' AND setting_key = 'api_key';

UPDATE messaging_provider_settings 
SET setting_value = 'true' 
WHERE provider = 'brevo' AND setting_key = 'enabled';

.exit
```

```bash
# Uncomment provider code
nano backend/services/messagingProviders.js
# Uncomment the Twilio and Brevo sections

# Restart application
pm2 restart roar-mma
```

## Step 10: Configure Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-roar-mma.sh
```

**Backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/roar-mma"
DB_PATH="/var/www/roar-mma/data/roarmma.db"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/roarmma-$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "roarmma-*.db" -mtime +30 -delete

echo "Backup completed: roarmma-$DATE.db"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-roar-mma.sh

# Add to crontab (daily at 2am)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-roar-mma.sh
```

## Step 11: Configure Monitoring

```bash
# Install monitoring tools
sudo npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Set up health check monitoring
pm2 install pm2-server-monit
```

## Step 12: Test Deployment

```bash
# Check application is running
curl http://localhost:3001/api/health

# Check through nginx
curl https://api.roarmma.com.au/api/health

# Test WebSocket
wscat -c wss://api.roarmma.com.au

# Check logs
pm2 logs roar-mma --lines 50

# Monitor resources
pm2 monit
```

## Step 13: Change Default Password

```bash
# Login via API
curl -X POST https://api.roarmma.com.au/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@roarmma.com.au","password":"changeme123"}'

# Use returned token to change password
# (Implement password change endpoint or update directly in database)
```

## Maintenance Commands

```bash
# View logs
pm2 logs roar-mma

# Restart application
pm2 restart roar-mma

# Stop application
pm2 stop roar-mma

# View status
pm2 status

# Monitor resources
pm2 monit

# Manual backup
/usr/local/bin/backup-roar-mma.sh

# Check disk space
df -h

# Check database size
ls -lh /var/www/roar-mma/data/roarmma.db
```

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs roar-mma --err

# Check environment
cat /var/www/roar-mma/backend/.env

# Check database permissions
ls -la /var/www/roar-mma/data/roarmma.db

# Restart
pm2 restart roar-mma
```

### Database errors

```bash
# Check database integrity
sqlite3 /var/www/roar-mma/data/roarmma.db "PRAGMA integrity_check;"

# Restore from backup
cp /var/backups/roar-mma/roarmma-YYYYMMDD-HHMMSS.db /var/www/roar-mma/data/roarmma.db
pm2 restart roar-mma
```

### High memory usage

```bash
# Check memory
free -h

# Restart application
pm2 restart roar-mma

# Check for memory leaks
pm2 monit
```

### Messages not sending

```bash
# Check provider settings
sqlite3 /var/www/roar-mma/data/roarmma.db "SELECT * FROM messaging_provider_settings;"

# Check logs for errors
pm2 logs roar-mma | grep -i "sms\|email"

# Test manually
curl -X POST https://api.roarmma.com.au/api/messaging/test/sms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0412345678","message":"Test"}'
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Generated strong JWT_SECRET
- [ ] Configured firewall (ufw)
- [ ] Enabled SSL/HTTPS
- [ ] Set proper file permissions (644 for db, 755 for directories)
- [ ] Configured automated backups
- [ ] Set up log rotation
- [ ] Enabled monitoring
- [ ] Restricted CORS to production domain
- [ ] Reviewed nginx security headers
- [ ] Set up fail2ban (optional)
- [ ] Configured rate limiting (optional)

## Performance Optimization

```bash
# Enable nginx gzip compression
sudo nano /etc/nginx/nginx.conf
# Add in http block:
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;

# Restart nginx
sudo systemctl restart nginx

# Configure PM2 cluster mode (if needed)
pm2 delete roar-mma
pm2 start server.js -i max --name roar-mma
pm2 save
```

## Scaling Considerations

For high traffic:
1. Use PM2 cluster mode (multiple instances)
2. Add Redis for session storage
3. Use PostgreSQL instead of SQLite
4. Set up load balancer
5. Separate database server
6. Add CDN for static assets
7. Implement API rate limiting

## Support

For deployment issues:
1. Check logs: `pm2 logs roar-mma`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -u nginx`
4. Review documentation in API_DOCUMENTATION.md

---

**Deployment Status:** Ready for production

**Estimated Setup Time:** 1-2 hours

**Recommended Server:** 2GB RAM, 2 CPU cores, 20GB storage minimum
