import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { db } from '../apps/api/src/config/database.js';
import { AuthService } from '../apps/api/src/services/auth.service.js';
import { WebsiteService } from '../apps/api/src/services/website.service.js';
import { TrackService } from '../apps/api/src/services/track.service.js';
import { AnalyticsService } from '../apps/api/src/services/analytics.service.js';
import { VisitorService } from '../apps/api/src/services/visitor.service.js';
import { AdminService } from '../apps/api/src/services/admin.service.js';
import { NotificationService } from '../apps/api/src/services/notification.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.before(async () => {
  await db.init();
});

test('1. Database Initialization & Models Available', async () => {
  assert.ok(db.user);
  assert.ok(db.website);
  assert.ok(db.visitor);
  assert.ok(db.visitorSession);
  assert.ok(db.pageView);
  assert.ok(db.visitorEvent);
  assert.ok(db.notification);
  assert.ok(db.auditLog);
});

test('2. User Registration, Password Hashing & Login Flow', async () => {
  const testEmail = `tester_${Date.now()}@livetrack.io`;
  const registerResult = await AuthService.register({
    email: testEmail,
    password: 'StrongPassword123!',
    name: 'Integration Tester'
  });

  assert.ok(registerResult.user.id);
  assert.equal(registerResult.user.email, testEmail);
  assert.ok(registerResult.token);
  assert.ok(registerResult.organization);

  // Login
  const loginResult = await AuthService.login({
    email: testEmail,
    password: 'StrongPassword123!'
  });
  assert.ok(loginResult.token);
  assert.equal(loginResult.user.email, testEmail);

  // Get Me profile
  const me = await AuthService.getMe(registerResult.user.id);
  assert.equal(me.email, testEmail);
  assert.ok(me.preferences);
});

test('3. Website Creation, Tracking Key & Isolation', async () => {
  const user = await AuthService.register({
    email: `isolated_${Date.now()}@livetrack.io`,
    password: 'Password123!',
    name: 'Isolation Tester'
  });

  const website = await WebsiteService.createWebsite(user.user.id, {
    name: 'My Isolated Store',
    domain: 'myisolatedstore.com',
    allowedOrigins: '*'
  });

  assert.ok(website.publicId.startsWith('site_'));
  assert.ok(website.trackingKey.startsWith('tk_live_'));
  assert.equal(website.name, 'My Isolated Store');

  // Verify installation check
  const verify = await WebsiteService.verifyInstallation(website.id);
  assert.equal(typeof verify.isInstalled, 'boolean');

  // Key regeneration
  const newKey = await WebsiteService.regenerateKey(website.id, user.user.id);
  assert.ok(newKey.key.startsWith('tk_live_'));
  assert.notEqual(newKey.key, website.trackingKey);
});

test('4. Tracking Script Ingestion & Visitor Session Lifecycle', async () => {
  const websiteId = 'site_test_' + Date.now();
  await db.website.create({
    data: {
      publicId: websiteId,
      organizationId: 'org_test',
      name: 'Test Tracking Site',
      domain: 'testtrackingsite.com',
      isTrackingActive: true
    }
  });

  const vid = 'vid_unit_' + Date.now();
  const sid = 'sid_unit_' + Date.now();

  // 1. Session setup
  const sessionRes = await TrackService.handleSession(
    { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }, ip: '127.0.0.1' },
    {
      websiteId,
      visitorId: vid,
      sessionId: sid,
      referrer: 'https://google.com',
      landingPage: '/landing',
      currentPage: '/landing',
      pageTitle: 'Landing Test'
    }
  );
  assert.equal(sessionRes.success, true);
  assert.equal(sessionRes.isReturning, false);

  // 2. PageView
  const pvRes = await TrackService.handlePageView(
    { headers: {} },
    {
      websiteId,
      visitorId: vid,
      sessionId: sid,
      url: 'https://testtrackingsite.com/pricing',
      path: '/pricing',
      title: 'Pricing Page',
      referrer: 'https://testtrackingsite.com/landing'
    }
  );
  assert.equal(pvRes.success, true);

  // 3. Heartbeat
  const hbRes = await TrackService.handleHeartbeat(
    { headers: {} },
    {
      websiteId,
      visitorId: vid,
      sessionId: sid,
      status: 'online'
    }
  );
  assert.equal(hbRes.success, true);

  // 4. Custom Event
  const evtRes = await TrackService.handleEvent(
    { headers: {} },
    {
      websiteId,
      visitorId: vid,
      sessionId: sid,
      eventName: 'checkout_button_click',
      properties: { item_count: 3, total_usd: 120 }
    }
  );
  assert.equal(evtRes.success, true);

  // 5. Query Live Visitors
  const live = VisitorService.getLiveVisitors(websiteId);
  assert.ok(live.length >= 1);
  assert.equal(live[0].sessionId, sid);

  // 6. Query Visitor Profile & Timeline
  const profile = await VisitorService.getVisitorProfile(websiteId, live[0].id);
  assert.ok(profile.visitor);
  assert.ok(profile.timeline.length >= 2); // pageview + event

  // 7. Query Analytics Overview
  const overview = await AnalyticsService.getOverview(websiteId);
  assert.ok(overview.totalPageViewsAllTime >= 1);
  assert.equal(overview.currentlyOnline, 1);

  // 8. Query CSV Export
  const csv = await AnalyticsService.generateCsv(websiteId, 'pages');
  assert.ok(csv.includes('/pricing'));
});

test('5. Admin & Notification Services', async () => {
  const stats = await AdminService.getPlatformStats();
  assert.ok(stats.totalUsers >= 1);
  assert.ok(stats.system.uptimeSeconds >= 0);

  const notif = await NotificationService.sendNotification({
    userId: 'usr_admin_master',
    type: 'SYSTEM',
    title: 'System Initialized',
    message: 'Test notification'
  });
  assert.ok(notif.id);

  const userNotifs = await NotificationService.getUserNotifications('usr_admin_master');
  assert.ok(userNotifs.length >= 1);
});

test('6. Static Tracker.js & Test Site File Assets', async () => {
  const trackerPath = path.resolve(__dirname, '../apps/api/public/tracker.js');
  const testSitePath = path.resolve(__dirname, '../apps/api/public/test-site.html');

  assert.ok(fs.existsSync(trackerPath), 'tracker.js must exist');
  assert.ok(fs.existsSync(testSitePath), 'test-site.html must exist');

  const trackerContent = fs.readFileSync(trackerPath, 'utf8');
  assert.ok(trackerContent.includes('window.LiveTrack'), 'tracker.js defines LiveTrack');
  assert.ok(trackerContent.includes('sendBeacon'), 'tracker.js supports sendBeacon');
  assert.ok(trackerContent.includes('doNotTrack'), 'tracker.js respects doNotTrack');
});
