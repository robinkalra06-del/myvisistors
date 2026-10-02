import { db } from '../config/database.js';
import { parseUserAgent } from '../utils/uaparser.js';
import { GeoService } from './geo.service.js';
import { presenceManager } from '../sockets/visitorPresence.js';
import { emitToWebsite } from '../sockets/socketServer.js';
import { anonymizeIp, sanitizeUrl, classifyTrafficChannel, parseReferrerDomain, SOCKET_EVENTS, VISITOR_STATUS } from '../../../../packages/shared/index.js';
import { logger } from '../utils/logger.js';

export class TrackService {
  /**
   * Validate that website exists, tracking is active, and origin is permitted
   */
  static async validateWebsite(websiteId, originHeader) {
    const website = await db.website.findFirst({
      where: { publicId: websiteId }
    });

    if (!website) {
      const err = new Error(`Invalid or unregistered website ID: ${websiteId}`);
      err.statusCode = 404;
      throw err;
    }

    if (!website.isTrackingActive) {
      const err = new Error('Tracking is temporarily paused for this website.');
      err.statusCode = 403;
      throw err;
    }

    // Origin validation
    if (website.allowedOrigins && website.allowedOrigins !== '*' && originHeader) {
      const cleanOrigin = originHeader.replace(/^https?:\/\//, '').toLowerCase();
      const allowed = website.allowedOrigins.split(',').map(s => s.trim().toLowerCase());
      const isAllowed = allowed.some(pattern => cleanOrigin.includes(pattern));
      if (!isAllowed) {
        logger.warn(`Origin check failed for site ${websiteId}. Header: ${originHeader}`);
      }
    }

    return website;
  }

  /**
   * Process initial session setup
   */
  static async handleSession(req, data) {
    const {
      websiteId,
      visitorId: rawVisitorId,
      sessionId: rawSessionId,
      referrer = 'Direct',
      landingPage = '/',
      currentPage = '/',
      pageTitle = 'Untitled',
      screenResolution = '1920x1080',
      language = 'en',
      timezone = 'UTC'
    } = data;

    const origin = req.headers.origin || req.headers.referer || '';
    const website = await this.validateWebsite(websiteId, origin);

    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const effectiveIp = website.anonymizeIp ? anonymizeIp(rawIp) : rawIp;

    const geo = GeoService.resolveLocation(req, rawIp);
    const ua = parseUserAgent(req.headers['user-agent'] || '');
    const channel = classifyTrafficChannel(referrer, currentPage);

    // 1. Find or create Visitor
    let isReturning = false;
    let visitor = await db.visitor.findFirst({
      where: { websiteId: website.publicId, anonymousId: rawVisitorId }
    });

    const nowIso = new Date().toISOString();

    if (visitor) {
      isReturning = true;
      visitor = await db.visitor.update({
        where: { id: visitor.id },
        data: {
          lastSeenAt: nowIso,
          totalSessions: (visitor.totalSessions || 1) + 1,
          isReturning: true,
          lastIp: effectiveIp,
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
          browser: ua.browser,
          browserVersion: ua.browserVersion,
          os: ua.os,
          deviceType: ua.deviceType,
          language,
          timezone
        }
      });
    } else {
      visitor = await db.visitor.create({
        data: {
          anonymousId: rawVisitorId,
          websiteId: website.publicId,
          firstSeenAt: nowIso,
          lastSeenAt: nowIso,
          totalSessions: 1,
          isReturning: false,
          lastIp: effectiveIp,
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
          browser: ua.browser,
          browserVersion: ua.browserVersion,
          os: ua.os,
          deviceType: ua.deviceType,
          language,
          timezone
        }
      });
    }

    // 2. Find or create VisitorSession
    let session = await db.visitorSession.findFirst({
      where: { sessionToken: rawSessionId }
    });

    if (!session) {
      session = await db.visitorSession.create({
        data: {
          sessionToken: rawSessionId,
          visitorId: visitor.id,
          websiteId: website.publicId,
          status: 'ONLINE',
          startedAt: nowIso,
          lastActivityAt: nowIso,
          durationSeconds: 0,
          pageViewCount: 1,
          landingPage: sanitizeUrl(landingPage),
          exitPage: sanitizeUrl(currentPage),
          referrer: referrer.substring(0, 500),
          channel,
          screenResolution,
          ip: effectiveIp,
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
          browser: ua.browser,
          browserVersion: ua.browserVersion,
          os: ua.os,
          deviceType: ua.deviceType
        }
      });
    } else {
      session = await db.visitorSession.update({
        where: { id: session.id },
        data: {
          status: 'ONLINE',
          lastActivityAt: nowIso,
          exitPage: sanitizeUrl(currentPage)
        }
      });
    }

    // 3. Update Website installation metadata if first time
    if (!website.installedAt) {
      await db.website.update({
        where: { id: website.id },
        data: { installedAt: nowIso, lastPingAt: nowIso }
      });
    } else {
      await db.website.update({
        where: { id: website.id },
        data: { lastPingAt: nowIso }
      });
    }

    // 4. Update in-memory Presence
    presenceManager.touchSession({
      sessionId: rawSessionId,
      websiteId: website.publicId,
      visitorId: visitor.id,
      status: VISITOR_STATUS.ONLINE,
      ip: effectiveIp,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      region: geo.region,
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      deviceType: ua.deviceType,
      screenResolution,
      currentPage: sanitizeUrl(currentPage),
      pageTitle,
      landingPage: sanitizeUrl(landingPage),
      referrer,
      channel,
      isReturning,
      startedAt: session.startedAt
    });

    return {
      success: true,
      visitorId: visitor.id,
      sessionId: session.sessionToken,
      isReturning
    };
  }

  /**
   * Process Page View
   */
  static async handlePageView(req, data) {
    const { websiteId, visitorId: rawVid, sessionId: rawSid, url, path, title, referrer } = data;

    const website = await this.validateWebsite(websiteId, req.headers.origin);
    const cleanPath = sanitizeUrl(path || url || '/');
    const cleanUrl = sanitizeUrl(url || path || '/');
    const cleanTitle = (title || 'Untitled').substring(0, 200);

    const nowIso = new Date().toISOString();

    // Find session
    const session = await db.visitorSession.findFirst({
      where: { sessionToken: rawSid }
    });

    const visitor = await db.visitor.findFirst({
      where: { websiteId: website.publicId, anonymousId: rawVid }
    });

    if (session) {
      // Calculate duration since session start
      const startedMs = new Date(session.startedAt).getTime();
      const durationSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

      await db.visitorSession.update({
        where: { id: session.id },
        data: {
          lastActivityAt: nowIso,
          durationSeconds,
          pageViewCount: (session.pageViewCount || 0) + 1,
          exitPage: cleanPath,
          status: 'ONLINE'
        }
      });
    }

    // Record PageView
    const pageView = await db.pageView.create({
      data: {
        websiteId: website.publicId,
        sessionId: session ? session.id : rawSid,
        visitorId: visitor ? visitor.id : rawVid,
        url: cleanUrl,
        path: cleanPath,
        title: cleanTitle,
        referrer: referrer || 'Direct',
        timestamp: nowIso
      }
    });

    // Update Presence with new page
    presenceManager.touchSession({
      sessionId: rawSid,
      websiteId: website.publicId,
      visitorId: visitor?.id || rawVid,
      currentPage: cleanPath,
      pageTitle: cleanTitle,
      status: VISITOR_STATUS.ONLINE,
      isNewPageView: true
    });

    // Emit real-time pageview event
    emitToWebsite(website.publicId, SOCKET_EVENTS.VISITOR_PAGEVIEW, {
      sessionId: rawSid,
      visitorId: visitor?.id || rawVid,
      path: cleanPath,
      title: cleanTitle,
      referrer: referrer || 'Direct',
      timestamp: nowIso
    });

    return { success: true, pageViewId: pageView.id };
  }

  /**
   * Process Periodic Heartbeat
   */
  static async handleHeartbeat(req, data) {
    const { websiteId, sessionId: rawSid, visitorId: rawVid, currentPage, pageTitle, status } = data;

    const session = await db.visitorSession.findFirst({
      where: { sessionToken: rawSid }
    });

    if (session) {
      const nowIso = new Date().toISOString();
      const startedMs = new Date(session.startedAt).getTime();
      const durationSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

      await db.visitorSession.update({
        where: { id: session.id },
        data: {
          lastActivityAt: nowIso,
          durationSeconds,
          status: status === 'idle' ? 'IDLE' : 'ONLINE'
        }
      });
    }

    presenceManager.touchSession({
      sessionId: rawSid,
      websiteId,
      visitorId: rawVid,
      currentPage: currentPage ? sanitizeUrl(currentPage) : undefined,
      pageTitle,
      status: status === 'idle' ? VISITOR_STATUS.IDLE : VISITOR_STATUS.ONLINE
    });

    return { success: true };
  }

  /**
   * Process Custom Business Event
   */
  static async handleEvent(req, data) {
    const { websiteId, visitorId: rawVid, sessionId: rawSid, eventName, properties } = data;
    const website = await this.validateWebsite(websiteId, req.headers.origin);

    const session = await db.visitorSession.findFirst({ where: { sessionToken: rawSid } });
    const visitor = await db.visitor.findFirst({ where: { websiteId: website.publicId, anonymousId: rawVid } });

    const nowIso = new Date().toISOString();

    const eventRecord = await db.visitorEvent.create({
      data: {
        websiteId: website.publicId,
        sessionId: session ? session.id : rawSid,
        visitorId: visitor ? visitor.id : rawVid,
        eventName: (eventName || 'custom_event').substring(0, 100),
        properties: typeof properties === 'object' ? JSON.stringify(properties) : '{}',
        timestamp: nowIso
      }
    });

    // Broadcast to real-time dashboard
    emitToWebsite(website.publicId, SOCKET_EVENTS.VISITOR_EVENT, {
      id: eventRecord.id,
      sessionId: rawSid,
      visitorId: visitor ? visitor.id : rawVid,
      eventName,
      properties,
      timestamp: nowIso
    });

    return { success: true, eventId: eventRecord.id };
  }

  /**
   * Process Explicit Exit / Session End (Beacon)
   */
  static async handleSessionEnd(req, data) {
    const { sessionId: rawSid } = data;
    if (rawSid) {
      await presenceManager.setSessionOffline(rawSid);
    }
    return { success: true };
  }
}
