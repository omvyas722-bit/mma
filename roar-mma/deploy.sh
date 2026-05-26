#!/bin/bash
# ROAR MMA Production Deployment Script
# Usage: sudo bash deploy.sh

set -e

APP_NAME="roar-mma"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"

echo "=========================================="
echo "  ROAR MMA Production Deployment"
echo "=========================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
    apt-get update
    apt-get install -y nginx
fi

# Setup directories
mkdir -p "$APP_DIR" "$BACKUP_DIR"

# Copy application
cp -r backend/* "$APP_DIR/"

# Install dependencies
cd "$APP_DIR"
npm install --production

# Setup environment
if [ ! -f ".env" ]; then
    cp .env.example .env
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s/your-secret-key-change-this/$JWT_SECRET/" .env
fi

# Initialize database
npm run db:init

# Configure Nginx
read -p "Enter domain name: " DOMAIN
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# Start application
pm2 stop $APP_NAME 2>/dev/null || true
pm2 start server.js --name $APP_NAME
pm2 save
pm2 startup

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "Deployment complete!"
echo "URL: http://$DOMAIN"
echo "Login: admin@roarmma.com.au / changeme123"
echo ""
