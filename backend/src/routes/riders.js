/**
 * @file riders.js
 * @description Rider profile routes.
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as riderController from '../controllers/riderController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('rider'));

router.get('/profile', riderController.getProfile);
router.put('/profile', riderController.updateProfile);
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
], riderController.changePassword);
router.get('/history', riderController.getHistory);
router.post('/loyalty/redeem',
  [body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer')],
  riderController.redeemLoyalty
);
router.get('/data-export', riderController.exportData);
router.delete('/account', riderController.deleteAccount);

export default router;
