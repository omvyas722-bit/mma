#!/bin/bash
# ROAR MMA Production Deployment Script
# Usage: sudo bash deploy.sh

set -eu

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
    # WARNING: curl-to-bash is a security risk. Verify checksum at https://github.com/nodesource/distributions
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
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

# Copy application (using /. to include dotfiles like .env.example)
cp -r backend/. "$APP_DIR/"
cp -r frontend/. "$APP_DIR/frontend/"

# Install dependencies
cd "$APP_DIR"
npm install --production

# Setup environment
if [ ! -f ".env" ]; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    if [ -f ".env.example" ]; then
        cp .env.example .env
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
        echo "Warning: .env.example not found. Creating minimal .env."
        cat > ".env" << EOF
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
EOF
    fi
fi

# Initialize database
if grep -q '"db:init"' package.json 2>/dev/null; then
    npm run db:init
else
    echo "⚠ db:init script not found in package.json, skipping database initialization"
fi

# Configure Nginx
while [ -z "${DOMAIN:-}" ]; do
    read -p "Enter domain name: " DOMAIN
    DOMAIN=$(echo "$DOMAIN" | sed 's/[^a-zA-Z0-9.-]//g' | xargs)
    if [ -z "$DOMAIN" ]; then
        echo "Error: Domain name cannot be empty."
    fi
done
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
pm2 restart "$APP_NAME" 2>/dev/null || pm2 start server.js --name "$APP_NAME"
pm2 save
# NOTE: pm2 startup requires an interactive shell for systemd integration.
# In automated/non-interactive environments, run manually after deploy:
#   pm2 startup systemd -u "$USER" --hp "/home/$USER"
# Then copy/paste the generated command.
pm2 startup 2>/dev/null || echo "⚠ pm2 startup failed (non-interactive). Run 'pm2 startup' manually after deployment."

# Setup firewall
if command -v ufw &>/dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Verify firewall rules exist and status is active
    if ufw status verbose | grep -q "^Status: active"; then
        echo "✓ UFW is active and rules are applied"
    elif ufw status | grep -q "^22/tcp.*ALLOW"; then
        ufw --force enable
        echo "✓ UFW enabled with SSH access preserved"
    else
        echo "⚠ SSH port 22 rule not found in UFW. Firewall will not be enabled automatically."
        echo "  Verify rules with: ufw status"
        echo "  Then enable with: ufw --force enable"
    fi
else
    echo "⚠ UFW not installed. Skipping firewall configuration."
    echo "  Install with: apt-get install -y ufw"
fi

echo ""
echo "Deployment complete!"
echo "URL: http://$DOMAIN"

echo ""
