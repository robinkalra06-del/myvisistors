import { db } from '../config/database.js';
import { hashPassword, verifyPassword, signJwt, generateRandomToken } from '../utils/crypto.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  /**
   * Register a new user and create an initial organization
   */
  static async register({ email, password, name }) {
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      const err = new Error('A user with this email address already exists.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await hashPassword(password);
    const userId = 'usr_' + generateRandomToken(8);
    const isFirstUser = (await db.user.count()) === 0;

    const user = await db.user.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: isFirstUser ? 'SUPER_ADMIN' : 'OWNER',
        isEmailVerified: true
      }
    });

    // Create personal organization for user
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + generateRandomToken(4);
    const org = await db.organization.create({
      data: {
        name: `${name}'s Organization`,
        slug,
        ownerId: user.id
      }
    });

    await db.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER'
      }
    });

    // Create default preference
    await db.userPreference.upsert({
      where: { userId: user.id },
      create: { theme: 'dark', timezone: 'UTC', emailAlerts: true },
      update: {}
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        resourceType: 'User',
        resourceId: user.id
      }
    });

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, config.jwtSecret);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      organization: org,
      token
    };
  }

  /**
   * Login user
   */
  static async login({ email, password }) {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    if (user.isSuspended) {
      const err = new Error('Your account has been suspended. Please contact support.');
      err.statusCode = 403;
      throw err;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const token = signJwt({ userId: user.id, email: user.email, role: user.role }, config.jwtSecret);

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'User',
        resourceId: user.id
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      token
    };
  }

  /**
   * Get authenticated user profile with organization and preferences
   */
  static async getMe(userId) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const preferences = await db.userPreference.findUnique({ where: { userId } });
    const memberships = await db.organizationMember.findMany({ where: { userId } });
    const org = await db.organization.findFirst({ where: { ownerId: userId } });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      preferences: preferences || { theme: 'dark', timezone: 'UTC', emailAlerts: true },
      organization: org || (memberships[0] ? { id: memberships[0].organizationId } : null)
    };
  }

  /**
   * Request password reset token
   */
  static async forgotPassword(email) {
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Return success to avoid email enumeration
      return { message: 'If an account exists with this email, a reset instructions link has been sent.' };
    }

    const resetToken = generateRandomToken(32);
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires: expires }
    });

    logger.info(`Password reset requested for ${user.email}. Token: ${resetToken}`);
    return {
      message: 'If an account exists with this email, a reset instructions link has been sent.',
      resetToken: config.isProduction ? undefined : resetToken // Expose in dev for easy testing
    };
  }

  /**
   * Reset password with token
   */
  static async resetPassword({ token, newPassword }) {
    const user = await db.user.findFirst({ where: { resetToken: token } });
    if (!user) {
      const err = new Error('Invalid or expired password reset token.');
      err.statusCode = 400;
      throw err;
    }

    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    return { success: true, message: 'Password has been successfully updated.' };
  }

  /**
   * Change password while logged in
   */
  static async changePassword(userId, { currentPassword, newPassword }) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const match = await verifyPassword(currentPassword, user.passwordHash);
    if (!match) {
      const err = new Error('Current password is incorrect.');
      err.statusCode = 400;
      throw err;
    }

    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return { success: true };
  }
}
