import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export class NotificationService {
  /**
   * Dispatch notification to user
   */
  static async sendNotification({ userId, websiteId, type, title, message, data = {} }) {
    const notif = await db.notification.create({
      data: {
        userId,
        websiteId,
        type,
        title,
        message,
        data
      }
    });

    logger.info(`Notification sent to user ${userId}: [${type}] ${title}`);

    // Check user preference for email notification
    const pref = await db.userPreference.findUnique({ where: { userId } });
    if (pref && pref.emailAlerts && config.smtp.user) {
      this.sendEmailAlert(userId, title, message).catch(err => {
        logger.warn('Failed to send email alert:', err.message);
      });
    }

    return notif;
  }

  /**
   * Send email alert using Nodemailer
   */
  static async sendEmailAlert(userId, title, message) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) return;

    logger.info(`[Email Dispatcher] Sending email to ${user.email} - "${title}"`);
    // Simulated or real SMTP transporter can be called here
  }

  static async getUserNotifications(userId) {
    return db.notification.findMany({
      where: { userId },
      take: 50
    });
  }

  static async markAsRead(notificationId) {
    return db.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  static async updatePreferences(userId, preferences) {
    return db.userPreference.upsert({
      where: { userId },
      update: preferences,
      create: { userId, ...preferences }
    });
  }
}
