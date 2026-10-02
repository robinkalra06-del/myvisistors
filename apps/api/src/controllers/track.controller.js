import { TrackService } from '../services/track.service.js';

export class TrackController {
  static async handleSession(req, res, next) {
    try {
      const result = await TrackService.handleSession(req, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async handlePageView(req, res, next) {
    try {
      const result = await TrackService.handlePageView(req, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async handleHeartbeat(req, res, next) {
    try {
      const result = await TrackService.handleHeartbeat(req, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async handleEvent(req, res, next) {
    try {
      const result = await TrackService.handleEvent(req, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async handleSessionEnd(req, res, next) {
    try {
      const result = await TrackService.handleSessionEnd(req, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
