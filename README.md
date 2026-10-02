# LiveTrack ⚡ Real-Time Website Visitor Analytics & Monitoring Platform

> A production-ready, privacy-friendly, real-time website visitor monitoring and traffic analytics platform inspired by Tawk.to and Plausible. Built with **Node.js, Express, Socket.IO, PostgreSQL (Prisma ORM), React (Vite), and Tailwind CSS**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Render Deploy](https://img.shields.io/badge/Deploy%20to-Render-46E3B7.svg)](docs/RENDER_DEPLOYMENT.md)

---

## 🌟 Key Features

- 🟢 **Sub-Second Live Visitor Tracking**: Watch visitors land, navigate pages, become idle, and exit in real time with WebSocket updates.
- ⏱️ **Ticking Session Durations**: Live counters that increment per second for every active tab without page refreshes.
- 🗺️ **Geographic & Device Intelligence**: Country, city, browser, operating system, and device breakdown (desktop, mobile, tablet).
- 📜 **Chronological Activity Timeline**: Interactive drawer for every visitor showing their entire journey from landing to exit.
- 🌐 **Multi-Website Management**: Manage multiple websites, regenerate tracking keys, verify snippet installation, and configure allowed domains.
- 📦 **Ultra-Lightweight Tracking Script (`tracker.js`)**: ~3.5 KB zero-dependency script with Single Page Application (SPA) history support, 20s heartbeat, and exit beaconing (`navigator.sendBeacon`).
- 🎯 **Custom Event Tracking API**: Track conversions, button clicks, and signups with `LiveTrack.track('event_name', {...})`.
- 📊 **Deep Historical Analytics**: KPI stat cards, time-series traffic charts (hourly, daily, weekly), top pages, acquisition channels, and CSV export.
- 🛡️ **Privacy by Design**: Masked IPs, Do Not Track (DNT) compliance, zero sensitive input collection, zero invasive fingerprinting.
- 🚀 **Dual-Engine Database Architecture**: Runs locally out-of-the-box using Node 22's built-in `node:sqlite` (0 external dependencies required), and scales seamlessly to PostgreSQL on Render using Prisma.
- 🚢 **1-Click Render Deployment**: Ready with `render.yaml` Blueprint provisioning PostgreSQL, the API Web Service, and the Static Site Dashboard.

---

## 🏗️ Project Structure

```
livetrack/
├── apps/
│   ├── api/                     # Backend Web Service (Node.js + Express + Socket.IO)
│   │   ├── prisma/              # Prisma schema & migrations for PostgreSQL
│   │   │   ├── schema.prisma    # Complete 15-model database schema
│   │   │   └── seed.js          # Database seed script
│   │   ├── public/              # Static tracking assets
│   │   │   ├── tracker.js       # Client tracking snippet (~3.5 KB)
│   │   │   └── test-site.html   # Sample monitored webpage for instant testing
│   │   └── src/
│   │       ├── config/          # Dual-engine database adapter (SQLite / Postgres)
│   │       ├── controllers/     # Route controllers
│   │       ├── middleware/      # Auth, rate-limiting, and validation
│   │       ├── routes/          # Express API routes
│   │       ├── services/        # Business logic & analytics aggregators
│   │       ├── sockets/         # Socket.IO server & visitor presence state machine
│   │       └── server.js        # Server entry point
│   └── dashboard/               # Frontend React Application (Vite + Tailwind CSS)
│       ├── src/
│       │   ├── components/      # UI, layout, visitor tables & charts
│       │   ├── context/         # Auth, website & theme state providers
│       │   ├── pages/           # Dashboard views (Overview, Live, Analytics, etc.)
│       │   ├── services/        # API client & WebSocket client
│       │   └── App.jsx
│       └── vite.config.js
├── packages/
│   └── shared/                  # Monorepo shared constants, types & utility helpers
├── scripts/
│   ├── dev.js                   # Local zero-dependency dev runner
│   ├── seed-database.js         # Interactive database seeder
│   └── simulate-traffic.js      # Multi-country realistic traffic simulator
├── tests/
│   └── integration.test.js      # End-to-end integration test suite
├── docs/                        # Complete technical documentation
│   ├── ARCHITECTURE.md          # System architecture & presence lifecycle
│   ├── API_REFERENCE.md         # REST API documentation
│   ├── TRACKER_INTEGRATION.md   # Client integration guide for HTML/SPA/CMS
│   ├── WEBSOCKET_EVENTS.md      # WebSocket event specification
│   └── RENDER_DEPLOYMENT.md     # Production deployment to Render
├── docker-compose.yml           # Local multi-container Docker stack
├── render.yaml                  # Infrastructure-as-code blueprint for Render
└── package.json                 # Monorepo root workspace configuration
```

---

## ⚡ Quickstart (Run Locally in 60 Seconds)

### Prerequisites
- Node.js version 20.0 or higher.
- `npm` installed.

### 1. Navigate to Project & Seed Database
```bash
# Navigate to your workspace directory
cd ~/Desktop/livetrack

# Seed the database with the master admin and demo store
node apps/api/prisma/seed.js
```

### 2. Start the Backend API
```bash
# Starts the API & Socket.IO server on http://localhost:4000
npm run dev
```

### 3. Start the Frontend Dashboard
In a separate terminal window:
```bash
npm run dev:dashboard
```
Open **`http://localhost:5173`** in your browser.

### 4. Default Login Credentials
- **Email**: `admin@livetrack.io`
- **Password**: `Password123!`

---

## 🤖 Real-Time Traffic Simulator

Want to see live visitors flooding your dashboard immediately? Run the included traffic simulator:

```bash
npm run simulate
```

This simulator simulates concurrent visitors from the United States, Germany, Japan, United Kingdom, and Canada navigating pages, triggering custom cart events, entering idle states, and exiting sessions in real time.

You will see:
- Live count badges updating in real time.
- Ticking session duration timers.
- Live activity stream cards appearing instantly.

---

## 🧪 Running Automated Tests

LiveTrack includes an end-to-end integration test suite that tests database initialization, user registration, website isolation, tracking beacon ingestion, and asset serving:

```bash
npm test
```

Expected output:
```
✔ 1. Database Initialization & Models Available
✔ 2. User Registration, Password Hashing & Login Flow
✔ 3. Website Creation, Tracking Key & Isolation
✔ 4. Tracking Script Ingestion & Visitor Session Lifecycle
✔ 5. Admin & Notification Services
✔ 6. Static Tracker.js & Test Site File Assets
ℹ pass 6
ℹ fail 0
```

---

## 🚀 Deploying to Render

Deploying to Render takes under 3 minutes using the included `render.yaml` blueprint:

1. Push this repository to your GitHub or GitLab account.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Select your repository.
4. Render will automatically provision:
   - Managed **PostgreSQL** (`livetrack-postgres`)
   - Backend **Web Service** (`livetrack-api`)
   - Frontend **Static Site** (`livetrack-dashboard`)
5. Click **Apply**.

For complete step-by-step instructions including custom domains and environment variables, read the [Render Deployment Guide](docs/RENDER_DEPLOYMENT.md).

---

## 📖 Documentation Index

- [System Architecture](docs/ARCHITECTURE.md)
- [REST API Reference](docs/API_REFERENCE.md)
- [Client Tracker Integration Guide](docs/TRACKER_INTEGRATION.md)
- [Real-Time WebSocket Events](docs/WEBSOCKET_EVENTS.md)
- [Render Deployment Guide](docs/RENDER_DEPLOYMENT.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
