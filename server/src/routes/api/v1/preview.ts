import { Router } from 'express';

import PreviewController from '@server/controllers/PreviewController';

const router = Router();

router.get('/', PreviewController.getPreview);

export default router;
