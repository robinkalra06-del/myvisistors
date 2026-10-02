# Deploying LiveTrack to Render

This comprehensive guide walks you through deploying the entire LiveTrack platform to [Render](https://render.com) using either:
1. **The Automatic Blueprint Method (`render.yaml`)** (Recommended: 1-click provisioning of Database, API & Dashboard).
2. **The Manual Step-by-Step Method** (via the Render Dashboard UI).

---

## Architecture on Render

```
                             [ User Browser / Visitor ]
                                      |
                 +--------------------+--------------------+
                 |                                         |
                 v                                         v
   +----------------------------+            +----------------------------+
   |    livetrack-dashboard     |            |       livetrack-api        |
   |   (Render Static Site)     |            |    (Render Web Service)    |
   |   React + Vite + Tailwind  |            |    Node.js + Socket.IO     |
   |   URL: *.onrender.com      |            |    URL: *.onrender.com     |
   +----------------------------+            +----------------------------+
                 |                                         |
                 | (REST API & WebSockets)                 v
                 +-------------------------->+----------------------------+
                                             |     livetrack-postgres     |
                                             | (Render Managed PostgreSQL)|
                                             +----------------------------+
```

---

## Method 1: Blueprint Deployment via `render.yaml` (Recommended)

LiveTrack includes a turnkey `render.yaml` infrastructure-as-code blueprint file in the repository root.

### Prerequisites
1. A free or paid [Render Account](https://render.com).
2. A GitHub or GitLab account with this repository pushed to your remote.

### Step 1: Push Repository to GitHub / GitLab
Make sure your LiveTrack project is pushed to a Git repository:
```bash
git init
git add .
git commit -m "Initial commit of LiveTrack platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/livetrack.git
git push -u origin main
```

### Step 2: Create Blueprint Instance on Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click the **"New +"** button in the upper right and select **"Blueprint"**.
3. Connect your Git repository (`livetrack`).
4. Render will inspect `render.yaml` and discover three resources:
   - **`livetrack-postgres`**: PostgreSQL database.
   - **`livetrack-api`**: Node.js web service running the API and Socket.IO server.
   - **`livetrack-dashboard`**: Static site hosting the React + Vite frontend dashboard.
5. Click **"Apply"**.

Render will automatically:
- Provision the PostgreSQL database.
- Auto-generate cryptographic secrets for `JWT_SECRET` and `SESSION_SECRET`.
- Run Prisma migrations (`prisma migrate deploy`) and seed default admin data (`node apps/api/prisma/seed.js`).
- Build the static dashboard and wire up `VITE_API_URL` to point to the backend web service.

---

## Method 2: Manual Step-by-Step Setup

If you prefer to configure each component manually through the Render UI, follow these steps:

### Step 1: Provision Managed PostgreSQL Database
1. In the Render Dashboard, click **New +** -> **PostgreSQL**.
2. Fill in the details:
   - **Name**: `livetrack-postgres`
   - **Database**: `livetrack`
   - **User**: `livetrack_user`
   - **Region**: Choose the region closest to you (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`).
   - **Plan**: `Free` (or standard paid plan).
3. Click **Create Database**.
4. Once created, copy the **Internal Database URL** (e.g., `postgres://livetrack_user:password@dpg-xxx:5432/livetrack`).

### Step 2: Deploy Backend API Service
1. Click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `livetrack-api`
   - **Language**: `Node`
   - **Branch**: `main`
   - **Region**: Same region as your database.
   - **Build Command**:
     ```bash
     npm install && npx prisma generate --schema=apps/api/prisma/schema.prisma
     ```
   - **Pre-Deploy Command**:
     ```bash
     npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/prisma/seed.js
     ```
   - **Start Command**:
     ```bash
     node apps/api/src/server.js
     ```
   - **Health Check Path**: `/api/health`
4. In the **Environment Variables** section, add:
   | Key | Value / Source |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `DATABASE_URL` | *Paste your Internal Database URL from Step 1* |
   | `JWT_SECRET` | *Generate a random 32-character string* |
   | `SESSION_SECRET` | *Generate a random 32-character string* |
   | `APP_URL` | `https://livetrack-dashboard.onrender.com` (update after Step 3) |
5. Click **Create Web Service**. Note your API service URL (e.g., `https://livetrack-api.onrender.com`).

### Step 3: Deploy Frontend Dashboard Static Site
1. Click **New +** -> **Static Site**.
2. Connect your Git repository.
3. Configure the static site settings:
   - **Name**: `livetrack-dashboard`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm install && npm run build --workspace=apps/dashboard
     ```
   - **Publish Directory**: `./apps/dashboard/dist`
4. In **Redirects / Rewrites**, add a rewrite rule for Single Page Application (SPA) routing:
   - **Type**: `Rewrite`
   - **Source**: `/*`
   - **Destination**: `/index.html`
5. In **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://livetrack-api.onrender.com` *(from Step 2)* |
6. Click **Create Static Site**.

---

## Post-Deployment Verification

### 1. Check API Health
Navigate in your browser to:
```
https://livetrack-api.onrender.com/api/health
```
Expected JSON response:
```json
{
  "status": "ok",
  "service": "livetrack-api",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-10-02T..."
}
```

### 2. Verify Database Seeding & Login
Open your dashboard static site URL:
```
https://livetrack-dashboard.onrender.com/login
```
Sign in with the seeded credentials:
- **Email**: `admin@livetrack.io`
- **Password**: `Password123!`

You will land on the Overview dashboard showing the pre-seeded demo website:
- **Site Name**: Demo E-Commerce Store
- **Site ID**: `site_demo_store_101`

---

## Installing `tracker.js` in Production

To track visitors on any external website, include the snippet in the `<head>` or before `</body>`:

```html
<!-- LiveTrack Analytics Script -->
<script>
  window.LiveTrackConfig = {
    siteId: "YOUR_SITE_ID", // Find this in your LiveTrack dashboard under Websites
    endpoint: "https://livetrack-api.onrender.com" // Your live Render API URL
  };
</script>
<script
  async
  src="https://livetrack-api.onrender.com/tracker.js">
</script>
```

---

## Troubleshooting & FAQ

### 1. WebSockets connection fails or falls back to long-polling
- Render natively supports WebSockets on standard ports. Ensure `livetrack-api` environment has CORS allowed for your dashboard domain (`APP_URL`).
- Socket.IO automatically attempts WebSocket transport first and falls back to HTTP long-polling if needed.

### 2. Free Tier Spin-Down Delay
- Free instances on Render spin down after 15 minutes of inactivity. The first request may take ~30-50 seconds to wake up. For zero-downtime production monitoring, upgrade the Web Service to Render's "Starter" tier ($7/mo).

### 3. Custom Domains & Free SSL
- Render provides free, automated SSL certificates for custom domains.
- In Render Dashboard under your static site and web service, navigate to **Settings** -> **Custom Domains**, add your domain (e.g., `analytics.yourcompany.com`), and configure the CNAME record at your DNS provider.
