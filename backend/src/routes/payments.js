import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

// ── Webhook (kept for future use / forward-compatibility) ─────────────────────
router.post('/webhook/paypack', paymentController.handlePaypackWebhook);

router.use(authenticate);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/transactions', requireRole('admin'), paymentController.getAllTransactions);
router.get('/transactions/stats', requireRole('admin'), paymentController.getTransactionStats);
router.post('/:id/refund', requireRole('admin'), [
  body('reason').trim().notEmpty().withMessage('Refund reason is required'),
], paymentController.processRefund);

// ── Rider routes ──────────────────────────────────────────────────────────────

// Initiate a Paypack wallet top-up (sends USSD push to rider's phone)
router.post('/topup', requireRole('rider'), [
  body('provider').isIn(['mtn_momo', 'airtel_money']).withMessage('Provider must be mtn_momo or airtel_money'),
  body('amountRwf').isFloat({ min: 100 }).withMessage('Minimum top-up amount is RWF 100'),
  body('senderPhone').notEmpty().withMessage('Phone number is required'),
], paymentController.initiateTopup);

// Poll this endpoint every 5s to check if the rider has entered their PIN
router.get('/topup/status/:ref', requireRole('rider'), paymentController.checkTopupStatus);

router.post('/initiate', requireRole('rider'), [
  body('swapTransactionId').notEmpty(),
  body('provider').isIn(['mtn_momo', 'airtel_money']),
  body('amountRwf').isFloat({ min: 1 }),
  body('senderPhone').notEmpty(),
], paymentController.initiatePayment);
router.get('/history', requireRole('rider'), paymentController.getPaymentHistory);
router.get('/export', requireRole('rider'), paymentController.exportPayments);
router.get('/:id/invoice', requireRole('rider', 'admin'), paymentController.getInvoice);

export default router;
