import { db } from '../config/database.js';
import { emitToWebsite } from './socketServer.js';
import { SOCKET_EVENTS, TIMEOUTS, VISITOR_STATUS } from '../../../../packages/shared/index.js';
import { logger } from '../utils/logger.js';

class VisitorPresenceManager {
  constructor() {
    // Map<sessionId, SessionPresenceState>
    this.activeSessions = new Map();
    this.sweepInterval = null;
  }

  start() {
    if (this.sweepInterval) clearInterval(this.sweepInterval);
    // Sweep every 10 seconds for idle/offline transitions
    this.sweepInterval = setInterval(() => this.sweepPresence(), 10000);
    if (this.sweepInterval.unref) this.sweepInterval.unref();
    logger.info('Visitor presence sweep engine running (interval: 10s)');
  }

  stop() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
  }

  /**
   * Register or update session presence
   */
  touchSession(sessionData) {
    const {
      sessionId,
      websiteId,
      visitorId,
      status = VISITOR_STATUS.ONLINE,
      ip,
      country,
      countryCode,
      city,
      region,
      browser,
      browserVersion,
      os,
      deviceType,
      screenResolution,
      currentPage,
      pageTitle,
      landingPage,
      referrer,
      channel,
      isReturning,
      startedAt
    } = sessionData;

    const now = Date.now();
    const existing = this.activeSessions.get(sessionId) || {};

    const updated = {
      ...existing,
      sessionId,
      websiteId,
      visitorId,
      status,
      ip: ip || existing.ip,
      country: country || existing.country || 'Unknown',
      countryCode: countryCode || existing.countryCode || 'XX',
      city: city || existing.city || 'Unknown',
      region: region || existing.region || '',
      browser: browser || existing.browser || 'Unknown',
      browserVersion: browserVersion || existing.browserVersion || '',
      os: os || existing.os || 'Unknown',
      deviceType: deviceType || existing.deviceType || 'desktop',
      screenResolution: screenResolution || existing.screenResolution || '1920x1080',
      currentPage: currentPage || existing.currentPage || '/',
      pageTitle: pageTitle || existing.pageTitle || 'Untitled',
      landingPage: landingPage || existing.landingPage || '/',
      referrer: referrer || existing.referrer || 'Direct',
      channel: channel || existing.channel || 'Direct',
      isReturning: isReturning !== undefined ? isReturning : existing.isReturning || false,
      startedAt: startedAt || existing.startedAt || new Date(now).toISOString(),
      lastActivityAt: new Date(now).toISOString(),
      lastSeenTimestamp: now,
      pageViews: (existing.pageViews || 0) + (sessionData.isNewPageView ? 1 : 0)
    };

    const isNew = !this.activeSessions.has(sessionId);
    this.activeSessions.set(sessionId, updated);

    // Broadcast real-time event to dashboard
    if (isNew) {
      emitToWebsite(websiteId, SOCKET_EVENTS.VISITOR_NEW, {
        visitor: this.formatVisitorRecord(updated)
      });
    } else {
      emitToWebsite(websiteId, SOCKET_EVENTS.VISITOR_UPDATE, {
        visitor: this.formatVisitorRecord(updated)
      });
    }

    return updated;
  }

  /**
   * Explicitly set session status (e.g. on beacon unload)
   */
  async setSessionOffline(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = VISITOR_STATUS.OFFLINE;
    const nowIso = new Date().toISOString();
    const startedMs = new Date(session.startedAt).getTime();
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));

    // Update in DB
    try {
      await db.visitorSession.update({
        where: { sessionToken: sessionId },
        data: {
          status: 'OFFLINE',
          endedAt: nowIso,
          durationSeconds
        }
      });
    } catch (err) {
      logger.error('Error updating offline session in DB:', err);
    }

    emitToWebsite(session.websiteId, SOCKET_EVENTS.VISITOR_OFFLINE, {
      sessionId,
      visitorId: session.visitorId,
      status: VISITOR_STATUS.OFFLINE,
      durationSeconds
    });

    // Remove from in-memory active list
    this.activeSessions.delete(sessionId);
  }

  /**
   * Periodic sweep checking idle and offline thresholds
   */
  async sweepPresence() {
    const now = Date.now();
    const toOffline = [];

    for (const [sessionId, state] of this.activeSessions.entries()) {
      const inactiveMs = now - state.lastSeenTimestamp;

      // 1. Check Offline (> 120s inactivity)
      if (inactiveMs >= TIMEOUTS.OFFLINE_THRESHOLD_MS) {
        toOffline.push(sessionId);
      }
      // 2. Check Idle (> 45s inactivity and currently online)
      else if (inactiveMs >= TIMEOUTS.IDLE_THRESHOLD_MS && state.status === VISITOR_STATUS.ONLINE) {
        state.status = VISITOR_STATUS.IDLE;
        emitToWebsite(state.websiteId, SOCKET_EVENTS.VISITOR_IDLE, {
          sessionId,
          visitorId: state.visitorId,
          status: VISITOR_STATUS.IDLE
        });

        // Update DB asynchronously
        db.visitorSession.update({
          where: { sessionToken: sessionId },
          data: { status: 'IDLE' }
        }).catch(() => {});
      }
    }

    // Process offline sessions
    for (const sid of toOffline) {
      await this.setSessionOffline(sid);
    }
  }

  /**
   * Get all live visitors for a given website
   */
  getLiveVisitors(websiteId) {
    const list = [];
    const now = Date.now();
    for (const state of this.activeSessions.values()) {
      if (state.websiteId === websiteId && state.status !== VISITOR_STATUS.OFFLINE) {
        const startedMs = new Date(state.startedAt).getTime();
        const durationMs = Math.max(0, now - startedMs);
        list.push({
          ...this.formatVisitorRecord(state),
          sessionDurationMs: durationMs,
          sessionDurationSeconds: Math.floor(durationMs / 1000)
        });
      }
    }
    return list;
  }

  /**
   * Format visitor record for safe client transmission
   */
  formatVisitorRecord(state) {
    const now = Date.now();
    const startedMs = new Date(state.startedAt).getTime();
    return {
      id: state.visitorId,
      sessionId: state.sessionId,
      websiteId: state.websiteId,
      status: state.status,
      ip: state.ip,
      country: state.country,
      countryCode: state.countryCode,
      city: state.city,
      region: state.region,
      browser: state.browser,
      browserVersion: state.browserVersion,
      os: state.os,
      deviceType: state.deviceType,
      screenResolution: state.screenResolution,
      currentPage: state.currentPage,
      pageTitle: state.pageTitle,
      landingPage: state.landingPage,
      referrer: state.referrer,
      channel: state.channel,
      isReturning: Boolean(state.isReturning),
      pageViews: state.pageViews || 1,
      startedAt: state.startedAt,
      lastActivityAt: state.lastActivityAt,
      sessionDurationMs: Math.max(0, now - startedMs),
      sessionDurationSeconds: Math.max(0, Math.floor((now - startedMs) / 1000))
    };
  }
}

export const presenceManager = new VisitorPresenceManager();
