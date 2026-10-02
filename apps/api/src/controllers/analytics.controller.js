import { AnalyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  static async getOverview(req, res, next) {
    try {
      const { websiteId, range } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getOverview(websiteId, range);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getTraffic(req, res, next) {
    try {
      const { websiteId, range } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getTrafficTrends(websiteId, range);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getGeography(req, res, next) {
    try {
      const { websiteId } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getGeography(websiteId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getTechnology(req, res, next) {
    try {
      const { websiteId } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getTechnology(websiteId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getAcquisition(req, res, next) {
    try {
      const { websiteId } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getAcquisition(websiteId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getPages(req, res, next) {
    try {
      const { websiteId } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getPages(websiteId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getEvents(req, res, next) {
    try {
      const { websiteId } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const data = await AnalyticsService.getEvents(websiteId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async exportCsv(req, res, next) {
    try {
      const { websiteId, type = 'traffic' } = req.query;
      if (!websiteId) return res.status(400).json({ success: false, error: { message: 'websiteId is required' } });
      const csv = await AnalyticsService.generateCsv(websiteId, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="livetrack-${type}-${websiteId}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}
