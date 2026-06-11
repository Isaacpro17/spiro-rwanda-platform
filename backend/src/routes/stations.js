/**
 * @file stations.js
 * @description Station management routes.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as stationController from '../controllers/stationController.js';

const router = Router();

router.use(authenticate);

router.get('/', stationController.listStations);
router.get('/:id', stationController.getStation);
router.post('/', requireRole('admin'), stationController.createStation);
router.put('/:id', requireRole('admin', 'operator'), stationController.updateStation);
router.put('/:id/inventory', requireRole('admin', 'operator'), stationController.updateInventory);
router.put('/:id/status', requireRole('admin', 'operator'), stationController.setStatus);
router.post('/:id/maintenance', requireRole('admin', 'operator', 'technician'), stationController.createMaintenance);
router.get('/:id/stats', requireRole('admin', 'operator'), stationController.getStationStats);
router.get('/:id/reservations', requireRole('admin', 'operator'), stationController.getStationReservations);
router.get('/:id/maintenance', requireRole('admin', 'operator', 'technician'), stationController.getStationMaintenance);

export default router;
