import { db } from '../config/database.js';
import { presenceManager } from '../sockets/visitorPresence.js';

export class AnalyticsService {
  /**
   * Helper to parse time range filters
   */
  static getDateFilter(range = '7d') {
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  }

  /**
   * Main Dashboard KPI Overview
   */
  static async getOverview(websiteId, range = '7d') {
    const { startDate } = this.getDateFilter(range);

    const sessions = await db.visitorSession.findMany({
      where: { websiteId }
    });

    const pageViews = await db.pageView.findMany({
      where: { websiteId }
    });

    const visitors = await db.visitor.findMany({
      where: { websiteId }
    });

    const liveVisitors = presenceManager.getLiveVisitors(websiteId);

    // Calculate Today's metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const todaySessions = sessions.filter(s => s.startedAt >= todayIso);
    const todayPageViews = pageViews.filter(pv => pv.timestamp >= todayIso);

    // Bounce rate: sessions with only 1 pageview
    const totalSessionsCount = sessions.length || 1;
    const bouncedSessions = sessions.filter(s => (s.pageViewCount || 1) <= 1).length;
    const bounceRate = Math.round((bouncedSessions / totalSessionsCount) * 100);

    // Average session duration
    const totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    const avgSessionDuration = Math.round(totalDurationSeconds / totalSessionsCount);

    // Average pages per session
    const avgPagesPerSession = (pageViews.length / totalSessionsCount).toFixed(1);

    // New vs Returning visitors
    const returningCount = visitors.filter(v => v.isReturning).length;
    const newCount = visitors.length - returningCount;

    return {
      totalVisitorsToday: todaySessions.length,
      currentlyOnline: liveVisitors.length,
      totalPageViewsToday: todayPageViews.length,
      totalPageViewsAllTime: pageViews.length,
      uniqueVisitors: visitors.length,
      avgSessionDurationSeconds: avgSessionDuration,
      avgPagesPerSession: parseFloat(avgPagesPerSession) || 1.0,
      bounceRatePercentage: bounceRate,
      newVisitors: newCount,
      returningVisitors: returningCount,
      timeRange: range
    };
  }

  /**
   * Time-Series Traffic Trends (Hourly / Daily)
   */
  static async getTrafficTrends(websiteId, range = '7d') {
    const { startDate } = this.getDateFilter(range);
    const sessions = await db.visitorSession.findMany({ where: { websiteId } });
    const pageViews = await db.pageView.findMany({ where: { websiteId } });

    // Group by hour or day
    const trendMap = new Map();

    // Default 7 days buckets
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, { date: key, visitors: 0, pageviews: 0, sessions: 0 });
    }

    sessions.forEach(s => {
      if (s.startedAt) {
        const key = s.startedAt.split('T')[0];
        if (trendMap.has(key)) {
          const item = trendMap.get(key);
          item.visitors++;
          item.sessions++;
        }
      }
    });

    pageViews.forEach(pv => {
      if (pv.timestamp) {
        const key = pv.timestamp.split('T')[0];
        if (trendMap.has(key)) {
          const item = trendMap.get(key);
          item.pageviews++;
        }
      }
    });

    return Array.from(trendMap.values());
  }

  /**
   * Geographic Breakdown
   */
  static async getGeography(websiteId) {
    const sessions = await db.visitorSession.findMany({ where: { websiteId } });
    const countryMap = new Map();
    const cityMap = new Map();

    const total = sessions.length || 1;

    sessions.forEach(s => {
      const country = s.country || 'Unknown';
      const code = s.countryCode || 'XX';
      const city = s.city || 'Unknown';

      // Countries
      if (!countryMap.has(code)) {
        countryMap.set(code, { country, code, visitors: 0, percentage: 0 });
      }
      countryMap.get(code).visitors++;

      // Cities
      if (city !== 'Unknown') {
        const cityKey = `${city}, ${country}`;
        cityMap.set(cityKey, (cityMap.get(cityKey) || 0) + 1);
      }
    });

    const countries = Array.from(countryMap.values()).map(c => ({
      ...c,
      percentage: Math.round((c.visitors / total) * 100)
    })).sort((a, b) => b.visitors - a.visitors);

    const cities = Array.from(cityMap.entries()).map(([city, visitors]) => ({
      city,
      visitors
    })).sort((a, b) => b.visitors - a.visitors).slice(0, 10);

    return { countries, cities };
  }

  /**
   * Devices, Browsers, and OS Breakdown
   */
  static async getTechnology(websiteId) {
    const sessions = await db.visitorSession.findMany({ where: { websiteId } });
    const total = sessions.length || 1;

    const deviceMap = { desktop: 0, mobile: 0, tablet: 0 };
    const browserMap = new Map();
    const osMap = new Map();

    sessions.forEach(s => {
      const dev = (s.deviceType || 'desktop').toLowerCase();
      if (deviceMap[dev] !== undefined) deviceMap[dev]++;
      else deviceMap.desktop++;

      const browser = s.browser || 'Unknown';
      browserMap.set(browser, (browserMap.get(browser) || 0) + 1);

      const os = s.os || 'Unknown';
      osMap.set(os, (osMap.get(os) || 0) + 1);
    });

    return {
      devices: [
        { name: 'Desktop', count: deviceMap.desktop, percentage: Math.round((deviceMap.desktop / total) * 100) },
        { name: 'Mobile', count: deviceMap.mobile, percentage: Math.round((deviceMap.mobile / total) * 100) },
        { name: 'Tablet', count: deviceMap.tablet, percentage: Math.round((deviceMap.tablet / total) * 100) }
      ],
      browsers: Array.from(browserMap.entries()).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100)
      })).sort((a, b) => b.count - a.count),
      operatingSystems: Array.from(osMap.entries()).map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100)
      })).sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Acquisition & Referrers Breakdown
   */
  static async getAcquisition(websiteId) {
    const sessions = await db.visitorSession.findMany({ where: { websiteId } });
    const total = sessions.length || 1;

    const channelMap = {
      Direct: 0,
      'Organic Search': 0,
      Social: 0,
      Referral: 0,
      Campaign: 0
    };

    const referrerMap = new Map();

    sessions.forEach(s => {
      const ch = s.channel || 'Direct';
      if (channelMap[ch] !== undefined) channelMap[ch]++;
      else channelMap.Direct++;

      const ref = s.referrer || 'Direct';
      referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);
    });

    const channels = Object.entries(channelMap).map(([name, count]) => ({
      channel: name,
      count,
      percentage: Math.round((count / total) * 100)
    })).sort((a, b) => b.count - a.count);

    const referrers = Array.from(referrerMap.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / total) * 100)
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    return { channels, referrers };
  }

  /**
   * Top Visited Pages, Entry Pages, Exit Pages
   */
  static async getPages(websiteId) {
    const pageViews = await db.pageView.findMany({ where: { websiteId } });
    const sessions = await db.visitorSession.findMany({ where: { websiteId } });

    const totalViews = pageViews.length || 1;
    const pageMap = new Map();
    const landingMap = new Map();
    const exitMap = new Map();

    pageViews.forEach(pv => {
      const path = pv.path || '/';
      const existing = pageMap.get(path) || { path, title: pv.title, views: 0 };
      existing.views++;
      pageMap.set(path, existing);
    });

    sessions.forEach(s => {
      if (s.landingPage) {
        landingMap.set(s.landingPage, (landingMap.get(s.landingPage) || 0) + 1);
      }
      if (s.exitPage) {
        exitMap.set(s.exitPage, (exitMap.get(s.exitPage) || 0) + 1);
      }
    });

    const topPages = Array.from(pageMap.values()).map(p => ({
      ...p,
      percentage: Math.round((p.views / totalViews) * 100)
    })).sort((a, b) => b.views - a.views).slice(0, 15);

    const landingPages = Array.from(landingMap.entries()).map(([path, count]) => ({
      path,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    const exitPages = Array.from(exitMap.entries()).map(([path, count]) => ({
      path,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    return { topPages, landingPages, exitPages };
  }

  /**
   * Custom Events Breakdown
   */
  static async getEvents(websiteId) {
    const events = await db.visitorEvent.findMany({ where: { websiteId } });
    const eventCounts = new Map();

    events.forEach(evt => {
      const name = evt.eventName || 'unnamed';
      eventCounts.set(name, (eventCounts.get(name) || 0) + 1);
    });

    const topEvents = Array.from(eventCounts.entries()).map(([name, count]) => ({
      eventName: name,
      count
    })).sort((a, b) => b.count - a.count);

    return {
      totalEvents: events.length,
      topEvents,
      recentEvents: events.slice(0, 25).map(e => ({
        id: e.id,
        eventName: e.eventName,
        properties: typeof e.properties === 'string' ? JSON.parse(e.properties) : e.properties,
        timestamp: e.timestamp
      }))
    };
  }

  /**
   * Generate CSV export
   */
  static async generateCsv(websiteId, type = 'traffic') {
    if (type === 'pages') {
      const { topPages } = await this.getPages(websiteId);
      let csv = 'Path,Title,Page Views,Percentage\n';
      topPages.forEach(p => {
        csv += `"${p.path}","${(p.title || '').replace(/"/g, '""')}",${p.views},${p.percentage}%\n`;
      });
      return csv;
    }

    if (type === 'visitors') {
      const sessions = await db.visitorSession.findMany({ where: { websiteId }, take: 1000 });
      let csv = 'Session ID,Visitor ID,Country,City,Browser,OS,Device,Duration (s),Page Views,Started At\n';
      sessions.forEach(s => {
        csv += `"${s.sessionToken}","${s.visitorId}","${s.country}","${s.city}","${s.browser}","${s.os}","${s.deviceType}",${s.durationSeconds},${s.pageViewCount},"${s.startedAt}"\n`;
      });
      return csv;
    }

    // Default: Traffic
    const trends = await this.getTrafficTrends(websiteId, '30d');
    let csv = 'Date,Unique Visitors,Total Sessions,Page Views\n';
    trends.forEach(t => {
      csv += `"${t.date}",${t.visitors},${t.sessions},${t.pageviews}\n`;
    });
    return csv;
  }
}
