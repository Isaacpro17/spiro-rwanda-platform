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

    // Return pending status + providerRef so frontend can start polling
    res.status(200).json({
      success: true,
      data: result,
      message: 'Payment request sent. Please enter your Mobile Money PIN on your phone.',
      error: '',
    });
    void auditService.log({
      eventType: EVENTS.WALLET_TOPUP,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Payment',
      resourceId: result.paymentId,
      description: `Wallet top-up of ${amountRwf} RWF initiated via ${provider} (Paypack ref: ${result.providerRef})`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { return next(err); }
}

/**
 * GET /payments/topup/status/:ref
 * Polling endpoint — frontend calls this every 5 s to check if the rider
 * has entered their PIN and Paypack has confirmed the payment.
 */
export async function checkTopupStatus(req, res, next) {
  try {
    const { ref } = req.params;
    const result = await paymentService.checkTopupStatus(ref, req.user.userId);

    // If just confirmed successful, fire the audit log
    if (result.status === 'success') {
      void auditService.log({
        eventType: EVENTS.WALLET_TOPUP,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        resourceType: 'Payment',
        description: `Wallet top-up confirmed via Paypack (ref: ${ref}). New balance: ${result.newWalletBalance} RWF`,
        ipAddress: req.ip,
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, data: result, message: `Status: ${result.status}`, error: '' });
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

export async function handlePaypackWebhook(req, res, next) {
  // Kept for future webhook upgrade; currently not used (polling approach)
  return res.status(200).json({ success: true, data: {}, message: 'OK', error: '' });
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
