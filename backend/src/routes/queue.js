/**
 * @file queue.js
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as swapController from '../controllers/swapController.js';

const router = Router();
router.use(authenticate);

// Rider: check own queue position (must be before /:stationId to avoid route collision)
router.get('/my-position', requireRole('rider'), swapController.getMyQueuePosition);

// All authenticated users: get station queue status
router.get('/:stationId', swapController.getQueueStatus);

// Rider: join / leave queue
router.post('/:stationId/join', requireRole('rider'), swapController.joinQueue);
router.delete('/:stationId/leave', requireRole('rider'), swapController.leaveQueue);

// Operator / admin: remove a specific rider from the queue
router.delete('/:stationId/riders/:riderId', requireRole('operator', 'admin'), swapController.removeRiderFromQueue);

export default router;
