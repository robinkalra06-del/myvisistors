import { VisitorService } from '../services/visitor.service.js';

export class VisitorController {
  static async getLiveVisitors(req, res, next) {
    try {
      const websiteId = req.query.websiteId;
      if (!websiteId) {
        return res.status(400).json({ success: false, error: { message: 'websiteId query parameter is required' } });
      }
      const visitors = VisitorService.getLiveVisitors(websiteId);
      res.json({ success: true, data: visitors });
    } catch (err) {
      next(err);
    }
  }

  static async getVisitorHistory(req, res, next) {
    try {
      const websiteId = req.query.websiteId;
      if (!websiteId) {
        return res.status(400).json({ success: false, error: { message: 'websiteId query parameter is required' } });
      }
      const history = await VisitorService.getVisitorHistory(websiteId, req.query);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }

  static async getVisitorDetail(req, res, next) {
    try {
      const { id } = req.params;
      const websiteId = req.query.websiteId;
      if (!websiteId) {
        return res.status(400).json({ success: false, error: { message: 'websiteId query parameter is required' } });
      }
      const profile = await VisitorService.getVisitorProfile(websiteId, id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}
