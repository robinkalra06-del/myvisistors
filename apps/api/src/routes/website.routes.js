import { Router } from '../utils/expressAdapter.js';
import { WebsiteController } from '../controllers/website.controller.js';
import { authenticate, requireWebsiteAccess } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', WebsiteController.listWebsites);
router.post('/', WebsiteController.createWebsite);
router.get('/:id', requireWebsiteAccess, WebsiteController.getWebsite);
router.patch('/:id', requireWebsiteAccess, WebsiteController.updateWebsite);
router.delete('/:id', requireWebsiteAccess, WebsiteController.deleteWebsite);
router.post('/:id/regenerate-key', requireWebsiteAccess, WebsiteController.regenerateKey);
router.get('/:id/verify', requireWebsiteAccess, WebsiteController.verifyInstallation);

export default router;
