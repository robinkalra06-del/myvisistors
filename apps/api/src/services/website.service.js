import { db } from '../config/database.js';
import { generateRandomToken } from '../utils/crypto.js';
import { presenceManager } from '../sockets/visitorPresence.js';
import { config } from '../config/index.js';

export class WebsiteService {
  /**
   * List websites accessible to a user
   */
  static async getUserWebsites(userId) {
    const org = await db.organization.findFirst({ where: { ownerId: userId } });
    const memberships = await db.organizationMember.findMany({ where: { userId } });
    const orgIds = [];
    if (org) orgIds.push(org.id);
    for (const m of memberships) {
      if (!orgIds.includes(m.organizationId)) orgIds.push(m.organizationId);
    }

    const allWebsites = [];
    for (const orgId of orgIds) {
      const sites = await db.website.findMany({ where: { organizationId: orgId } });
      allWebsites.push(...sites);
    }

    // Augment with real-time stats
    return allWebsites.map(site => {
      const liveVisitors = presenceManager.getLiveVisitors(site.publicId).length;
      return {
        ...site,
        activeVisitors: liveVisitors,
        excludedUrls: typeof site.excludedUrls === 'string' ? JSON.parse(site.excludedUrls || '[]') : site.excludedUrls
      };
    });
  }

  /**
   * Get website details with tracking snippet
   */
  static async getWebsiteById(websiteId) {
    const website = await db.website.findFirst({
      where: { id: websiteId, publicId: websiteId }
    });
    if (!website) {
      const err = new Error('Website not found');
      err.statusCode = 404;
      throw err;
    }

    const key = await db.trackingKey.findFirst({
      where: { websiteId: website.id, isRevoked: false }
    });

    const liveVisitors = presenceManager.getLiveVisitors(website.publicId).length;
    const totalVisitors = await db.visitor.count({ where: { websiteId: website.publicId } });
    const totalPageViews = await db.pageView.count({ where: { websiteId: website.publicId } });

    const snippet = `<!-- LiveTrack Real-Time Analytics -->
<script>
  window.LiveTrackConfig = {
    siteId: "${website.publicId}"
  };
</script>
<script async src="${config.apiUrl}/tracker.js"></script>`;

    return {
      ...website,
      trackingKey: key ? key.key : null,
      activeVisitors: liveVisitors,
      totalVisitors,
      totalPageViews,
      trackingSnippet: snippet,
      excludedUrls: typeof website.excludedUrls === 'string' ? JSON.parse(website.excludedUrls || '[]') : website.excludedUrls
    };
  }

  /**
   * Create a new website with tracking key
   */
  static async createWebsite(userId, { name, domain, allowedOrigins, retentionDays, anonymizeIp, excludedUrls }) {
    let org = await db.organization.findFirst({ where: { ownerId: userId } });
    if (!org) {
      const memberships = await db.organizationMember.findMany({ where: { userId } });
      if (memberships.length > 0) {
        org = await db.organization.findUnique({ where: { id: memberships[0].organizationId } });
      }
    }

    if (!org) {
      const err = new Error('User does not have an active organization.');
      err.statusCode = 400;
      throw err;
    }

    const publicId = 'site_' + generateRandomToken(6);
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();

    const website = await db.website.create({
      data: {
        publicId,
        organizationId: org.id,
        name,
        domain: cleanDomain,
        allowedOrigins: allowedOrigins || '*',
        retentionDays: retentionDays ? parseInt(retentionDays, 10) : 90,
        anonymizeIp: anonymizeIp !== false,
        excludedUrls: excludedUrls || [],
        isTrackingActive: true
      }
    });

    // Generate initial tracking key
    const rawKey = 'tk_live_' + generateRandomToken(16);
    await db.trackingKey.create({
      data: {
        websiteId: website.id,
        key: rawKey,
        name: 'Default Tracking Key'
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        action: 'WEBSITE_CREATED',
        resourceType: 'Website',
        resourceId: website.id,
        details: { domain: cleanDomain, publicId }
      }
    });

    return this.getWebsiteById(website.id);
  }

  /**
   * Update website settings
   */
  static async updateWebsite(websiteId, updates, userId) {
    const website = await db.website.findFirst({ where: { id: websiteId, publicId: websiteId } });
    if (!website) {
      const err = new Error('Website not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await db.website.update({
      where: { id: website.id },
      data: updates
    });

    await db.auditLog.create({
      data: {
        userId,
        action: 'WEBSITE_UPDATED',
        resourceType: 'Website',
        resourceId: website.id
      }
    });

    return updated;
  }

  /**
   * Delete website and associated analytics data
   */
  static async deleteWebsite(websiteId, userId) {
    const website = await db.website.findFirst({ where: { id: websiteId, publicId: websiteId } });
    if (!website) {
      const err = new Error('Website not found');
      err.statusCode = 404;
      throw err;
    }

    await db.website.delete({ where: { id: website.id } });

    await db.auditLog.create({
      data: {
        userId,
        action: 'WEBSITE_DELETED',
        resourceType: 'Website',
        resourceId: website.id,
        details: { domain: website.domain }
      }
    });

    return { success: true };
  }

  /**
   * Regenerate tracking key
   */
  static async regenerateKey(websiteId, userId) {
    const website = await db.website.findFirst({ where: { id: websiteId, publicId: websiteId } });
    if (!website) throw new Error('Website not found');

    // Revoke old keys
    await db.trackingKey.update({
      where: { websiteId: website.id },
      data: { isRevoked: true }
    });

    // Create new key
    const newKey = 'tk_live_' + generateRandomToken(16);
    await db.trackingKey.create({
      data: {
        websiteId: website.id,
        key: newKey,
        name: 'Regenerated Key'
      }
    });

    await db.auditLog.create({
      data: {
        userId,
        action: 'TRACKING_KEY_REGENERATED',
        resourceType: 'Website',
        resourceId: website.id
      }
    });

    return { key: newKey };
  }

  /**
   * Verify installation
   */
  static async verifyInstallation(websiteId) {
    const website = await db.website.findFirst({ where: { id: websiteId, publicId: websiteId } });
    if (!website) throw new Error('Website not found');

    const recentPageViews = await db.pageView.findMany({
      where: { websiteId: website.publicId },
      take: 1
    });

    const isInstalled = Boolean(website.installedAt || recentPageViews.length > 0);

    return {
      isInstalled,
      lastPingAt: website.lastPingAt || (recentPageViews[0]?.timestamp) || null,
      installedAt: website.installedAt || null
    };
  }
}
