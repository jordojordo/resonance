import { Router } from 'express';

import UsersController from '@server/controllers/UsersController';

const router = Router();

router.get('/', UsersController.getUsers);
router.get('/stats', UsersController.getStats);
router.post('/export', UsersController.exportUsers);
router.post('/import', UsersController.importUsers);
router.put('/bulk', UsersController.bulkUpdate);
router.get('/:id', UsersController.getUser);
router.put('/:id', UsersController.updateUser);
router.delete('/', UsersController.deleteUsers);

export default router;
