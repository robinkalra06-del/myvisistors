# LiveTrack REST API Reference

All requests to `/api/*` endpoints (except authentication and public health checks) require a Bearer JWT Token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

Tracking ingestion endpoints located at `/track/*` are public and authenticated via the `siteId` payload.

---

## 1. System Health

### `GET /api/health`
Returns the operational health of the API server and database connection.

**Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "livetrack-api",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-10-02T04:50:00.000Z"
}
```

---

## 2. Authentication API (`/api/auth`)

### `POST /api/auth/register`
Creates a new tenant user account and initial organization.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "usr_abc123",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "OWNER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `POST /api/auth/login`
Authenticates an existing user.

**Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "user": {
    "id": "usr_abc123",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "OWNER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `GET /api/auth/me`
Fetches current authenticated user profile and active organization.

---

## 3. Website Management API (`/api/websites`)

### `GET /api/websites`
Lists all monitored websites belonging to the user's organization.

**Response `200 OK`**:
```json
{
  "success": true,
  "websites": [
    {
      "id": "site_demo_store_101",
      "name": "Demo E-Commerce Store",
      "domain": "mystore.example.com",
      "trackingStatus": "ACTIVE",
      "isVerified": true,
      "onlineVisitors": 3,
      "totalVisitors": 42,
      "totalPageViews": 184
    }
  ]
}
```

### `POST /api/websites`
Registers a new website to be monitored.

**Request Body**:
```json
{
  "name": "Corporate Blog",
  "domain": "blog.mycompany.com"
}
```

### `GET /api/websites/:id`
Retrieves website details, tracking snippet, and key metadata.

### `PUT /api/websites/:id`
Updates website configuration, allowed domains, or tracking status.

### `POST /api/websites/:id/rotate-key`
Regenerates the tracking API key for the website.

---

## 4. Ingestion Tracking API (`/track`)

High-throughput public endpoints called by `tracker.js`.

### `POST /track/session`
Initiates or resumes a visitor session when a user loads a page.

**Request Body**:
```json
{
  "siteId": "site_demo_store_101",
  "visitorId": "vid_d9a8f27b...",
  "sessionId": "ses_4e81cb92...",
  "url": "https://mystore.example.com/products/headphones",
  "path": "/products/headphones",
  "title": "Wireless Headphones - Demo Store",
  "referrer": "https://www.google.com",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  "screenWidth": 1920,
  "screenHeight": 1080,
  "language": "en-US",
  "timezone": "America/New_York"
}
```

**Response `200 OK`**:
```json
{
  "status": "ok",
  "visitorId": "vid_d9a8f27b...",
  "sessionId": "ses_4e81cb92...",
  "isNewVisitor": false
}
```

### `POST /track/pageview`
Records an SPA navigation or sub-page transition within an active session.

### `POST /track/heartbeat`
Keep-alive ping sent every 20 seconds while the page tab is focused.

### `POST /track/event`
Tracks custom interactions (e.g. button click, signup, checkout).

**Request Body**:
```json
{
  "siteId": "site_demo_store_101",
  "visitorId": "vid_d9a8f27b...",
  "sessionId": "ses_4e81cb92...",
  "eventName": "add_to_cart",
  "properties": {
    "productId": "sku_9921",
    "price": 149.99,
    "currency": "USD"
  }
}
```

### `POST /track/session-end`
Flushes session exit page and final timestamp on tab close (via `sendBeacon`).

---

## 5. Live Visitors & History API (`/api/visitors`)

### `GET /api/visitors/live?websiteId=:siteId`
Returns currently active and idle visitors with live presence metrics.

### `GET /api/visitors/history?websiteId=:siteId&page=1&limit=20`
Paginated query of past visitor sessions.

### `GET /api/visitors/:visitorId`
Returns the full profile of a visitor, including all past sessions and a chronological activity timeline of pageviews and events.

---

## 6. Analytics API (`/api/analytics`)

### `GET /api/analytics/overview?websiteId=:siteId&range=7d`
Key Performance Indicators (KPIs):
- Total Visitors
- Unique Visitors
- Pageviews
- Avg Session Duration
- Bounce Rate
- New vs Returning Ratio

### `GET /api/analytics/traffic?websiteId=:siteId&interval=day`
Time-series data for chart rendering.

### `GET /api/analytics/geography?websiteId=:siteId`
Breakdown by Country, Region, and City.

### `GET /api/analytics/devices?websiteId=:siteId`
Breakdown by Device Category (desktop, mobile, tablet), Operating System, and Browser.

### `GET /api/analytics/pages?websiteId=:siteId`
Top visited pages, entry pages, and exit pages.

### `GET /api/analytics/export?websiteId=:siteId&format=csv`
Exports raw session analytics as a downloadable CSV.
