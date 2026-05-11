/**
 * @file queue.js
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as swapController from '../controllers/swapController.js';

const router = Router();
router.use(authenticate);

router.post('/:stationId/join', swapController.joinQueue);
router.delete('/:stationId/leave', swapController.leaveQueue);
router.get('/:stationId', swapController.getQueueStatus);

export default router;
