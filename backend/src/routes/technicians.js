/**
 * @file routes/technicians.js
 * @description Technician-specific routes: tasks and assigned stations.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getMyTasks, updateTask, getMyStations } from '../controllers/technicianController.js';

const router = Router();

router.use(authenticate, requireRole('technician', 'admin'));

router.get('/my-tasks', getMyTasks);
router.put('/tasks/:id', updateTask);
router.get('/my-stations', getMyStations);

export default router;
