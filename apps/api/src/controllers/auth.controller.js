import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: { message: 'Email, password, and name are required' } });
      }
      const result = await AuthService.register({ email, password, name });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: { message: 'Email and password are required' } });
      }
      const result = await AuthService.login({ email, password });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const profile = await AuthService.getMe(req.user.id);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword({ token, newPassword });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user.id, { currentPassword, newPassword });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
