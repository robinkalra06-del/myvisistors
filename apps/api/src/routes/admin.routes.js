import { Router } from '../utils/expressAdapter.js';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.listUsers);
router.post('/users/:id/suspend', AdminController.toggleSuspension);
router.get('/audit-logs', AdminController.getAuditLogs);
router.post('/retention-cleanup', AdminController.runRetention);

export default router;
