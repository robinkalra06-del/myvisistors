import { verifyJwt } from '../utils/crypto.js';
import { config } from '../config/index.js';
import { db } from '../config/database.js';

export async function authenticate(req, res, next) {
  let token = null;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Check cookies
  if (!token && req.cookies && req.cookies.livetrack_token) {
    token = req.cookies.livetrack_token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. No token provided.', code: 'UNAUTHORIZED' }
    });
  }

  const payload = verifyJwt(token, config.jwtSecret);
  if (!payload || !payload.userId) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired session token.', code: 'TOKEN_INVALID' }
    });
  }

  const user = await db.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.isSuspended) {
    return res.status(403).json({
      success: false,
      error: { message: 'User account not found or suspended.', code: 'USER_SUSPENDED' }
    });
  }

  req.user = user;
  next();
}

/**
 * Check if authenticated user has required role
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
    }
    if (req.user.role === 'SUPER_ADMIN' || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden. Insufficient permissions.', code: 'FORBIDDEN' }
    });
  };
}

/**
 * Verify user has access to a specific website
 */
export async function requireWebsiteAccess(req, res, next) {
  const websiteId = req.params.websiteId || req.params.id || req.query.websiteId || req.body.websiteId;
  if (!websiteId) {
    return res.status(400).json({ success: false, error: { message: 'Website ID is required' } });
  }

  // Super Admin can access all websites
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Check website ownership or organization membership
  const website = await db.website.findUnique({ where: { id: websiteId, publicId: websiteId } });
  if (!website) {
    return res.status(404).json({ success: false, error: { message: 'Website not found' } });
  }

  const org = await db.organization.findUnique({ where: { id: website.organizationId } });
  if (org && org.ownerId === req.user.id) {
    req.website = website;
    return next();
  }

  const memberships = await db.organizationMember.findMany({
    where: { organizationId: website.organizationId, userId: req.user.id }
  });

  if (memberships && memberships.length > 0) {
    req.website = website;
    req.membershipRole = memberships[0].role;
    return next();
  }

  return res.status(403).json({
    success: false,
    error: { message: 'You do not have permission to view or manage this website.', code: 'FORBIDDEN' }
  });
}
