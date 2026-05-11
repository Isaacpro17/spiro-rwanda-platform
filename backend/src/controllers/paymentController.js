/**
 * @file paymentController.js
 * @description Payment route handlers.
 */

import * as paymentService from '../services/paymentService.js';
import * as notificationService from '../services/notificationService.js';
import * as auditService from '../services/auditService.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../middleware/errorHandler.js';

export async function initiatePayment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());
    const { swapTransactionId, provider, amountRwf, senderPhone } = req.body;
    const result = await paymentService.initiatePayment(req.user.userId, swapTransactionId, provider, amountRwf, senderPhone);
    return res.status(200).json({ success: true, data: result, message: 'Payment initiated', error: '' });
  } catch (err) { return next(err); }
}

export async function handleMtnWebhook(req, res, next) {
  try {
    const payment = await paymentService.handlePaymentWebhook({ ...req.body, transactionId: req.body.externalId || req.body.transactionId, status: req.body.status });
    const io = req.app.get('io');
    if (payment.riderId) {
      const msgKey = payment.status === 'success' ? 'payment.success' : 'payment.failed';
      await notificationService.sendNotification(payment.riderId.toString(), msgKey, { amount: payment.amountRwf, ref: payment.transactionId }, 'sms', io);
      await auditService.log({ eventType: payment.status === 'success' ? auditService.EVENTS.PAYMENT_SUCCESS : auditService.EVENTS.PAYMENT_FAILED, actorUserId: payment.riderId.toString(), resourceId: payment._id.toString(), resourceType: 'Payment' });
    }
    return res.status(200).json({ success: true, data: {}, message: 'Webhook processed', error: '' });
  } catch (err) { return next(err); }
}

export async function handleAirtelWebhook(req, res, next) {
  try {
    const payment = await paymentService.handlePaymentWebhook({ transactionId: req.body.transaction?.id, status: req.body.transaction?.status === 'TS' ? 'SUCCESSFUL' : 'FAILED' });
    return res.status(200).json({ success: true, data: {}, message: 'Webhook processed', error: '' });
  } catch (err) { return next(err); }
}

export async function getPaymentHistory(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await paymentService.getPaymentHistory(req.user.userId, page, req.query);
    return res.status(200).json({ success: true, data, message: 'Payment history retrieved', error: '' });
  } catch (err) { return next(err); }
}

export async function getInvoice(req, res, next) {
  try {
    const invoice = await paymentService.generateInvoice(req.params.id);
    return res.status(200).json({ success: true, data: invoice, message: 'Invoice generated', error: '' });
  } catch (err) { return next(err); }
}

export async function exportPayments(req, res, next) {
  try {
    const data = await paymentService.getPaymentHistory(req.user.userId, 1, { ...req.query, limit: 10000 });
    return res.status(200).json({ success: true, data, message: 'Export ready', error: '' });
  } catch (err) { return next(err); }
}


/**
 * GET /api/v1/payments/transactions
 * Get all transactions (admin)
 */
export async function getAllTransactions(req, res, next) {
  try {
    const data = await paymentService.getAllTransactions(req.query);
    return res.status(200).json({
      success: true,
      data,
      message: 'Transactions retrieved',
      error: '',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/payments/transactions/stats
 * Get transaction statistics (admin)
 */
export async function getTransactionStats(req, res, next) {
  try {
    const data = await paymentService.getTransactionStats();
    return res.status(200).json({
      success: true,
      data,
      message: 'Transaction statistics retrieved',
      error: '',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/payments/:id/refund
 * Process refund (admin)
 */
export async function processRefund(req, res, next) {
  try {
    const { reason } = req.body;
    const data = await paymentService.processRefund(req.params.id, reason, req.user.userId);
    return res.status(200).json({
      success: true,
      data,
      message: 'Refund processed successfully',
      error: '',
    });
  } catch (err) {
    return next(err);
  }
}
