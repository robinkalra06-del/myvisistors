import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const notifs = await NotificationService.getUserNotifications(req.user.id);
      res.json({ success: true, data: notifs });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      await NotificationService.markAsRead(req.params.id);
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req, res, next) {
    try {
      const updated = await NotificationService.updatePreferences(req.user.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
