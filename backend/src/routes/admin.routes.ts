import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  updateUserStatus,
  deleteUser,
  getLiveMeetings,
  terminateMeeting,
  updateSubscriptionPlan,
  getAuditLogs,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Protect all admin routes
router.use(requireAuth);
router.use(requireRole(UserRole.ADMIN));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.put('/users/:id', updateUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/meetings/live', getLiveMeetings);
router.post('/meetings/:id/terminate', terminateMeeting);
router.put('/plans/:id', updateSubscriptionPlan);
router.get('/audit-logs', getAuditLogs);

export default router;
