# LiveTrack Real-Time WebSocket Event Contract

LiveTrack uses [Socket.IO](https://socket.io/) for sub-second synchronization between monitored visitor websites and the web dashboard.

---

## 1. Connecting & Authentication

### Endpoint
```
wss://your-livetrack-api.onrender.com (or ws://localhost:4000 in development)
```

### Connection Options
Clients connect by sending their JWT token in `auth`:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://your-livetrack-api.onrender.com', {
  auth: {
    token: 'YOUR_JWT_BEARER_TOKEN'
  },
  transports: ['websocket', 'polling']
});
```

---

## 2. Room Subscription Model

To ensure isolation, dashboards subscribe to individual website rooms:

```
Socket joins room: `website:${siteId}`
```

### Client -> Server Events:

#### `subscribe:website`
Subscribes the socket to events for a specific website.
```javascript
socket.emit('subscribe:website', { siteId: 'site_demo_store_101' });
```

#### `unsubscribe:website`
Unsubscribes the socket from a website room.
```javascript
socket.emit('unsubscribe:website', { siteId: 'site_demo_store_101' });
```

---

## 3. Server -> Client Events:

#### `visitor:new`
Broadcast when a new visitor session lands on the website.
```json
{
  "type": "visitor:new",
  "siteId": "site_demo_store_101",
  "visitor": {
    "id": "vid_d9a8f27b",
    "sessionId": "ses_4e81cb92",
    "status": "online",
    "city": "San Francisco",
    "country": "US",
    "browser": "Chrome",
    "os": "macOS",
    "device": "desktop",
    "currentPage": "/products/headphones",
    "pageTitle": "Wireless Headphones",
    "referrer": "google.com",
    "startedAt": 1727823000000,
    "lastActivityAt": 1727823000000,
    "pageViews": 1
  }
}
```

#### `visitor:update`
Broadcast when an active visitor navigates to a new page.
```json
{
  "type": "visitor:update",
  "siteId": "site_demo_store_101",
  "sessionId": "ses_4e81cb92",
  "currentPage": "/cart",
  "pageTitle": "Shopping Cart",
  "pageViews": 2,
  "lastActivityAt": 1727823045000
}
```

#### `visitor:idle`
Broadcast by the backend presence cleaner after 45 seconds of no activity.
```json
{
  "type": "visitor:idle",
  "siteId": "site_demo_store_101",
  "sessionId": "ses_4e81cb92"
}
```

#### `visitor:offline`
Broadcast when a visitor closes their browser tab or after 120 seconds without activity.
```json
{
  "type": "visitor:offline",
  "siteId": "site_demo_store_101",
  "sessionId": "ses_4e81cb92",
  "exitPage": "/cart",
  "totalDuration": 128
}
```

#### `stats:update`
Emitted immediately whenever visitor presence changes so dashboard badges update instantly.
```json
{
  "siteId": "site_demo_store_101",
  "onlineVisitors": 4,
  "idleVisitors": 1
}
```

#### `activity:feed`
Emitted for the real-time activity stream on the main dashboard.
```json
{
  "id": "act_884920",
  "siteId": "site_demo_store_101",
  "type": "pageview",
  "description": "Visitor from United States navigated to /checkout",
  "country": "US",
  "device": "desktop",
  "timestamp": 1727823100000
}
```
