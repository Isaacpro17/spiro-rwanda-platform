/**
 * @file pendingTransactionService.js
 * @description PIN-gated cash transactions initiated by operators.
 * The operator creates a transaction and is shown a 4-digit PIN.
 * The rider must enter the PIN on their device to apply the transaction effect.
 */

import crypto from 'crypto';
import PendingTransaction from '../models/PendingTransaction.js';
import RiderProfile from '../models/RiderProfile.js';
import Payment from '../models/Payment.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const PIN_EXPIRY_MINUTES = 15;
const MAX_ATTEMPTS = 3;

function generatePin() {
  // 4-digit PIN: 1000–9999
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Using transactionId as a salt prevents rainbow-table attacks on the small PIN space
function hashPin(pin, txId) {
  return crypto.createHash('sha256').update(`${txId}:${pin}`).digest('hex');
}

/**
 * Operator creates a pending transaction.
 * Returns the plain-text PIN to show the operator (never stored).
 */
export async function initiate({ riderId, operatorId, type, amountRwf, planId }) {
  if (!['wallet_topup', 'subscription', 'swap_cost'].includes(type)) {
    throw new ValidationError('Invalid transaction type');
  }

  // One active pending per rider at a time
  const existing = await PendingTransaction.findOne({ riderId, status: 'pending' });
  if (existing) {
    throw new ValidationError(
      'This rider already has a pending transaction. Cancel it first or ask the rider to confirm it.',
    );
  }

  let resolvedAmount = amountRwf;

  if (type === 'subscription') {
    if (!planId) throw new ValidationError('Plan ID is required for subscription transactions');
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) throw new NotFoundError('Subscription plan not found or inactive');
    resolvedAmount = plan.priceRwf;
  } else {
    if (!amountRwf || amountRwf < 100 || amountRwf > 500_000) {
      throw new ValidationError('Amount must be between RWF 100 and RWF 500,000');
    }
  }

  const expiresAt = new Date(Date.now() + PIN_EXPIRY_MINUTES * 60 * 1000);

  // Create the record first to get an _id, then hash the PIN using the ID as salt
  const tx = await PendingTransaction.create({
    riderId,
    operatorId,
    type,
    amountRwf: resolvedAmount,
    planId: planId || null,
    pinHash: 'placeholder',       // overwritten immediately below
    expiresAt,
  });

  const pin = generatePin();
  const pinHash = hashPin(pin, tx._id.toString());
  await PendingTransaction.findByIdAndUpdate(tx._id, { pinHash });

  logger.info('Pending transaction created', { txId: tx._id, riderId, type, amountRwf: resolvedAmount });

  return {
    transactionId: tx._id.toString(),
    pin,
    expiresAt,
    amountRwf: resolvedAmount,
  };
}

/**
 * Operator polls the transaction status.
 */
export async function getStatus(transactionId) {
  const tx = await PendingTransaction.findById(transactionId)
    .populate('riderId', 'fullName phone')
    .populate('planId', 'name priceRwf')
    .lean();
  if (!tx) throw new NotFoundError('Transaction not found');
  return tx;
}

/**
 * Rider retrieves their latest pending transaction (for modal display).
 * Auto-expires any stale pending transactions before returning.
 */
export async function getPendingForRider(riderId) {
  await PendingTransaction.updateMany(
    { riderId, status: 'pending', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
  return PendingTransaction.findOne({ riderId, status: 'pending' })
    .populate('operatorId', 'fullName')
    .populate('planId', 'name priceRwf swapsPerMonth')
    .lean();
}

/**
 * Rider confirms the transaction by entering the PIN.
 * On success, applies the transaction effect and marks it completed.
 */
export async function confirm(transactionId, riderId, pin) {
  const tx = await PendingTransaction.findById(transactionId);
  if (!tx) throw new NotFoundError('Transaction not found');
  if (tx.riderId.toString() !== riderId) {
    throw new ValidationError('This transaction does not belong to you');
  }
  if (tx.status !== 'pending') {
    throw new ValidationError(`Transaction is already ${tx.status}`);
  }
  if (tx.expiresAt < new Date()) {
    await PendingTransaction.findByIdAndUpdate(transactionId, { $set: { status: 'expired' } });
    throw new ValidationError('This transaction has expired. Please ask the operator to create a new one.');
  }

  const pinHash = hashPin(pin, transactionId);
  if (tx.pinHash !== pinHash) {
    const newAttempts = tx.attempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      await PendingTransaction.findByIdAndUpdate(transactionId, {
        $set: { status: 'expired', attempts: newAttempts },
      });
      throw new ValidationError('Too many incorrect PIN attempts. Transaction has been cancelled.');
    }
    await PendingTransaction.findByIdAndUpdate(transactionId, { $set: { attempts: newAttempts } });
    const remaining = MAX_ATTEMPTS - newAttempts;
    throw new ValidationError(
      `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    );
  }

  // ── Apply the transaction effect ────────────────────────────────────────────
  const paymentTxId = `OPT${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  let result = {};

  if (tx.type === 'wallet_topup') {
    const profile = await RiderProfile.findOneAndUpdate(
      { userId: riderId },
      { $inc: { walletBalance: tx.amountRwf } },
      { new: true, upsert: true },
    );
    await Payment.create({
      transactionId: paymentTxId,
      provider: 'cash',
      amountRwf: tx.amountRwf,
      riderId,
      type: 'wallet_topup',
      status: 'success',
    });
    result = { newWalletBalance: profile.walletBalance };

  } else if (tx.type === 'subscription') {
    const plan = await SubscriptionPlan.findById(tx.planId);
    if (!plan) throw new NotFoundError('Subscription plan no longer exists');
    await RiderProfile.findOneAndUpdate(
      { userId: riderId },
      { $set: { subscriptionPlanId: tx.planId } },
      { upsert: true },
    );
    await Payment.create({
      transactionId: paymentTxId,
      provider: 'cash',
      amountRwf: tx.amountRwf,
      riderId,
      type: 'subscription',
      status: 'success',
    });
    result = { planName: plan.name };

  } else if (tx.type === 'swap_cost') {
    const profile = await RiderProfile.findOne({ userId: riderId });
    if (!profile || profile.walletBalance < tx.amountRwf) {
      throw new ValidationError(
        `Insufficient wallet balance. You have RWF ${(profile?.walletBalance ?? 0).toLocaleString()}, ` +
        `but this transaction requires RWF ${tx.amountRwf.toLocaleString()}.`,
      );
    }
    const updated = await RiderProfile.findOneAndUpdate(
      { userId: riderId },
      { $inc: { walletBalance: -tx.amountRwf } },
      { new: true },
    );
    await Payment.create({
      transactionId: paymentTxId,
      provider: 'cash',
      amountRwf: tx.amountRwf,
      riderId,
      type: 'swap_payment',
      status: 'success',
    });
    result = { newWalletBalance: updated.walletBalance };
  }

  await PendingTransaction.findByIdAndUpdate(transactionId, {
    $set: { status: 'completed', completedAt: new Date() },
  });

  logger.info('Pending transaction confirmed by rider', { transactionId, riderId, type: tx.type });
  return { type: tx.type, amountRwf: tx.amountRwf, ...result };
}

/**
 * Returns the operator's own active pending transaction (if any).
 */
export async function getMyPending(operatorId) {
  await PendingTransaction.updateMany(
    { operatorId, status: 'pending', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  );
  return PendingTransaction.findOne({ operatorId, status: 'pending' })
    .populate('riderId', 'fullName phone')
    .populate('planId', 'name priceRwf')
    .lean();
}

/**
 * Operator cancels a pending transaction they created.
 */
export async function cancel(transactionId, operatorId) {
  const tx = await PendingTransaction.findById(transactionId);
  if (!tx) throw new NotFoundError('Transaction not found');
  if (tx.operatorId.toString() !== operatorId) {
    throw new ValidationError('You can only cancel transactions you created');
  }
  if (tx.status !== 'pending') {
    throw new ValidationError(`Transaction is already ${tx.status}`);
  }
  await PendingTransaction.findByIdAndUpdate(transactionId, {
    $set: { status: 'cancelled', cancelledAt: new Date() },
  });
  logger.info('Pending transaction cancelled by operator', { transactionId, operatorId });
}
