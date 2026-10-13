# PulseMeet — Enterprise Real-Time Video Conferencing Platform

> **Video Meetings Made Simple, Secure & Seamless.**  
> A production-ready, Google Meet & Zoom–inspired video conferencing platform built with React, TypeScript, Node.js, Express, Socket.IO, WebRTC, Tailwind CSS, and Prisma ORM on MySQL (XAMPP-compatible).

---

## 🌟 Highlights & Capabilities

- **Instant & Scheduled Meetings**: Start a meeting in one click or schedule with timezones, durations, passcodes, and invitation links.
- **WebRTC High-Definition Video & Audio**: Ultra-low latency peer connections with adaptive bitrate, mic mute/unmute, and camera toggle.
- **Pre-Join Green Room / Lobby**: Test camera, microphone volume visualizer meter, choose input devices, enter name, and verify passcodes before entering.
- **Interactive Floating Meeting Controls**: Google Meet-style bottom dock with camera, mic, screen share, hand raise, floating emoji reactions, live captions, background blur, and leave/end meeting.
- **Screen Sharing**: Broadcast full desktop, application window, or browser tab with presentation layout.
- **Live Speech-to-Text Captions**: Automated subtitles generated in real time and broadcast to all participants.
- **Cloud Recording**: Host-controlled recording with visible "● REC" indicator, server upload, and playback player.
- **Real-Time In-Call Chat**: Group public messaging, private one-on-one messages, unread indicators, and timestamps.
- **Host Moderation & Security**: Lock meetings, enable waiting room with admit/deny controls, mute individual/all participants, and remove attendees.
- **Admin Control Panel**: View real-time KPIs, active call monitor with force-terminate, user account manager, quota editor, and security audit logs.
- **Tiered Subscription Plans**: Free, Pro ($12/mo), and Business ($24/mo) with feature gating and quota management.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Backend** | Node.js (v20+), Express.js, TypeScript |
| **Real-Time & Media** | WebRTC (Mesh Signaling), Socket.IO, LiveKit SFU SDK |
| **Database** | MySQL (XAMPP MariaDB/MySQL) + Prisma ORM |
| **Authentication** | JWT with Refresh-Token Rotation, bcryptjs |
| **Storage** | Multi-part Form Data / Local disk storage / S3-compatible |
| **Deployment** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## 📁 Project Structure

```
/Applications/XAMPP/xamppfiles/htdocs/meet/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 12+ enterprise database models
│   │   └── seed.ts              # Database seed with default plans & users
│   ├── src/
│   │   ├── config/              # Prisma client instance
│   │   ├── controllers/         # Auth, Meeting, Recording, Admin, Subscription
│   │   ├── middlewares/         # Auth, Role, Error, Rate-limiting
│   │   ├── routes/              # Express API route endpoints
│   │   ├── services/            # LiveKit SFU token service
│   │   ├── sockets/             # WebRTC signaling, chat, reactions, waiting room
│   │   ├── types/               # TypeScript interfaces
│   │   ├── utils/               # JWT token & meeting code generators
│   │   └── server.ts            # Main HTTP server & Socket.IO listener
│   ├── uploads/recordings/      # Stored cloud video recordings
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── common/          # Navbar with theme toggle, Footer with legal modals
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── pages/               # HomePage, AuthPages, Dashboard, Lobby, MeetingRoom, AdminPage
│   │   ├── services/            # Axios API client, Socket.io client
│   │   ├── types/               # TypeScript definitions
│   │   ├── App.tsx              # React Router with route guards
│   │   ├── main.tsx
│   │   └── index.css            # Tailwind directives & styles
│   ├── package.json
│   ├── vite.config.ts           # Proxy to backend on port 5001
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml           # Full production container stack
├── DEPLOYMENT.md                # Production deployment, SSL & LiveKit guide
├── .env.example
└── README.md
```

---

## ⚡ Quick Start (Running Locally with XAMPP)

Both the backend and frontend are already running and configured!

### 1. URLs
- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets**: [http://localhost:5001](http://localhost:5001)
- **Backend Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

### 2. Demo User Accounts (Pre-Seeded)

The login page features a **1-Click Demo Login bar** for instant access:

| Role | Email | Password | Features |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@pulsemeet.io` | `Admin123!` | Admin Control Panel, Full Platform Telemetry, Quota Management |
| **Pro Host** | `sarah.host@pulsemeet.io` | `Password123!` | Pro Plan ($12/mo), Cloud Recording, Waiting Room, Host Moderation |
| **User / Participant** | `john.dev@pulsemeet.io` | `Password123!` | Free Tier, Video Conferencing, Screen Share, Chat, Reactions |

---

## 🧪 Testing Multi-User Video Calls

To test a live two-way conference call on your computer:
1. Open [http://localhost:5173](http://localhost:5173) in your primary browser window.
2. Click **New Meeting** or choose a scheduled meeting from the Dashboard.
3. Copy the meeting URL (e.g., `http://localhost:5173/meet/abc-defg-hij`).
4. Open an **Incognito / Private Window** (or a different browser like Chrome/Firefox/Safari).
5. Paste the link into the second window and enter a name (e.g. "Colleague").
6. Click **Join Now**.
7. Both video feeds will connect in real time using local WebRTC peer-to-peer mesh signaling!
8. Test features:
   - Click the **Smile (😊)** icon to send floating reactions.
   - Click the **Hand (✋)** icon to raise your hand.
   - Type in the **Chat drawer** to send messages.
   - Toggle **Captions (CC)** to see live speech-to-text subtitles.
   - In the host window, click **Start Cloud Recording** to test recording.

---

## 🐳 Production Deployment

To deploy with Docker Compose on a cloud VPS:
```bash
docker compose up -d --build
```
Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for full Nginx reverse proxy, custom domain DNS, and Let's Encrypt SSL instructions.
