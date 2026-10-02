import { Router } from '../utils/expressAdapter.js';
import { TrackController } from '../controllers/track.controller.js';
import { rateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

const trackLimiter = rateLimiter({ windowMs: 60 * 1000, max: 1000 });
router.use(trackLimiter);

router.post('/session', TrackController.handleSession);
router.post('/pageview', TrackController.handlePageView);
router.post('/heartbeat', TrackController.handleHeartbeat);
router.post('/event', TrackController.handleEvent);
router.post('/session-end', TrackController.handleSessionEnd);

export default router;
