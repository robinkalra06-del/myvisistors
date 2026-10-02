import { AdminService } from '../services/admin.service.js';

export class AdminController {
  static async getStats(req, res, next) {
    try {
      const stats = await AdminService.getPlatformStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(req, res, next) {
    try {
      const users = await AdminService.listUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  static async toggleSuspension(req, res, next) {
    try {
      const { id } = req.params;
      const { suspend } = req.body;
      const result = await AdminService.toggleUserSuspension(id, Boolean(suspend), req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req, res, next) {
    try {
      const logs = await AdminService.getAuditLogs(100);
      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }

  static async runRetention(req, res, next) {
    try {
      const result = await AdminService.runRetentionCleanup();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
