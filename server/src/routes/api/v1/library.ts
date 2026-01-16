import { Router } from 'express';

import LibraryController from '@server/controllers/LibraryController';

const router = Router();

router.get('/stats', LibraryController.getStats);
router.post('/sync', LibraryController.triggerSync);

export default router;
