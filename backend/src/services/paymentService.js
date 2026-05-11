/**
 * @file paymentService.js
 * @description Payment service: MTN MoMo, Airtel Money, invoice generation.
 */

import crypto from 'crypto';
import Payment from '../models/Payment.js';
import SwapTransaction from '../models/SwapTransaction.js';
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
