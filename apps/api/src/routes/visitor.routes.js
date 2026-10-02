import { Router } from '../utils/expressAdapter.js';
import { VisitorController } from '../controllers/visitor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/live', VisitorController.getLiveVisitors);
router.get('/history', VisitorController.getVisitorHistory);
router.get('/:id', VisitorController.getVisitorDetail);

export default router;
