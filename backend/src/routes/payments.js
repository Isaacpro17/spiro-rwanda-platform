import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as paymentController from '../controllers/paymentController.js';

const router = Router();

router.post('/webhook/mtn', paymentController.handleMtnWebhook);
router.post('/webhook/airtel', paymentController.handleAirtelWebhook);

router.use(authenticate);

// Admin routes
router.get('/transactions', requireRole('admin'), paymentController.getAllTransactions);
router.get('/transactions/stats', requireRole('admin'), paymentController.getTransactionStats);
router.post('/:id/refund', requireRole('admin'), [
  body('reason').trim().notEmpty().withMessage('Refund reason is required'),
], paymentController.processRefund);

// Rider routes
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
