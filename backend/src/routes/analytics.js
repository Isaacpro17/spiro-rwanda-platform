import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/kpis', analyticsController.getKpis);
router.get('/report', analyticsController.getReport);
router.get('/export', analyticsController.exportReport);
router.get('/stations/:id', analyticsController.getStationBreakdown);

export default router;
