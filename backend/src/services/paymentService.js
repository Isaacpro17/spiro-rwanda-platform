/**
 * @file paymentService.js
 * @description Payment service: MTN MoMo, Airtel Money, invoice generation.
 */

import crypto from 'crypto';
import Payment from '../models/Payment.js';
import SwapTransaction from '../models/SwapTransaction.js';
import RiderProfile from '../models/RiderProfile.js';
import * as paypackService from './paypackService.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Initiates a mobile money payment.
 * @param {string} riderId
 * @param {string} swapTransactionId
 * @param {'mtn_momo'|'airtel_money'} provider
 * @param {number} amountRwf
 * @param {string} senderPhone
 * @returns {Promise<{ paymentId: string, status: string }>}
 */
export async function initiatePayment(riderId, swapTransactionId, provider, amountRwf, senderPhone) {
  const transactionId = `TRX${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const payment = await Payment.create({
    transactionId,
    provider,
    amountRwf,
    riderId,
    swapTransactionId,
    senderPhone,
    status: 'pending',
  });

  // In production, call provider API here
  // For now, simulate async processing
  logger.info('Payment initiated', { paymentId: payment._id, provider, amountRwf });

  return { paymentId: payment._id.toString(), transactionId, status: 'pending' };
}

/**
 * Handles payment webhook from MTN or Airtel.
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function handlePaymentWebhook(payload) {
  const { transactionId, status, providerRef } = payload;

  const payment = await Payment.findOneAndUpdate(
    { transactionId },
    { status: status === 'SUCCESSFUL' ? 'success' : 'failed', providerRef },
    { new: true }
  );

  if (!payment) throw new NotFoundError('Payment not found');

  if (payment.status === 'success' && payment.swapTransactionId) {
    await SwapTransaction.findByIdAndUpdate(payment.swapTransactionId, {
      paymentId: payment._id,
      status: 'completed',
    });
  }

  logger.info('Payment webhook processed', { transactionId, status: payment.status });
  return payment;
}

/**
 * Generates a simple PDF invoice (text-based for now; full PDF in production).
 * @param {string} paymentId
 * @returns {Promise<Object>} invoice data
 */
export async function generateInvoice(paymentId) {
  const payment = await Payment.findById(paymentId)
    .populate('riderId', 'fullName phone')
    .populate('swapTransactionId');

  if (!payment) throw new NotFoundError('Payment not found');

  const receiptNumber = `RCP-${payment.transactionId}`;

  return {
    receiptNumber,
    riderName: payment.riderId?.fullName || 'N/A',
    phone: payment.riderId?.phone || 'N/A',
    amountRwf: payment.amountRwf,
    provider: payment.provider,
    transactionId: payment.transactionId,
    timestamp: payment.timestamp,
    status: payment.status,
  };
}

/**
 * Initiates a wallet top-up via Paypack (real USSD push).
 * The wallet is NOT credited immediately — it stays "pending" until
 * the caller polls checkTopupStatus() and Paypack confirms success.
 *
 * @param {string} riderId
 * @param {'mtn_momo'|'airtel_money'} provider
 * @param {number} amountRwf
 * @param {string} senderPhone   Rider's mobile money number
 * @returns {Promise<{ paymentId: string, transactionId: string, providerRef: string, status: 'pending' }>}
 */
export async function initiateWalletTopup(riderId, provider, amountRwf, senderPhone) {
  const transactionId = `WLT${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // 1. Call Paypack → rider's phone gets USSD PIN prompt
  const { ref } = await paypackService.cashin(amountRwf, senderPhone);

  // 2. Record the payment as PENDING (wallet not yet credited)
  const payment = await Payment.create({
    transactionId,
    providerRef: ref,          // Paypack's transaction reference for polling
    provider,
    amountRwf,
    riderId,
    senderPhone,
    type: 'wallet_topup',
    status: 'pending',
  });

  logger.info('Wallet top-up initiated via Paypack', {
    riderId, amountRwf, provider, senderPhone, ref,
  });

  return {
    paymentId:     payment._id.toString(),
    transactionId,
    providerRef:   ref,
    status:        'pending',
  };
}

/**
 * Polls Paypack for the current status of a pending wallet top-up.
 * If Paypack reports "successful", credits the rider's wallet and marks payment as success.
 * If Paypack reports "failed", marks payment as failed.
 * Safe to call repeatedly — if already in a final state it returns immediately.
 *
 * @param {string} providerRef   The Paypack `ref` returned by initiateWalletTopup()
 * @param {string} riderId       The rider's user ID (for authorization)
 * @returns {Promise<{ status: 'pending'|'success'|'failed', newWalletBalance?: number }>}
 */
export async function checkTopupStatus(providerRef, riderId) {
  // Find the payment record
  const payment = await Payment.findOne({ providerRef, riderId });
  if (!payment) throw new NotFoundError('Payment not found');

  // If already in a final state, return immediately (idempotent)
  if (payment.status === 'success') {
    const profile = await RiderProfile.findOne({ userId: riderId }).lean();
    return { status: 'success', newWalletBalance: profile?.walletBalance ?? 0 };
  }
  if (payment.status === 'failed') {
    return { status: 'failed' };
  }

  // Poll Paypack for the latest status
  const { status: paypackStatus } = await paypackService.getTransaction(providerRef);

  if (paypackStatus === 'successful') {
    // Credit the wallet atomically
    const updatedProfile = await RiderProfile.findOneAndUpdate(
      { userId: riderId },
      { $inc: { walletBalance: payment.amountRwf } },
      { new: true, upsert: true },
    );

    await Payment.findByIdAndUpdate(payment._id, { status: 'success' });

    logger.info('Wallet top-up confirmed and credited', {
      riderId,
      amountRwf: payment.amountRwf,
      providerRef,
      newBalance: updatedProfile.walletBalance,
    });

    return { status: 'success', newWalletBalance: updatedProfile.walletBalance };
  }

  if (paypackStatus === 'failed') {
    await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
    logger.warn('Wallet top-up failed (reported by Paypack)', { riderId, providerRef });
    return { status: 'failed' };
  }

  // Still pending
  return { status: 'pending' };
}

/**
 * Gets paginated payment history for a rider.
 * @param {string} riderId
 * @param {number} page
 * @param {{ startDate?: string, endDate?: string }} filters
 * @returns {Promise<Object>}
 */
export async function getPaymentHistory(riderId, page = 1, filters = {}) {
  const query = { riderId };
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const limit = 20;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Payment.countDocuments(query),
  ]);

  return { payments, total, page, pages: Math.ceil(total / limit) };
}


/**
 * Get all transactions (admin view)
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Paginated transactions
 */
export async function getAllTransactions(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.provider) filter.provider = query.provider;
  if (query.riderId) filter.riderId = query.riderId;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }
  if (query.search) {
    filter.$or = [
      { transactionId: { $regex: query.search, $options: 'i' } },
      { senderPhone: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    Payment.find(filter)
      .populate('riderId', 'fullName phone email')
      .populate('swapTransactionId', 'swapTime stationId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get transaction statistics (admin)
 * @returns {Promise<Object>} Transaction statistics
 */
export async function getTransactionStats() {
  const [
    total,
    byStatus,
    byProvider,
    todayTransactions,
    todayRevenue,
    totalRevenue,
  ] = await Promise.all([
    Payment.countDocuments(),
    Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]),
    Payment.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 } } },
      { $project: { provider: '$_id', count: 1, _id: 0 } },
    ]),
    Payment.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    Payment.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
  ]);

  const statusStats = {};
  byStatus.forEach((item) => {
    statusStats[item.status] = item.count;
  });

  const providerStats = {};
  byProvider.forEach((item) => {
    providerStats[item.provider] = item.count;
  });

  return {
    total,
    byStatus: statusStats,
    byProvider: providerStats,
    todayTransactions,
    todayRevenue: todayRevenue[0]?.total || 0,
    totalRevenue: totalRevenue[0]?.total || 0,
  };
}

/**
 * Operator-initiated cash wallet top-up for a rider.
 * Creates an auditable Payment record (provider: cash) and credits the wallet immediately.
 * @param {string} riderId
 * @param {number} amountRwf
 * @param {string} operatorId - the operator performing the top-up
 * @returns {Promise<{ paymentId: string, transactionId: string, newWalletBalance: number }>}
 */
export async function operatorWalletTopup(riderId, amountRwf, operatorId) {
  if (amountRwf < 100) throw new ValidationError('Minimum top-up amount is RWF 100');
  if (amountRwf > 500_000) throw new ValidationError('Maximum single top-up is RWF 500,000');

  const transactionId = `OPT${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const payment = await Payment.create({
    transactionId,
    provider: 'cash',
    amountRwf,
    riderId,
    type: 'wallet_topup',
    status: 'success',
  });

  const updatedProfile = await RiderProfile.findOneAndUpdate(
    { userId: riderId },
    { $inc: { walletBalance: amountRwf } },
    { new: true, upsert: true },
  );

  logger.info('Operator wallet top-up processed', {
    riderId,
    amountRwf,
    operatorId,
    newBalance: updatedProfile.walletBalance,
  });

  return {
    paymentId: payment._id.toString(),
    transactionId,
    newWalletBalance: updatedProfile.walletBalance,
  };
}

/**
 * Process refund (admin)
 * @param {string} transactionId
 * @param {string} reason
 * @param {string} adminId
 * @returns {Promise<Object>} Refund result
 */
export async function processRefund(transactionId, reason, adminId) {
  const payment = await Payment.findById(transactionId);
  if (!payment) {
    throw new NotFoundError('Transaction not found');
  }

  if (payment.status !== 'success') {
    throw new ValidationError('Can only refund successful transactions');
  }

  if (payment.refunded) {
    throw new ValidationError('Transaction already refunded');
  }

  // In production, this would call the payment provider's refund API
  // For now, we just mark it as refunded
  payment.refunded = true;
  payment.refundReason = reason;
  payment.refundedBy = adminId;
  payment.refundedAt = new Date();
  await payment.save();

  logger.info('Payment refunded', {
    transactionId,
    amount: payment.amountRwf,
    reason,
    adminId,
  });

  return payment;
}
