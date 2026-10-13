# PulseMeet Production Deployment & Architecture Guide

This guide details how to deploy **PulseMeet** to live production servers, configure custom domains with SSL/HTTPS, manage database backups, and scale real-time media infrastructure.

---

## 1. System Architecture

```
                  [ Clients / Web Browsers ]
                             │
                  HTTPS / WSS (Port 443)
                             ▼
               ┌───────────────────────────┐
               │  Reverse Proxy (Nginx)    │
               │  SSL / Let's Encrypt      │
               └─────────────┬─────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌───────────────────────┐   ┌──────────────────────────┐
   │ PulseMeet Frontend    │   │ PulseMeet Backend API    │
   │ (React + Vite + Nginx)│   │ (Node.js + Express)      │
   │ Port: 80              │   │ Port: 5001               │
   └───────────────────────┘   └─────────────┬────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       ▼                     ▼                     ▼
             ┌─────────────────┐   ┌───────────────────┐   ┌──────────────┐
             │ MySQL Database  │   │ LiveKit SFU Media │   │ File Storage │
             │ (meet_db)       │   │ Server (WebRTC)   │   │ (Uploads/S3) │
             │ Port: 3306      │   │ Port: 7880 / 7882 │   │              │
             └─────────────────┘   └───────────────────┘   └──────────────┘
```

---

## 2. Docker Compose Production Deployment

### Prerequisites
- A Linux or macOS cloud server (Ubuntu 22.04 LTS / Debian 12 / macOS)
- Docker & Docker Compose installed
- A registered custom domain (e.g., `meet.yourcompany.com`) pointed to your server IP

### Step 1: Clone or Copy Repository
```bash
git clone <your-repo-url> /opt/pulsemeet
cd /opt/pulsemeet
```

### Step 2: Configure Production Environment Variables
Copy `.env.example` to `.env` and set strong production secrets:
```bash
cp .env.example .env
nano .env
```
Ensure you change:
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
- `DATABASE_URL`
- `CLIENT_URL` (e.g. `https://meet.yourcompany.com`)
- `LIVEKIT_API_KEY` & `LIVEKIT_API_SECRET`

### Step 3: Run with Docker Compose
```bash
docker compose up -d --build
```

### Step 4: Run Prisma Database Migrations
```bash
docker compose exec backend npx prisma db push
docker compose exec backend npx tsx prisma/seed.ts
```

Check status:
```bash
docker compose ps
docker compose logs -f backend
```

---

## 3. Reverse Proxy & SSL (HTTPS/WSS) Configuration

Browsers mandate HTTPS for accessing camera and microphone (`navigator.mediaDevices.getUserMedia`). Below are two recommended setups:

### Option A: Nginx + Certbot (Let's Encrypt)

Install Nginx and Certbot:
```bash
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx -y
```

Create `/etc/nginx/sites-available/pulsemeet`:
```nginx
server {
    server_name meet.yourdomain.com;

    # Frontend Assets
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebRTC Signaling & Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Cloud Recordings
    location /uploads/ {
        proxy_pass http://127.0.0.1:5001/uploads/;
        client_max_body_size 250M;
    }
}
```

Enable the configuration and obtain SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/pulsemeet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d meet.yourdomain.com
```

---

## 4. Custom Domain Setup (DNS)

In your DNS provider (Cloudflare, Namecheap, Route53, GoDaddy):

| Record Type | Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `meet` | `YOUR_SERVER_PUBLIC_IP` | Auto (or 300) |
| **CNAME** | `www.meet` | `meet.yourdomain.com` | Auto |

---

## 5. Media Server (LiveKit SFU) Infrastructure

For meetings with 10+ simultaneous participants:
1. The included `docker-compose.yml` runs LiveKit on port `7880` (HTTP/WebSocket) and `7882/udp` (RTC media).
2. Ensure firewall ports are open on your cloud provider security groups:
   - `7880/tcp`: Signaling & API
   - `7881/tcp`: WebRTC TCP fallback
   - `7882/udp`: WebRTC UDP media traffic (mandatory for audio/video)

To use LiveKit Cloud instead of self-hosting, replace `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in your `.env` with your LiveKit Cloud credentials.

---

## 6. Database Backup & Restore

### Automated Nightly Backup Script
Save as `/opt/pulsemeet/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/pulsemeet/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

# Dump database from container
docker compose exec -T db mysqldump -u pulsemeet -psecurepassword123 meet_db > $BACKUP_DIR/pulsemeet_$TIMESTAMP.sql

# Retain backups for 14 days
find $BACKUP_DIR -type f -name "*.sql" -mtime +14 -exec rm {} \;

echo "Backup completed: pulsemeet_$TIMESTAMP.sql"
```

Make executable and add to crontab:
```bash
chmod +x /opt/pulsemeet/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/pulsemeet/backup.sh") | crontab -
```

### Database Restore Command
```bash
docker compose exec -T db mysql -u pulsemeet -psecurepassword123 meet_db < /opt/pulsemeet/backups/pulsemeet_backup.sql
```

---

## 7. Security Hardening Checklist

- [x] All cookies set with `HttpOnly` and `SameSite=Strict`.
- [x] Passwords hashed with `bcryptjs` (salt rounds: 10).
- [x] Rate limiting enabled on sensitive authentication endpoints.
- [x] Input validation with Zod and sanitization.
- [x] Administrative endpoints protected with server-side role validation (`UserRole.ADMIN`).
- [x] Media file uploads capped at 250MB with disk storage isolation.
- [x] Meeting passcodes verified on the backend, never leaked to public endpoints.
- [x] Comprehensive administrative audit logs stored in the database.
