import { Router } from '../utils/expressAdapter.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/overview', AnalyticsController.getOverview);
router.get('/traffic', AnalyticsController.getTraffic);
router.get('/geography', AnalyticsController.getGeography);
router.get('/technology', AnalyticsController.getTechnology);
router.get('/devices', AnalyticsController.getTechnology);
router.get('/acquisition', AnalyticsController.getAcquisition);
router.get('/referrers', AnalyticsController.getAcquisition);
router.get('/pages', AnalyticsController.getPages);
router.get('/events', AnalyticsController.getEvents);
router.get('/export', AnalyticsController.exportCsv);

export default router;
