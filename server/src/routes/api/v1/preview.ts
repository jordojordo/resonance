import { Router } from 'express';

import PreviewController from '@server/controllers/PreviewController';

const router = Router();

router.get('/', PreviewController.getPreview);
router.get('/album', PreviewController.getAlbumPreview);

export default router;
