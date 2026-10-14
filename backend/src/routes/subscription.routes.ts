import { Router } from 'express';
import {
  getPublicPlans,
  getCurrentSubscription,
  upgradePlan,
} from '../controllers/subscription.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/plans', getPublicPlans);
router.get('/current', requireAuth, getCurrentSubscription);
router.post('/upgrade', requireAuth, upgradePlan);

export default router;
