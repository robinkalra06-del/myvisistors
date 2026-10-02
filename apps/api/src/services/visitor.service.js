import { db } from '../config/database.js';
import { presenceManager } from '../sockets/visitorPresence.js';

export class VisitorService {
  /**
   * Get currently active/online visitors for a website
   */
  static getLiveVisitors(websiteId) {
    return presenceManager.getLiveVisitors(websiteId);
  }

  /**
   * Get historical visitor sessions with search and filters
   */
  static async getVisitorHistory(websiteId, options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      country = '',
      device = ''
    } = options;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const sessions = await db.visitorSession.findMany({
      where: {
        websiteId,
        ...(status ? { status: status.toUpperCase() } : {})
      },
      take,
      skip
    });

    let filtered = sessions;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s =>
        (s.sessionToken && s.sessionToken.toLowerCase().includes(q)) ||
        (s.visitorId && s.visitorId.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.country && s.country.toLowerCase().includes(q))
      );
    }
    if (country) {
      filtered = filtered.filter(s => s.countryCode === country.toUpperCase() || s.country === country);
    }
    if (device) {
      filtered = filtered.filter(s => s.deviceType === device.toLowerCase());
    }

    const total = await db.visitorSession.count({ where: { websiteId } });

    return {
      sessions: filtered,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    };
  }

  /**
   * Get comprehensive visitor profile & chronological activity timeline
   */
  static async getVisitorProfile(websiteId, visitorId) {
    const visitor = await db.visitor.findFirst({
      where: {
        websiteId,
        id: visitorId,
        anonymousId: visitorId
      }
    });

    if (!visitor) {
      const err = new Error('Visitor not found');
      err.statusCode = 404;
      throw err;
    }

    // Fetch all sessions for this visitor
    const sessions = await db.visitorSession.findMany({
      where: { visitorId: visitor.id, websiteId }
    });

    // Fetch pageviews and events across their sessions
    const pageViews = await db.pageView.findMany({
      where: { visitorId: visitor.id, websiteId },
      take: 150
    });

    const events = await db.visitorEvent.findMany({
      where: { visitorId: visitor.id, websiteId },
      take: 100
    });

    // Build unified chronological activity timeline
    const timeline = [];

    pageViews.forEach(pv => {
      timeline.push({
        id: pv.id,
        type: 'pageview',
        title: `Visited page "${pv.title || pv.path}"`,
        path: pv.path,
        url: pv.url,
        referrer: pv.referrer,
        timestamp: pv.timestamp
      });
    });

    events.forEach(evt => {
      let parsedProps = {};
      try {
        parsedProps = typeof evt.properties === 'string' ? JSON.parse(evt.properties) : evt.properties;
      } catch {}

      timeline.push({
        id: evt.id,
        type: 'event',
        title: `Triggered action "${evt.eventName}"`,
        eventName: evt.eventName,
        properties: parsedProps,
        timestamp: evt.timestamp
      });
    });

    // Sort timeline ascending chronologically
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate aggregated metrics
    const totalDuration = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const totalPageViews = pageViews.length;

    // Check if currently online in memory
    const activeVisitors = presenceManager.getLiveVisitors(websiteId);
    const isCurrentlyOnline = activeVisitors.some(v => v.id === visitor.id);

    return {
      visitor: {
        ...visitor,
        isCurrentlyOnline,
        totalDurationSeconds: totalDuration,
        totalPageViews
      },
      sessions,
      timeline,
      pageViews,
      events
    };
  }
}
