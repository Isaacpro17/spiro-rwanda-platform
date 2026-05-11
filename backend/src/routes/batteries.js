/**
 * @file batteries.js
 * @description Battery management routes
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as batteryController from '../controllers/batteryController.js';

const router = Router();

// All battery routes require authentication
router.use(authenticate);

// GET /batteries/stats - Battery statistics (admin only)
router.get('/stats', requireRole('admin'), batteryController.getBatteryStats);

// PUT /batteries/bulk/status - Bulk update status (admin, operator)
router.put(
  '/bulk/status',
  requireRole('admin', 'operator'),
  [
    body('batteryIds').isArray().withMessage('batteryIds must be an array'),
    body('status')
      .isIn(['available', 'in_use', 'charging', 'maintenance', 'retired'])
      .withMessage('Invalid status'),
  ],
  batteryController.bulkUpdateStatus
);

// GET /batteries - List all batteries (admin, operator, technician)
router.get('/', requireRole('admin', 'operator', 'technician'), batteryController.listBatteries);

// POST /batteries - Create new battery (admin only)
router.post(
  '/',
  requireRole('admin'),
  [
    body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
    body('qrCode').trim().notEmpty().withMessage('QR code is required'),
    body('manufacturer').trim().notEmpty().withMessage('Manufacturer is required'),
    body('model').trim().notEmpty().withMessage('Model is required'),
    body('capacity').isFloat({ min: 0 }).withMessage('Capacity must be a positive number'),
  ],
  batteryController.createBattery
);

// GET /batteries/:id - Get battery details
router.get('/:id', requireRole('admin', 'operator', 'technician'), batteryController.getBattery);

// PUT /batteries/:id - Update battery (admin, operator)
router.put('/:id', requireRole('admin', 'operator'), batteryController.updateBattery);

// DELETE /batteries/:id - Delete battery (admin only)
router.delete('/:id', requireRole('admin'), batteryController.deleteBattery);

// GET /batteries/:id/health - Get battery health diagnostics
router.get(
  '/:id/health',
  requireRole('admin', 'operator', 'technician'),
  batteryController.getBatteryHealth
);

// POST /batteries/:id/repair - Create repair request
router.post(
  '/:id/repair',
  requireRole('admin', 'operator', 'technician'),
  [
    body('issueType')
      .isIn(['low_performance', 'not_charging', 'physical_damage', 'faulty', 'other'])
      .withMessage('Invalid issue type'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],
  batteryController.createRepairRequest
);

export default router;
