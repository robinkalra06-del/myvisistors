# VisitorPulse Intelligence ⚡

Enterprise Real-Time Visitor Monitoring & IP Telemetry Platform. Built with zero external dependencies (native Node.js `node:http` & `node:sqlite`).

---

## ✨ Enterprise Features

- 🌐 **Deep IP Intelligence**: Real-time IP address capture with ISP (Internet Service Provider) identification, Organization name, Autonomous System Number (ASN), Geographic Coordinates (Lat/Long), Country, Region, and City.
- 🎨 **Multi-Theme Color Customizer**: Switch instantly between 4 tailored color themes:
  - 🌙 **Dark Slate** (Default modern dark)
  - ☀️ **Clean Light** (Crisp enterprise SaaS white)
  - 🌌 **OLED Pure Black** (High-contrast OLED)
  - 🌲 **Emerald Forest** (Refined dark forest)
- 🔔 **Web Audio Chimes**: Gentle synthesized arrival chime (100% offline, zero audio files required) when new visitors land. Toggle on/off with persistent preferences.
- 🟢 **Live Online Presence**: Instant sub-second presence monitoring powered by Server-Sent Events (SSE).
- 🧭 **Live Clickstream & Navigation**: Watch active URL paths and titles as visitors navigate through your pages in real time.
- ⏱️ **Live Second-by-Second Counters**: Active ticking timers showing exact duration on the current page and total session length.
- 🟡 **Active vs. Idle State Detection**: Automatically detects tab switches (`document.visibilityState`) and user inactivity.
- 🎯 **UTM Campaign Tracking**: Ingests and reports on `utm_source`, `utm_medium`, and `utm_campaign` attribution tags.
- 🔍 **Real-Time Search & Filtering**: Instantly search active visitors by IP address, ISP, Country, City, or URL pathname, with filter tabs for Active, Idle, Desktop, and Mobile.
- 📥 **CSV Export**: One-click download of all visitor telemetry and historical records to CSV (`/api/export/visitors.csv`).
- 🚪 **Unload Beacon Telemetry**: Uses `navigator.sendBeacon` to instantly capture exit events when users close tabs.
- 🚀 **SPA Routing Support**: Intercepts `history.pushState` & `popstate` for React, Next.js, Vue, Angular, and Svelte applications.
- 💾 **Embedded SQLite Persistence**: Persistent storage with WAL mode for sessions, pageviews, and IP cache without any database server setup.

---

## 🚀 Quick Start

```bash
cd ~/Documents/realtime-visitor-tracker
node server.js
```

The platform starts at:
- **Live Enterprise Dashboard**: [http://localhost:3030/](http://localhost:3030/)
- **Embeddable Tracker Script**: [http://localhost:3030/tracker.js](http://localhost:3030/tracker.js)
- **CSV Data Export**: [http://localhost:3030/api/export/visitors.csv](http://localhost:3030/api/export/visitors.csv)

---

## 📋 Embed on Any Website

Paste this tag right before the closing `</body>` tag on your website:

```html
<!-- VisitorPulse Intelligence -->
<script src="http://localhost:3030/tracker.js" data-site-id="production" async></script>
```
*(Replace `http://localhost:3030` with your deployed domain).*

### Next.js (App Router `layout.jsx` / `layout.tsx`)

```tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://myvisistors.vercel.app/tracker.js"
          data-site-id="production-web"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

---

## 🛠️ API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET /` | GET | Real-Time Dashboard UI |
| `GET /tracker.js` | GET | Ultra-lightweight (~2KB) client script |
| `GET /api/stream` | GET | Server-Sent Events (SSE) live connection |
| `POST /api/track` | POST | Ingests pageviews, UTM tags, and navigation |
| `POST /api/heartbeat` | POST | 5-second presence heartbeat (active/idle) |
| `POST /api/leave` | POST | Tab close unload beacon |
| `GET /api/stats` | GET | Real-time counters, active pages, countries, ISPs |
| `GET /api/visitor/:id/history` | GET | Complete clickstream timeline and IP intelligence |
| `GET /api/export/visitors.csv` | GET | Download all visitor records as CSV |
