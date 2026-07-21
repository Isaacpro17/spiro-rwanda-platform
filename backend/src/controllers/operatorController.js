/**
 * @file operatorController.js
 * @description Operator-specific route handlers.
 */

import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import * as paymentService from '../services/paymentService.js';
import * as pendingTxService from '../services/pendingTransactionService.js';
import * as auditService from '../services/auditService.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { validationResult } from 'express-validator';

const { EVENTS } = auditService;

/** GET /operators/rider-lookup?phone=X — find a rider by phone, including wallet balance */
export async function lookupRider(req, res, next) {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'phone query parameter is required', error: 'Bad Request' });
    }

    // Normalize: strip non-digits then take the last 9 significant digits.
    // This makes +250782123456, 0782123456, 250782123456 all match the same record.
    const digits = phone.trim().replace(/\D/g, '').slice(-9);
    if (digits.length < 7) {
      return res.status(400).json({ success: false, message: 'Phone number too short', error: 'Bad Request' });
    }
    const phoneRegex = new RegExp(`${digits}$`);

    const rider = await User.findOne({ phone: phoneRegex, role: 'rider' }).select('_id fullName phone');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'No rider found with this phone number', error: 'Not Found' });
    }
    const profile = await RiderProfile.findOne({ userId: rider._id }).select('walletBalance').lean();
    res.json({
      success: true,
      data: { ...rider.toObject(), walletBalance: profile?.walletBalance ?? 0 },
      message: 'Rider found.',
      error: '',
    });
  } catch (err) { next(err); }
}

/** POST /operators/transactions/initiate — start a PIN-gated cash transaction */
export async function initiateTransaction(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());

    const { riderId, type, amountRwf, planId } = req.body;

    const rider = await User.findById(riderId).select('role fullName phone');
    if (!rider) throw new NotFoundError('Rider not found');
    if (rider.role !== 'rider') throw new ValidationError('Target user is not a rider');

    const result = await pendingTxService.initiate({
      riderId,
      operatorId: req.user.userId,
      type,
      amountRwf: amountRwf ? Number(amountRwf) : 0,
      planId,
    });

    res.json({
      success: true,
      data: { ...result, riderName: rider.fullName, riderPhone: rider.phone },
      message: 'Transaction initiated. Share the PIN with the rider.',
      error: '',
    });

    void auditService.log({
      eventType: EVENTS.OPERATOR_WALLET_TOPUP,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'PendingTransaction',
      resourceId: result.transactionId,
      description: `Operator initiated ${type} for rider ${riderId} (${rider.fullName}), RWF ${result.amountRwf}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** GET /operators/transactions/my-pending — get operator's own active pending transaction */
export async function getMyPendingTransaction(req, res, next) {
  try {
    const tx = await pendingTxService.getMyPending(req.user.userId);
    res.json({ success: true, data: tx ?? null, message: '', error: '' });
  } catch (err) { next(err); }
}

/** GET /operators/transactions/:id — poll transaction status */
export async function getTransactionStatus(req, res, next) {
  try {
    const tx = await pendingTxService.getStatus(req.params.id);
    res.json({ success: true, data: tx, message: '', error: '' });
  } catch (err) { next(err); }
}

/** DELETE /operators/transactions/:id — cancel a pending transaction */
export async function cancelTransaction(req, res, next) {
  try {
    await pendingTxService.cancel(req.params.id, req.user.userId);
    res.json({ success: true, data: {}, message: 'Transaction cancelled.', error: '' });
  } catch (err) { next(err); }
}

/** POST /operators/riders/:riderId/wallet-topup — direct wallet credit (admin / legacy) */
export async function topupRiderWallet(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());

    const { riderId } = req.params;
    const { amountRwf } = req.body;

    // Ensure target is a rider (not an admin or operator)
    const rider = await User.findById(riderId).select('role fullName phone');
    if (!rider) throw new NotFoundError('Rider not found');
    if (rider.role !== 'rider') throw new ValidationError('Target user is not a rider');

    const result = await paymentService.operatorWalletTopup(riderId, Number(amountRwf), req.user.userId);

    res.json({
      success: true,
      data: result,
      message: `Wallet topped up by RWF ${Number(amountRwf).toLocaleString()}`,
      error: '',
    });

    void auditService.log({
      eventType: EVENTS.OPERATOR_WALLET_TOPUP,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'RiderProfile',
      resourceId: riderId,
      description: `Operator ${req.user.userId} topped up rider ${riderId} (${rider.fullName}) wallet by RWF ${amountRwf}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}
