#!/bin/bash
# ==============================================================================
# PulseMeet Automated VPS Deployment Script (Ubuntu / Debian / CentOS)
# ==============================================================================

set -e

echo "=========================================================="
echo "      🚀 PulseMeet Automated VPS Deployment Script        "
echo "=========================================================="

# 1. Check Root or Sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo or as root."
  exit 1
fi

# 2. Collect Domain and Email for SSL
read -p "Enter your custom domain (e.g. meet.yourdomain.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
  echo "❌ Domain name is required."
  exit 1
fi

read -p "Enter your email address (for Let's Encrypt SSL renewal alerts): " SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
  SSL_EMAIL="admin@$DOMAIN_NAME"
fi

# 3. Install Docker & Docker Compose if missing
echo "📦 Checking Docker installation..."
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  systemctl enable --now docker
  rm -f get-docker.sh
fi

if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose plugin..."
  apt-get update && apt-get install -y docker-compose-plugin || yum install -y docker-compose-plugin
fi

# 4. Generate Production Secrets
JWT_ACCESS=$(openssl rand -hex 32)
JWT_REFRESH=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
LIVEKIT_SECRET=$(openssl rand -hex 24)

# 5. Create Production .env
echo "⚙️ Configuring production environment variables..."
cat <<EOF > .env
NODE_ENV=production
PORT=5001
CLIENT_URL=https://$DOMAIN_NAME
DATABASE_URL="mysql://pulsemeet:$DB_PASSWORD@db:3306/meet_db"

JWT_ACCESS_SECRET="$JWT_ACCESS"
JWT_REFRESH_SECRET="$JWT_REFRESH"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"

LIVEKIT_API_KEY="pulsemeet_prod"
LIVEKIT_API_SECRET="$LIVEKIT_SECRET"
LIVEKIT_URL="wss://$DOMAIN_NAME/livekit"

UPLOAD_DIR="uploads"
MAX_FILE_SIZE_MB=250
EOF

# 6. Update docker-compose with the generated DB password
sed -i "s/MYSQL_PASSWORD: .*/MYSQL_PASSWORD: $DB_PASSWORD/" docker-compose.yml 2>/dev/null || true
sed -i "s/DATABASE_URL: .*/DATABASE_URL: \"mysql:\/\/pulsemeet:$DB_PASSWORD@db:3306\/meet_db\"/" docker-compose.yml 2>/dev/null || true

# 7. Build and Start Docker Containers
echo "🐳 Building and spinning up containers..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 8. Wait for Database container to be healthy
echo "⏳ Waiting for MySQL database to initialize..."
sleep 12

# 9. Sync Prisma Schema & Seed Admin Data
echo "🌱 Syncing database schema and seeding initial data..."
docker compose exec -T backend npx prisma db push
docker compose exec -T backend npx tsx prisma/seed.ts

# 10. Install and Configure Nginx & Certbot SSL
echo "🔒 Setting up Nginx reverse proxy & Let's Encrypt SSL..."
apt-get update && apt-get install -y nginx certbot python3-certbot-nginx || true

cat <<EOF > /etc/nginx/sites-available/pulsemeet
server {
    listen 80;
    server_name $DOMAIN_NAME;

    client_max_body_size 250M;

    # Frontend Static App
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSockets / WebRTC Signaling
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Uploaded Recordings
    location /uploads/ {
        proxy_pass http://127.0.0.1:5001/uploads/;
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/pulsemeet /etc/nginx/sites-enabled/pulsemeet
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl reload nginx

# Request Let's Encrypt SSL
echo "📜 Requesting SSL Certificate from Let's Encrypt..."
certbot --nginx --non-interactive --agree-tos --email "$SSL_EMAIL" -d "$DOMAIN_NAME" || {
  echo "⚠️ Note: Certbot automated certificate skipped. Ensure DNS A record for $DOMAIN_NAME points to this VPS IP and run: certbot --nginx -d $DOMAIN_NAME"
}

echo ""
echo "=========================================================="
echo "🎉 PulseMeet successfully deployed to your VPS!"
echo "👉 Web Application:  https://$DOMAIN_NAME"
echo "👉 Admin Dashboard:  https://$DOMAIN_NAME/admin"
echo "👉 Admin Email:      admin@pulsemeet.io"
echo "👉 Admin Password:   Admin123!"
echo "=========================================================="
