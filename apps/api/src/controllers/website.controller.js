import { WebsiteService } from '../services/website.service.js';

export class WebsiteController {
  static async listWebsites(req, res, next) {
    try {
      const websites = await WebsiteService.getUserWebsites(req.user.id);
      res.json({ success: true, data: websites });
    } catch (err) {
      next(err);
    }
  }

  static async getWebsite(req, res, next) {
    try {
      const website = await WebsiteService.getWebsiteById(req.params.id);
      res.json({ success: true, data: website });
    } catch (err) {
      next(err);
    }
  }

  static async createWebsite(req, res, next) {
    try {
      const { name, domain, allowedOrigins, retentionDays, anonymizeIp, excludedUrls } = req.body;
      if (!name || !domain) {
        return res.status(400).json({ success: false, error: { message: 'Name and domain are required' } });
      }
      const website = await WebsiteService.createWebsite(req.user.id, {
        name,
        domain,
        allowedOrigins,
        retentionDays,
        anonymizeIp,
        excludedUrls
      });
      res.status(201).json({ success: true, data: website });
    } catch (err) {
      next(err);
    }
  }

  static async updateWebsite(req, res, next) {
    try {
      const updated = await WebsiteService.updateWebsite(req.params.id, req.body, req.user.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async deleteWebsite(req, res, next) {
    try {
      await WebsiteService.deleteWebsite(req.params.id, req.user.id);
      res.json({ success: true, message: 'Website deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async regenerateKey(req, res, next) {
    try {
      const result = await WebsiteService.regenerateKey(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async verifyInstallation(req, res, next) {
    try {
      const result = await WebsiteService.verifyInstallation(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
