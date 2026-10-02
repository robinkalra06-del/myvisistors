import { db } from '../config/database.js';
import { getIo } from '../sockets/socketServer.js';
import os from 'node:os';

export class AdminService {
  /**
   * Platform-wide super admin metrics
   */
  static async getPlatformStats() {
    const totalUsers = await db.user.count();
    const totalWebsites = await db.website.count();
    const totalVisitors = await db.visitor.count();
    const totalSessions = await db.visitorSession.count();
    const totalPageViews = await db.pageView.count();

    const io = getIo();
    const socketConnections = io ? io.engine?.clientsCount || 0 : 0;

    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());

    return {
      totalUsers,
      totalWebsites,
      totalVisitors,
      totalSessions,
      totalPageViews,
      socketConnections,
      system: {
        uptimeSeconds,
        uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
        memoryRssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        platform: os.platform(),
        cpus: os.cpus().length,
        nodeVersion: process.version
      }
    };
  }

  /**
   * Platform users list
   */
  static async listUsers() {
    const users = await db.user.findMany();
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isSuspended: Boolean(u.isSuspended),
      createdAt: u.createdAt
    }));
  }

  /**
   * Suspend or unsuspend user
   */
  static async toggleUserSuspension(userId, suspend, adminUserId) {
    const user = await db.user.update({
      where: { id: userId },
      data: { isSuspended: suspend }
    });

    await db.auditLog.create({
      data: {
        userId: adminUserId,
        action: suspend ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        resourceType: 'User',
        resourceId: userId
      }
    });

    return { success: true, isSuspended: Boolean(user.isSuspended) };
  }

  /**
   * List platform audit logs
   */
  static async getAuditLogs(limit = 100) {
    return db.auditLog.findMany({ take: limit });
  }

  /**
   * Run automated data retention cleanup
   */
  static async runRetentionCleanup() {
    const websites = await db.website.findMany();
    let cleanedSessions = 0;

    for (const site of websites) {
      const days = site.retentionDays || 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffIso = cutoff.toISOString();

      // Delete old records
      if (db.sqliteDb) {
        db.run('DELETE FROM PageView WHERE websiteId = ? AND timestamp < ?', [site.publicId, cutoffIso]);
        db.run('DELETE FROM VisitorSession WHERE websiteId = ? AND startedAt < ?', [site.publicId, cutoffIso]);
        cleanedSessions++;
      }
    }

    return { success: true, message: `Retention policy enforced for ${websites.length} websites.` };
  }
}
