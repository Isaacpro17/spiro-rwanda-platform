import express from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', notificationController.getNotifications);
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markAsRead);

export default router;
