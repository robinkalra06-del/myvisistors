/**
 * RealTime Visitor Tracker Server - Enterprise Edition
 * Built with Node.js built-in modules: node:http, node:sqlite, node:fs, node:path, node:https
 * Zero external npm dependencies required!
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3030;
const HOST = process.env.HOST || '0.0.0.0';

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}
const LOCAL_IP = getLocalIp();

const DB_FILE = path.join(__dirname, 'analytics.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ==========================================
// 1. SQLite Database Initialization
// ==========================================
const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  
  CREATE TABLE IF NOT EXISTS visitors (
    visitor_id TEXT PRIMARY KEY,
    first_seen INTEGER,
    last_seen INTEGER,
    ip TEXT,
    country_code TEXT,
    country_name TEXT,
    region TEXT,
    city TEXT,
    postal_code TEXT,
    lat REAL,
    lon REAL,
    isp TEXT,
    org TEXT,
    asn TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    language TEXT,
    screen TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    visitor_id TEXT,
    started_at INTEGER,
    ended_at INTEGER,
    duration_seconds INTEGER DEFAULT 0,
    entry_page TEXT,
    exit_page TEXT,
    pageviews_count INTEGER DEFAULT 1,
    referrer TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS pageviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    visitor_id TEXT,
    url TEXT,
    pathname TEXT,
    title TEXT,
    duration_seconds INTEGER DEFAULT 0,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS ip_cache (
    ip TEXT PRIMARY KEY,
    country_code TEXT,
    country_name TEXT,
    region TEXT,
    city TEXT,
    postal_code TEXT,
    lat REAL,
    lon REAL,
    isp TEXT,
    org TEXT,
    asn TEXT,
    cached_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    visitor_id TEXT,
    sender TEXT,
    message TEXT,
    timestamp INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(visitor_id);
  CREATE INDEX IF NOT EXISTS idx_pageviews_session ON pageviews(session_id);
  CREATE INDEX IF NOT EXISTS idx_pageviews_timestamp ON pageviews(timestamp);
  CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id);
`);

// Auto-migrate schema: ensure all new columns exist in existing SQLite databases
try {
  const visitorCols = db.prepare(`PRAGMA table_info(visitors)`).all().map(c => c.name);
  const newCols = [
    { name: 'region', type: 'TEXT' },
    { name: 'postal_code', type: 'TEXT' },
    { name: 'lat', type: 'REAL' },
    { name: 'lon', type: 'REAL' },
    { name: 'isp', type: 'TEXT' },
    { name: 'org', type: 'TEXT' },
    { name: 'asn', type: 'TEXT' },
    { name: 'utm_source', type: 'TEXT' },
    { name: 'utm_medium', type: 'TEXT' },
    { name: 'utm_campaign', type: 'TEXT' }
  ];

  for (const col of newCols) {
    if (!visitorCols.includes(col.name)) {
      db.exec(`ALTER TABLE visitors ADD COLUMN ${col.name} ${col.type}`);
    }
  }
} catch (e) {
  console.error('Migration note:', e.message);
}

// Prepared statements
const stmtUpsertVisitor = db.prepare(`
  INSERT INTO visitors (
    visitor_id, first_seen, last_seen, ip, country_code, country_name, region, city, 
    postal_code, lat, lon, isp, org, asn, browser, os, device, language, screen, 
    utm_source, utm_medium, utm_campaign
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(visitor_id) DO UPDATE SET
    last_seen = excluded.last_seen,
    ip = excluded.ip,
    country_code = excluded.country_code,
    country_name = excluded.country_name,
    region = excluded.region,
    city = excluded.city,
    postal_code = excluded.postal_code,
    lat = excluded.lat,
    lon = excluded.lon,
    isp = excluded.isp,
    org = excluded.org,
    asn = excluded.asn;
`);

const stmtInsertSession = db.prepare(`
  INSERT INTO sessions (session_id, visitor_id, started_at, ended_at, entry_page, exit_page, referrer, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT(session_id) DO UPDATE SET
    ended_at = excluded.ended_at,
    exit_page = excluded.exit_page,
    is_active = 1;
`);

const stmtInsertPageview = db.prepare(`
  INSERT INTO pageviews (session_id, visitor_id, url, pathname, title, timestamp)
  VALUES (?, ?, ?, ?, ?, ?);
`);

const stmtUpdateSessionPageCount = db.prepare(`
  UPDATE sessions SET 
    pageviews_count = (SELECT COUNT(*) FROM pageviews WHERE session_id = ?),
    exit_page = ?,
    ended_at = ?
  WHERE session_id = ?;
`);

const stmtCloseSession = db.prepare(`
  UPDATE sessions SET
    is_active = 0,
    ended_at = ?,
    duration_seconds = ?
  WHERE session_id = ?;
`);

const stmtUpdatePageviewDuration = db.prepare(`
  UPDATE pageviews SET duration_seconds = ? 
  WHERE id = (
    SELECT id FROM pageviews 
    WHERE session_id = ? AND pathname = ? 
    ORDER BY id DESC LIMIT 1
  );
`);

const stmtGetIpCache = db.prepare(`SELECT * FROM ip_cache WHERE ip = ?`);
const stmtInsertIpCache = db.prepare(`
  INSERT INTO ip_cache (ip, country_code, country_name, region, city, postal_code, lat, lon, isp, org, asn, cached_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(ip) DO UPDATE SET
    country_code = excluded.country_code,
    country_name = excluded.country_name,
    region = excluded.region,
    city = excluded.city,
    postal_code = excluded.postal_code,
    lat = excluded.lat,
    lon = excluded.lon,
    isp = excluded.isp,
    org = excluded.org,
    asn = excluded.asn,
    cached_at = excluded.cached_at;
`);

const stmtInsertChatMessage = db.prepare(`
  INSERT INTO chat_messages (session_id, visitor_id, sender, message, timestamp)
  VALUES (?, ?, ?, ?, ?);
`);

const stmtGetChatHistory = db.prepare(`
  SELECT id, session_id, visitor_id, sender, message, timestamp 
  FROM chat_messages 
  WHERE session_id = ? 
  ORDER BY id ASC;
`);

// ==========================================
// 2. IP Intelligence & Geolocation Engine
// ==========================================

// Determine if an IP is private/loopback
function isPrivateIP(ip) {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  if (/^10\./.test(clean)) return true;
  if (/^192\.168\./.test(clean)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (/^fc00:|^fe80:/.test(clean)) return true;
  return false;
}

// Country code to Flag emoji helper
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === 'LOCAL' || countryCode === 'XX') return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Perform IP Intelligence lookup with SQLite caching
async function lookupIpDetails(targetIp) {
  if (!targetIp) return null;
  const cleanIp = targetIp.replace(/^::ffff:/, '').trim();

  // Check cache first
  try {
    const cached = stmtGetIpCache.get(cleanIp);
    if (cached) {
      return {
        ip: cleanIp,
        countryCode: cached.country_code,
        countryName: cached.country_name,
        region: cached.region,
        city: cached.city,
        postalCode: cached.postal_code,
        lat: cached.lat,
        lon: cached.lon,
        isp: cached.isp,
        org: cached.org,
        asn: cached.asn,
        flag: getFlagEmoji(cached.country_code)
      };
    }
  } catch (e) {}

  if (isPrivateIP(cleanIp)) {
    return null;
  }

  // Query free IP API with timeout
  return new Promise(resolve => {
    const req = http.get(`http://ip-api.com/json/${cleanIp}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, { timeout: 2500 }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data && data.status === 'success') {
            const result = {
              ip: cleanIp,
              countryCode: data.countryCode || 'XX',
              countryName: data.country || 'Unknown',
              region: data.regionName || '',
              city: data.city || 'Unknown',
              postalCode: data.zip || '',
              lat: data.lat || 0,
              lon: data.lon || 0,
              isp: data.isp || 'Broadband ISP',
              org: data.org || data.isp || '',
              asn: data.as ? data.as.split(' ')[0] : '',
              flag: getFlagEmoji(data.countryCode)
            };

            // Cache result in SQLite
            try {
              stmtInsertIpCache.run(
                cleanIp, result.countryCode, result.countryName, result.region,
                result.city, result.postalCode, result.lat, result.lon,
                result.isp, result.org, result.asn, Date.now()
              );
            } catch (err) {}

            return resolve(result);
          }
        } catch (e) {}
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// Resolve IP and Geo metadata from request
async function resolveLocation(req, clientMeta, clientPublicIp, clientGeo) {
  // If client resolved public IP client-side, prefer it
  let rawIp = (clientPublicIp && !isPrivateIP(clientPublicIp)) ? clientPublicIp : (
    req.headers['cf-connecting-ip'] || 
    req.headers['x-real-ip'] || 
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : '') || 
    req.socket.remoteAddress || 
    '127.0.0.1'
  );

  let ip = rawIp.replace(/^::ffff:/, '').trim();

  // If local / private IP, resolve immediately without external network requests
  if (isPrivateIP(ip)) {
    return {
      ip: ip,
      displayIp: ip,
      countryCode: 'LOCAL',
      countryName: 'Local Machine',
      region: 'Local Loopback',
      city: 'Localhost',
      postalCode: '',
      lat: 0,
      lon: 0,
      isp: 'Local Loopback (127.0.0.1)',
      org: 'Private System',
      asn: '127.0.0.1',
      isLocal: true,
      flag: '💻'
    };
  }

  // If client passed pre-resolved geo
  if (clientGeo && clientGeo.country) {
    return {
      ip: ip,
      displayIp: ip,
      countryCode: clientGeo.countryCode || 'XX',
      countryName: clientGeo.country,
      region: clientGeo.region || '',
      city: clientGeo.city || '',
      postalCode: clientGeo.postalCode || '',
      lat: clientGeo.lat || 0,
      lon: clientGeo.lon || 0,
      isp: clientGeo.isp || 'Broadband ISP',
      org: clientGeo.org || '',
      asn: clientGeo.asn || '',
      isLocal: false,
      flag: getFlagEmoji(clientGeo.countryCode)
    };
  }

  // Cloudflare headers if present
  const cfCountry = req.headers['cf-ipcountry'];
  const cfCity = req.headers['cf-ipcity'];
  const cfRegion = req.headers['cf-region'];

  // Check IP intelligence for public internet visitors
  const intel = await lookupIpDetails(ip);

  if (intel) {
    return {
      ip: ip,
      displayIp: ip,
      countryCode: intel.countryCode,
      countryName: intel.countryName,
      region: intel.region,
      city: intel.city,
      postalCode: intel.postalCode,
      lat: intel.lat,
      lon: intel.lon,
      isp: intel.isp,
      org: intel.org,
      asn: intel.asn,
      isLocal: false,
      flag: intel.flag
    };
  }

  if (cfCountry && cfCountry !== 'XX') {
    return {
      ip,
      displayIp: ip,
      countryCode: cfCountry,
      countryName: cfCountry,
      region: cfRegion || '',
      city: cfCity || 'Unknown',
      postalCode: '',
      lat: 0,
      lon: 0,
      isp: 'Cloudflare Network',
      org: 'Cloudflare CDN',
      asn: 'AS13335',
      isLocal: false,
      flag: getFlagEmoji(cfCountry)
    };
  }

  // Local fallback based on client timezone
  const tz = (clientMeta && clientMeta.timezone) ? clientMeta.timezone : '';
  let countryCode = 'LOCAL';
  let countryName = 'Local Network';
  let city = 'Localhost';
  let region = 'Internal';

  if (tz.includes('New_York')) { countryCode = 'US'; countryName = 'United States'; city = 'New York'; region = 'NY'; }
  else if (tz.includes('Los_Angeles')) { countryCode = 'US'; countryName = 'United States'; city = 'Los Angeles'; region = 'CA'; }
  else if (tz.includes('Chicago')) { countryCode = 'US'; countryName = 'United States'; city = 'Chicago'; region = 'IL'; }
  else if (tz.includes('London')) { countryCode = 'GB'; countryName = 'United Kingdom'; city = 'London'; region = 'England'; }
  else if (tz.includes('Calcutta') || tz.includes('Kolkata')) { countryCode = 'IN'; countryName = 'India'; city = 'New Delhi'; region = 'DL'; }
  else if (tz.includes('Berlin')) { countryCode = 'DE'; countryName = 'Germany'; city = 'Berlin'; region = 'Berlin'; }
  else if (tz.includes('Tokyo')) { countryCode = 'JP'; countryName = 'Japan'; city = 'Tokyo'; region = 'Kanto'; }
  else if (tz.includes('Toronto')) { countryCode = 'CA'; countryName = 'Canada'; city = 'Toronto'; region = 'Ontario'; }

  return {
    ip,
    displayIp: ip,
    countryCode,
    countryName,
    region,
    city,
    postalCode: '',
    lat: 0,
    lon: 0,
    isp: isLocalNetwork ? 'Local Area Network (LAN)' : 'Broadband Network',
    org: isLocalNetwork ? 'Private Intranet' : 'Internet Provider',
    asn: isLocalNetwork ? 'LAN' : 'AS-LOCAL',
    isLocal: isLocalNetwork,
    flag: getFlagEmoji(countryCode)
  };
}

// User-Agent parser distinguishing Laptop, Android, iOS
function parseUserAgent(ua) {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop', deviceDetail: '💻 Laptop / PC' };
  
  let browser = 'Other';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = 'Other';
  let deviceCategory = 'Desktop';
  let deviceDetail = '💻 Laptop / PC';

  if (/iphone/i.test(ua)) {
    os = 'iOS';
    deviceDetail = '📱 Mobile (iOS)';
    deviceCategory = 'Mobile';
  } else if (/ipad/i.test(ua)) {
    os = 'iPadOS';
    deviceDetail = '📟 Tablet (iPad)';
    deviceCategory = 'Tablet';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    if (/mobile/i.test(ua)) {
      deviceDetail = '📱 Mobile (Android)';
      deviceCategory = 'Mobile';
    } else {
      deviceDetail = '📟 Tablet (Android)';
      deviceCategory = 'Tablet';
    }
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
    deviceDetail = '💻 Laptop (macOS)';
    deviceCategory = 'Desktop';
  } else if (/windows/i.test(ua)) {
    os = 'Windows';
    deviceDetail = '💻 Laptop (Windows)';
    deviceCategory = 'Desktop';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    deviceDetail = '💻 Laptop (Linux)';
    deviceCategory = 'Desktop';
  }

  return { browser, os, device: deviceCategory, deviceDetail };
}

function getVisitorLabel(visitorId) {
  const suffix = visitorId ? visitorId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() : '0000';
  return `Visitor #${suffix}`;
}

// ==========================================
// 3. In-Memory Live Visitors & SSE Engine
// ==========================================
const liveVisitors = new Map();
const sseClients = new Set();

function broadcastSSE(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// Heartbeat & presence sweep timer
const HEARTBEAT_TIMEOUT_MS = 25000; // 25s without heartbeat = left
const IDLE_TIMEOUT_MS = 12000;      // 12s without heartbeat = idle

setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const [sessionId, visitor] of liveVisitors.entries()) {
    const elapsed = now - visitor.lastHeartbeat;

    if (elapsed > HEARTBEAT_TIMEOUT_MS) {
      visitor.status = 'left';
      const sessionDuration = Math.floor((now - visitor.sessionStartTime) / 1000);
      try {
        stmtCloseSession.run(now, sessionDuration, sessionId);
      } catch (e) {}

      broadcastSSE('visitor_left', {
        sessionId: visitor.sessionId,
        visitorId: visitor.visitorId,
        label: visitor.label,
        duration: sessionDuration
      });

      liveVisitors.delete(sessionId);
      changed = true;
    } else if (elapsed > IDLE_TIMEOUT_MS && visitor.status === 'active') {
      visitor.status = 'idle';
      changed = true;
    }
  }

  if (changed) {
    broadcastStats();
  }
}, 3000);

function broadcastStats() {
  const stats = calculateLiveStats();
  broadcastSSE('stats_update', stats);
}

function calculateLiveStats() {
  const visitorsList = Array.from(liveVisitors.values()).map(v => {
    const now = Date.now();
    return {
      sessionId: v.sessionId,
      visitorId: v.visitorId,
      label: v.label,
      status: v.status, // 'active' | 'idle'
      currentUrl: v.currentUrl,
      currentPath: v.currentPath,
      currentTitle: v.currentTitle,
      referrer: v.referrer,
      flag: v.location.flag,
      country: v.location.countryName,
      countryCode: v.location.countryCode,
      region: v.location.region || '',
      city: v.location.city,
      postalCode: v.location.postalCode || '',
      lat: v.location.lat || 0,
      lon: v.location.lon || 0,
      ip: v.location.ip,
      displayIp: v.location.displayIp || v.location.ip,
      isp: v.location.isp,
      org: v.location.org,
      asn: v.location.asn,
      device: v.parsedUA.device,
      deviceDetail: v.parsedUA.deviceDetail || v.parsedUA.device,
      browser: v.parsedUA.browser,
      os: v.parsedUA.os,
      timeOnPageSeconds: Math.floor((now - v.pageStartTime) / 1000),
      sessionDurationSeconds: Math.floor((now - v.sessionStartTime) / 1000),
      pagesViewedCount: v.pagesViewed.length,
      utm: v.utm || {},
      recentPages: v.pagesViewed.slice(-5)
    };
  });

  const pagesCount = {};
  const countryCount = {};
  const deviceCount = {};
  const browserCount = {};
  const ispCount = {};

  visitorsList.forEach(v => {
    pagesCount[v.currentPath] = (pagesCount[v.currentPath] || 0) + 1;
    countryCount[v.country] = (countryCount[v.country] || 0) + 1;
    deviceCount[v.device] = (deviceCount[v.device] || 0) + 1;
    browserCount[v.browser] = (browserCount[v.browser] || 0) + 1;
    if (v.isp) ispCount[v.isp] = (ispCount[v.isp] || 0) + 1;
  });

  return {
    activeVisitorsCount: visitorsList.length,
    activeVisitors: visitorsList,
    topPages: Object.entries(pagesCount).map(([path, count]) => ({ path, count })).sort((a,b) => b.count - a.count),
    topCountries: Object.entries(countryCount).map(([country, count]) => ({ country, count })).sort((a,b) => b.count - a.count),
    devices: deviceCount,
    browsers: browserCount,
    isps: Object.entries(ispCount).map(([isp, count]) => ({ isp, count })).sort((a,b) => b.count - a.count).slice(0, 5),
    timestamp: Date.now(),
    serverInfo: {
      port: PORT,
      localIp: LOCAL_IP
    }
  };
}

// ==========================================
// 4. Request Handlers & Endpoints
// ==========================================
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8'
};

const TRANSPARENT_GIF_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

function sendTrackingResponse(res, reqMethod) {
  if (reqMethod === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true'
    });
    res.end(TRANSPARENT_GIF_PIXEL);
  } else {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true'
    });
    res.end(JSON.stringify({ success: true }));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS & Chrome Private Network Access Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Access-Control-Request-Private-Network'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // ------------------------------------------
  // API: Server-Sent Events (SSE) Stream
  // ------------------------------------------
  if (pathname === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write('event: connected\ndata: {"status":"connected"}\n\n');
    sseClients.add(res);

    // Immediately send current live state
    res.write(`event: stats_update\ndata: ${JSON.stringify(calculateLiveStats())}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // ------------------------------------------
  // API: Track Pageview / Navigation
  // ------------------------------------------
  if (pathname === '/api/track' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let data = {};
      if (req.method === 'POST') {
        data = await parseRequestBody(req);
      } else {
        const raw = url.searchParams.get('data');
        data = raw ? JSON.parse(raw) : {};
      }
      const { visitorId, sessionId, url: pageUrl, pathname: pagePath, title, referrer, isNavigation, meta, utm, clientPublicIp, clientGeo, timestamp } = data;

      if (!visitorId || !sessionId) {
        if (req.method === 'GET') {
          return sendTrackingResponse(res, 'GET');
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing visitorId or sessionId' }));
        return;
      }

      const parsedUA = parseUserAgent(meta ? meta.userAgent : req.headers['user-agent']);
      const location = await resolveLocation(req, meta, clientPublicIp, clientGeo);
      const now = timestamp || Date.now();

      // Upsert into SQLite
      stmtUpsertVisitor.run(
        visitorId,
        now,
        now,
        location.ip,
        location.countryCode,
        location.countryName,
        location.region || '',
        location.city || '',
        location.postalCode || '',
        location.lat || 0,
        location.lon || 0,
        location.isp || '',
        location.org || '',
        location.asn || '',
        parsedUA.browser,
        parsedUA.os,
        parsedUA.device,
        meta ? meta.language : '',
        meta ? meta.screen : '',
        utm ? utm.utm_source : '',
        utm ? utm.utm_medium : '',
        utm ? utm.utm_campaign : ''
      );

      // Session record
      stmtInsertSession.run(
        sessionId,
        visitorId,
        now,
        now,
        pagePath,
        pagePath,
        referrer || 'Direct'
      );

      // Pageview record
      stmtInsertPageview.run(
        sessionId,
        visitorId,
        pageUrl,
        pagePath,
        title || pagePath,
        now
      );

      stmtUpdateSessionPageCount.run(sessionId, pagePath, now, sessionId);

      // Update in-memory live visitor state
      let visitor = liveVisitors.get(sessionId);
      const isNewVisitor = !visitor;

      if (!visitor) {
        visitor = {
          sessionId,
          visitorId,
          label: getVisitorLabel(visitorId),
          status: 'active',
          sessionStartTime: now,
          pageStartTime: now,
          lastHeartbeat: now,
          currentUrl: pageUrl,
          currentPath: pagePath,
          currentTitle: title || pagePath,
          referrer: referrer || 'Direct',
          location,
          parsedUA,
          utm: utm || {},
          pagesViewed: [{ path: pagePath, title: title || pagePath, timestamp: now }]
        };
        liveVisitors.set(sessionId, visitor);
      } else {
        visitor.status = 'active';
        visitor.pageStartTime = now;
        visitor.lastHeartbeat = now;
        visitor.currentUrl = pageUrl;
        visitor.currentPath = pagePath;
        visitor.currentTitle = title || pagePath;
        if (utm && Object.keys(utm).length) visitor.utm = utm;
        visitor.pagesViewed.push({ path: pagePath, title: title || pagePath, timestamp: now });
      }

      broadcastSSE('pageview', {
        sessionId,
        visitorId,
        label: visitor.label,
        isNew: isNewVisitor,
        isNavigation: !!isNavigation,
        path: pagePath,
        url: pageUrl,
        title: title || pagePath,
        location: visitor.location,
        device: visitor.parsedUA.device,
        deviceDetail: visitor.parsedUA.deviceDetail || visitor.parsedUA.device,
        browser: visitor.parsedUA.browser,
        os: visitor.parsedUA.os,
        referrer: visitor.referrer,
        isp: visitor.location.isp,
        timestamp: now
      });

      broadcastStats();

      return sendTrackingResponse(res, req.method);
    } catch (err) {
      console.error('Error tracking pageview:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ------------------------------------------
  // API: Heartbeat
  // ------------------------------------------
  if (pathname === '/api/heartbeat' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let data = {};
      if (req.method === 'POST') {
        data = await parseRequestBody(req);
      } else {
        const raw = url.searchParams.get('data');
        data = raw ? JSON.parse(raw) : {};
      }
      const { sessionId, status, timeOnPageSeconds } = data;
      const now = Date.now();

      const visitor = liveVisitors.get(sessionId);
      if (visitor) {
        const oldStatus = visitor.status;
        visitor.lastHeartbeat = now;
        visitor.status = status || 'active';
        visitor.timeOnPageSeconds = timeOnPageSeconds || Math.floor((now - visitor.pageStartTime) / 1000);

        if (oldStatus !== visitor.status) {
          broadcastSSE('status_change', {
            sessionId,
            label: visitor.label,
            status: visitor.status
          });
          broadcastStats();
        }
      }

      return sendTrackingResponse(res, req.method);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ------------------------------------------
  // API: Leave
  // ------------------------------------------
  if (pathname === '/api/leave' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let data = {};
      if (req.method === 'POST') {
        data = await parseRequestBody(req);
      } else {
        const raw = url.searchParams.get('data');
        data = raw ? JSON.parse(raw) : {};
      }
      const { sessionId, durationSeconds, pathname: leavePath } = data;
      const now = Date.now();

      const visitor = liveVisitors.get(sessionId);
      if (visitor) {
        const totalDuration = Math.floor((now - visitor.sessionStartTime) / 1000);
        try {
          stmtCloseSession.run(now, totalDuration, sessionId);
          if (leavePath && durationSeconds) {
            stmtUpdatePageviewDuration.run(durationSeconds, sessionId, leavePath);
          }
        } catch (e) {}

        broadcastSSE('visitor_left', {
          sessionId,
          visitorId: visitor.visitorId,
          label: visitor.label,
          duration: totalDuration
        });

        liveVisitors.delete(sessionId);
        broadcastStats();
      }

      return sendTrackingResponse(res, req.method);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ------------------------------------------
  // API: Live Stats
  // ------------------------------------------
  if (pathname === '/api/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(calculateLiveStats()));
    return;
  }

  // ------------------------------------------
  // API: Visitor Detailed Journey & IP Info
  // ------------------------------------------
  if (pathname.startsWith('/api/visitor/') && pathname.endsWith('/history') && req.method === 'GET') {
    const parts = pathname.split('/');
    const visitorId = parts[3];

    try {
      const visitor = db.prepare('SELECT * FROM visitors WHERE visitor_id = ?').get(visitorId);
      const sessions = db.prepare('SELECT * FROM sessions WHERE visitor_id = ? ORDER BY started_at DESC LIMIT 20').all(visitorId);
      const pageviews = db.prepare('SELECT * FROM pageviews WHERE visitor_id = ? ORDER BY timestamp DESC LIMIT 50').all(visitorId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ visitor, sessions, pageviews }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ------------------------------------------
  // API: Export Visitors to CSV
  // ------------------------------------------
  if (pathname === '/api/export/visitors.csv' && req.method === 'GET') {
    try {
      const visitors = db.prepare('SELECT * FROM visitors ORDER BY last_seen DESC LIMIT 500').all();
      let csv = 'Visitor ID,IP Address,ISP,Organization,ASN,Country,Region,City,Browser,OS,Device,First Seen,Last Seen\n';
      
      visitors.forEach(v => {
        const clean = str => `"${String(str || '').replace(/"/g, '""')}"`;
        csv += [
          clean(v.visitor_id),
          clean(v.ip),
          clean(v.isp),
          clean(v.org),
          clean(v.asn),
          clean(v.country_name),
          clean(v.region),
          clean(v.city),
          clean(v.browser),
          clean(v.os),
          clean(v.device),
          clean(new Date(v.first_seen).toISOString()),
          clean(new Date(v.last_seen).toISOString())
        ].join(',') + '\n';
      });

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="visitors_export.csv"'
      });
      res.end(csv);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ------------------------------------------
  // API: Live 2-Way Chat (Visitor & Admin)
  // ------------------------------------------
  if (pathname === '/api/chat/send' && req.method === 'POST') {
    try {
      const data = await parseRequestBody(req);
      const { sessionId, visitorId, sender, message } = data;

      if (!sessionId || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing sessionId or message' }));
      }

      const now = Date.now();
      stmtInsertChatMessage.run(sessionId, visitorId || '', sender || 'visitor', message, now);

      broadcastSSE('chat_message', {
        sessionId,
        visitorId: visitorId || '',
        sender: sender || 'visitor',
        message,
        timestamp: now
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, timestamp: now }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === '/api/chat/history' && req.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing sessionId' }));
    }

    try {
      const messages = stmtGetChatHistory.all(sessionId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messages }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ------------------------------------------
  // Static File Serving
  // ------------------------------------------
  let filePath = '';
  if (pathname === '/' || pathname === '/dashboard') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/tracker.js') {
    filePath = path.join(PUBLIC_DIR, 'tracker.js');
  } else {
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.js' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ Realtime Visitor Monitor - Enterprise Edition`);
  console.log(`   - Live Dashboard:   http://localhost:${PORT}/`);
  console.log(`   - Mobile & LAN URL: http://${LOCAL_IP}:${PORT}/ (for mobile devices)`);
  console.log(`   - Embed Script:     http://${LOCAL_IP}:${PORT}/tracker.js`);
  console.log(`   - SQLite Database:  ${DB_FILE}`);
  console.log(`======================================================\n`);
});

process.on('SIGINT', () => {
  console.log('\nClosing server...');
  db.close();
  server.close(() => {
    process.exit(0);
  });
});
