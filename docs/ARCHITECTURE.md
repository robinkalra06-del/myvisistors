# LiveTrack System Architecture

LiveTrack is designed as a high-throughput, low-latency, real-time website analytics and visitor monitoring platform. It combines real-time WebSockets with persistent storage, designed to monitor concurrent visitors across thousands of websites without placing load on visitor browsers.

---

## 1. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                             CLIENT BROWSERS                                   |
|                                                                               |
|  +-----------------------------+             +-----------------------------+  |
|  |   Monitored Website A       |             |   LiveTrack Web Dashboard   |  |
|  |   (embeds tracker.js)       |             |   (React 18 + Vite + Recharts)|
|  +--------------+--------------+             +--------------+--------------+  |
+-----------------|-------------------------------------------|-----------------+
                  | HTTP beacon / fetch                       | Socket.IO + REST
                  v                                           v
+-------------------------------------------------------------------------------+
|                        LIVETRACK BACKEND (Node.js)                            |
|                                                                               |
|  +--------------------------------+       +--------------------------------+  |
|  |     Ingestion API Cluster      |       |      Real-Time Socket Server   |  |
|  |  POST /track/session           |       |  Socket.IO with JWT Auth       |  |
|  |  POST /track/pageview          |       |  Room: `website:${siteId}`     |  |
|  |  POST /track/heartbeat         |       |  Presence State Machine        |  |
|  |  POST /track/event             |       |  45s Idle / 120s Offline sweep |  |
|  |  POST /track/session-end       |       |  Broadcasts live events        |  |
|  +----------------+---------------+       +----------------+---------------+  |
|                   |                                        |                  |
|                   +-------------------+--------------------+                  |
|                                       |                                       |
|                                       v                                       |
|                        +------------------------------+                       |
|                        |   Dual-Engine Data Layer     |                       |
|                        |  (PostgreSQL Prisma in Prod  |                       |
|                        |   / Node:SQLite in Dev/Test) |                       |
|                        +--------------+---------------+                       |
+---------------------------------------|---------------------------------------+
                                        v
+-------------------------------------------------------------------------------+
|                            STORAGE LAYER                                      |
|                                                                               |
|         +-----------------------+           +-----------------------+         |
|         |  PostgreSQL Database  |           |     Redis (Optional)  |         |
|         |  (Prisma ORM Models)  |           |  Socket.IO Adapter    |         |
|         +-----------------------+           +-----------------------+         |
+-------------------------------------------------------------------------------+
```

---

## 2. Ingestion Pipeline & Privacy

### The Tracking Snippet (`tracker.js`)
- **Size**: ~3.5 KB (zero external dependencies).
- **Execution**: Asynchronous and non-blocking (`async` tag).
- **Storage**: Anonymous identifier stored in `localStorage` (`_lt_vid`).
- **Session Identification**: Ephemeral session identifier (`_lt_sid`) stored in `sessionStorage`. Expired automatically after 30 minutes of tab inactivity.
- **Single Page Application (SPA) Support**: Hooks into HTML5 History API (`window.history.pushState`, `replaceState`, and `popstate`) to record virtual page transitions without full page reloads.
- **Heartbeat & Visibility**: Sends periodic heartbeats (every 20s) while the tab is active. Switches to paused mode when `document.visibilityState === 'hidden'`.
- **Exit Tracking**: Employs `navigator.sendBeacon()` on `visibilitychange` or `pagehide` to capture exit page and final session duration cleanly even if the tab is closed abruptly.
- **Privacy By Design**:
  - Respects browser `Do Not Track` (`navigator.doNotTrack === '1'`).
  - Completely ignores passwords, payment details, form contents, and keystrokes.
  - IP addresses are anonymized before persistent database storage (e.g. `192.168.1.1` -> `192.168.1.0`, `2001:db8::` masked).

---

## 3. Real-Time Visitor Presence State Machine

The backend tracks visitor lifecycle status in real time through `visitorPresence.js`:

```
               [ Visitor Lands ]
                       |
                       v
             +--------------------+
             |       ONLINE       | <---------------+
             +---------+----------+                 | Heartbeat received
                       |                            | / Page navigation
                       | No heartbeat for 45s       |
                       v                            |
             +--------------------+                 |
             |        IDLE        | ----------------+
             +---------+----------+
                       |
                       | No heartbeat for 120s / Tab closed (sendBeacon)
                       v
             +--------------------+
             |      OFFLINE       |
             +--------------------+
```

### Transition Logic:
1. **New Arrival**:
   - `POST /track/session` creates or resumes a session.
   - Socket server broadcasts `visitor:new` and `stats:update` to the `website:${siteId}` room.
2. **Page Navigation**:
   - `POST /track/pageview` records the new URL and updates current page.
   - Socket server broadcasts `visitor:update` and `activity:feed`.
3. **Idle Sweep (every 10s)**:
   - Evaluates active sessions against `lastActivityAt`.
   - If `Date.now() - lastActivityAt > 45,000ms`, changes status to `IDLE` and broadcasts `visitor:idle`.
4. **Offline Sweep (every 10s)**:
   - If `Date.now() - lastActivityAt > 120,000ms`, changes status to `OFFLINE` and broadcasts `visitor:offline`.
   - Emits session duration and exit page updates to the database.

---

## 4. Multi-Tenant Isolation & Socket.IO Rooms

Every website created in LiveTrack is assigned a unique `siteId` (e.g., `site_demo_store_101`) and a cryptographic `trackingKey`.

- **REST API Isolation**: All database queries for analytics and visitors enforce `WHERE website_id = :id AND website.organization_id = :user_org_id`.
- **Socket.IO Room Partitioning**:
  - When an authenticated user opens the dashboard, their JWT is verified.
  - The client joins the room `website:${siteId}`.
  - Only tracking events matching that `siteId` are broadcast to that specific room.
  - Cross-tenant data leakage is structurally impossible.

---

## 5. Dual-Engine Database Architecture

To ensure LiveTrack runs effortlessly in both local development (with zero external dependencies) and cloud production (with high-scale PostgreSQL):

```
                   apps/api/src/config/database.js
                                  |
               +------------------+------------------+
               |                                     |
               v                                     v
      [ Local Dev / Test ]                 [ Cloud Production ]
         DATABASE_URL =                       DATABASE_URL =
      file:./dev.db / empty               postgresql://user:pass@...
               |                                     |
               v                                     v
      Native Node:SQLite                  Prisma Client (PostgreSQL)
   (Node 22 built-in engine)               (Managed Cloud PostgreSQL)
```

- In production on Render, `prisma migrate deploy` executes the SQL migrations against managed PostgreSQL.
- In local development or automated CI tests, `node:sqlite` provisions tables on-the-fly and mirrors the exact Prisma data model.

---

## 6. Security & Defense in Depth

1. **Password Hashing**: Cryptographic PBKDF2 with SHA-512, 10,000 iterations, unique 16-byte random salt.
2. **Authentication**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256, verified per-request.
3. **Rate Limiting**:
   - `authLimiter`: 10 requests per 15 minutes to protect against brute-force attacks.
   - `trackLimiter`: 600 requests per minute per IP to absorb high-traffic beacon bursts while preventing DDoS.
   - `apiLimiter`: 300 requests per 15 minutes for authenticated dashboard endpoints.
4. **Input Validation**: Schema validation using Zod for all request bodies and query parameters.
5. **HTTP Security Headers**: Powered by Helmet (HSTS, X-Content-Type-Options, X-Frame-Options).
