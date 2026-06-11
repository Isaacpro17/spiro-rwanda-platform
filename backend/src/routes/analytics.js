import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = Router();
router.use(authenticate);

router.get('/kpis', requireRole('admin'), analyticsController.getKpis);
router.get('/report', requireRole('admin'), analyticsController.getReport);
router.get('/export', requireRole('admin'), analyticsController.exportReport);
router.get('/stations/:id', requireRole('admin', 'operator'), analyticsController.getStationBreakdown);
router.get('/stations/:id/daily', requireRole('admin', 'operator'), analyticsController.getStationDaily);

export default router;
