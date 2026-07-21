/**
 * @file operators.js
 * @description Operator portal utility routes.
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as operatorController from '../controllers/operatorController.js';

const router = Router();
router.use(authenticate, requireRole('operator', 'admin'));

router.get('/rider-lookup', operatorController.lookupRider);

// ── PIN-gated cash transactions ───────────────────────────────────────────────
router.post(
  '/transactions/initiate',
  [
    body('riderId').notEmpty().withMessage('Rider ID is required'),
    body('type').isIn(['wallet_topup', 'subscription', 'swap_cost']).withMessage('Invalid transaction type'),
    body('amountRwf').optional().isFloat({ min: 100, max: 500_000 }).withMessage('Amount must be between RWF 100 and 500,000'),
    body('planId').optional().isString(),
  ],
  operatorController.initiateTransaction,
);
router.get('/transactions/my-pending', operatorController.getMyPendingTransaction);
router.get('/transactions/:id', operatorController.getTransactionStatus);
router.delete('/transactions/:id', operatorController.cancelTransaction);

// ── Direct wallet credit (admin / legacy use) ─────────────────────────────────
router.post(
  '/riders/:riderId/wallet-topup',
  [
    body('amountRwf')
      .isFloat({ min: 100, max: 500_000 })
      .withMessage('Amount must be between RWF 100 and RWF 500,000'),
  ],
  operatorController.topupRiderWallet,
);

export default router;
