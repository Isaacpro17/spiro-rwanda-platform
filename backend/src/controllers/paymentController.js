/**
 * @file paymentController.js
 * @description Payment route handlers.
 */

import * as paymentService from '../services/paymentService.js';
import * as notificationService from '../services/notificationService.js';
import * as auditService from '../services/auditService.js';
import { validationResult } from 'express-validator';
import { ValidationError } from '../middleware/errorHandler.js';

const { EVENTS } = auditService;

export async function initiateTopup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());
    const { provider, amountRwf, senderPhone } = req.body;
    const result = await paymentService.initiateWalletTopup(req.user.userId, provider, amountRwf, senderPhone);
    res.status(200).json({ success: true, data: result, message: 'Wallet topped up successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.WALLET_TOPUP,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Payment',
      resourceId: result._id?.toString() ?? result.transactionId?.toString(),
      description: `Wallet top-up of ${amountRwf} RWF initiated via ${provider}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { return next(err); }
}

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
      const isSuccess = payment.status === 'success';
      const msgKey = isSuccess ? 'payment.success' : 'payment.failed';
      await notificationService.sendNotification(payment.riderId.toString(), msgKey, { amount: payment.amountRwf, ref: payment.transactionId }, 'sms', io);
      void auditService.log({
        eventType: isSuccess ? EVENTS.PAYMENT_SUCCESS : EVENTS.PAYMENT_FAILED,
        actorUserId: payment.riderId.toString(),
        resourceType: 'Payment',
        resourceId: payment._id.toString(),
        description: `MTN payment ${isSuccess ? 'succeeded' : 'failed'} — ${payment.amountRwf} RWF (ref: ${payment.transactionId})`,
      }).catch(() => {});
    }
    return res.status(200).json({ success: true, data: {}, message: 'Webhook processed', error: '' });
  } catch (err) { return next(err); }
}

export async function handleAirtelWebhook(req, res, next) {
  try {
    const payment = await paymentService.handlePaymentWebhook({ transactionId: req.body.transaction?.id, status: req.body.transaction?.status === 'TS' ? 'SUCCESSFUL' : 'FAILED' });
    if (payment.riderId) {
      const isSuccess = payment.status === 'success';
      void auditService.log({
        eventType: isSuccess ? EVENTS.PAYMENT_SUCCESS : EVENTS.PAYMENT_FAILED,
        actorUserId: payment.riderId.toString(),
        resourceType: 'Payment',
        resourceId: payment._id?.toString(),
        description: `Airtel payment ${isSuccess ? 'succeeded' : 'failed'} — ${payment.amountRwf} RWF`,
      }).catch(() => {});
    }
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

/** GET /api/v1/payments/transactions — admin */
export async function getAllTransactions(req, res, next) {
  try {
    const data = await paymentService.getAllTransactions(req.query);
    return res.status(200).json({ success: true, data, message: 'Transactions retrieved', error: '' });
  } catch (err) { return next(err); }
}

/** GET /api/v1/payments/transactions/stats — admin */
export async function getTransactionStats(req, res, next) {
  try {
    const data = await paymentService.getTransactionStats();
    return res.status(200).json({ success: true, data, message: 'Transaction statistics retrieved', error: '' });
  } catch (err) { return next(err); }
}

/** POST /api/v1/payments/:id/refund — admin */
export async function processRefund(req, res, next) {
  try {
    const { reason } = req.body;
    const data = await paymentService.processRefund(req.params.id, reason, req.user.userId);
    res.status(200).json({ success: true, data, message: 'Refund processed successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.REFUND_ISSUED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Payment',
      resourceId: req.params.id,
      description: `Admin issued refund for payment ${req.params.id}${reason ? ` — reason: ${reason}` : ''}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { return next(err); }
}
