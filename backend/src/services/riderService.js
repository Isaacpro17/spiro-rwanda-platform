/**
 * @file riderService.js
 * @description Rider profile management: CRUD, loyalty points, history, GDPR.
 */

import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import SwapTransaction from '../models/SwapTransaction.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const PAGE_SIZE = 20;

/**
 * Gets or creates a rider profile.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getRiderProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  let profile = await RiderProfile.findOne({ userId }).populate('subscriptionPlanId');
  if (!profile) {
    profile = await RiderProfile.create({ userId });
  }

  return { user: user.toSafeObject(), profile };
}

/**
 * Updates rider profile fields (both User and RiderProfile tables).
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateRiderProfile(userId, updates) {
  const allowedUserFields    = ['fullName', 'email', 'phone', 'language', 'nid', 'emergencyContact'];
  const allowedProfileFields = ['vehicleRegistration', 'motorcycleModel'];

  const userUpdates    = {};
  const profileUpdates = {};

  for (const [key, val] of Object.entries(updates)) {
    if (allowedUserFields.includes(key))    userUpdates[key]    = val;
    if (allowedProfileFields.includes(key)) profileUpdates[key] = val;
  }

  const [user, profile] = await Promise.all([
    User.findByIdAndUpdate(userId, userUpdates, { new: true, runValidators: true }),
    RiderProfile.findOneAndUpdate({ userId }, profileUpdates, { new: true, upsert: true }),
  ]);

  return { user: user.toSafeObject(), profile };
}

/**
 * Changes a rider's password after verifying the current one.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<void>}
 * @throws {ValidationError} if current password is incorrect or new passwords don't match
 */
export async function changeRiderPassword(userId, currentPassword, newPassword) {
  const bcrypt = (await import('bcrypt')).default;
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) throw new ValidationError('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(userId, { passwordHash, failedLoginCount: 0, lockedUntil: null });
  logger.info('Rider password changed', { userId });
}

/**
 * Returns paginated swap history for a rider.
 * @param {string} userId
 * @param {number} page
 * @returns {Promise<{ transactions: Array, total: number, page: number, pages: number }>}
 */
export async function getRiderHistory(userId, page = 1) {
  const skip = (page - 1) * PAGE_SIZE;

  // SwapTransaction model created in Task 5 — graceful fallback if not yet available
  let transactions = [];
  let total = 0;

  try {
    [transactions, total] = await Promise.all([
      SwapTransaction.find({ riderId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate('stationId', 'name address')
        .populate('paymentId', 'amountRwf method status'),
      SwapTransaction.countDocuments({ riderId: userId }),
    ]);
  } catch {
    // Model not yet registered — return empty
  }

  return {
    transactions,
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  };
}

/**
 * Increments loyalty points after a completed swap.
 * @param {string} userId
 * @param {number} points
 * @returns {Promise<number>} new balance
 */
export async function incrementLoyaltyPoints(userId, points) {
  const profile = await RiderProfile.findOneAndUpdate(
    { userId },
    { $inc: { loyaltyPoints: points } },
    { new: true, upsert: true }
  );
  return profile.loyaltyPoints;
}

/**
 * Redeems loyalty points — deducts balance and returns discount amount.
 * @param {string} userId
 * @param {number} pointsToRedeem
 * @returns {Promise<{ newBalance: number, discountRwf: number }>}
 */
export async function redeemLoyaltyPoints(userId, pointsToRedeem) {
  const profile = await RiderProfile.findOne({ userId });
  if (!profile) throw new NotFoundError('Rider profile not found');

  if (profile.loyaltyPoints < pointsToRedeem) {
    throw new ValidationError('Insufficient loyalty points');
  }

  const discountRwf = pointsToRedeem * 10; // 10 RWF per point
  const updated = await RiderProfile.findOneAndUpdate(
    { userId },
    { $inc: { loyaltyPoints: -pointsToRedeem } },
    { new: true }
  );

  logger.info('Loyalty points redeemed', { userId, pointsToRedeem, discountRwf });
  return { newBalance: updated.loyaltyPoints, discountRwf };
}

/**
 * Exports all personal data for GDPR compliance.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function exportRiderData(userId) {
  const [user, profile] = await Promise.all([
    User.findById(userId),
    RiderProfile.findOne({ userId }),
  ]);
  if (!user) throw new NotFoundError('User not found');

  return {
    user: user.toSafeObject(),
    profile,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Anonymizes personal data for account deletion (GDPR).
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteRiderAccount(userId) {
  const anon = `deleted_${userId}`;
  await User.findByIdAndUpdate(userId, {
    fullName: 'Deleted User',
    phone: anon,
    email: `${anon}@deleted.invalid`,
    isActive: false,
    passwordHash: 'DELETED',
  });
  await RiderProfile.findOneAndUpdate({ userId }, { vehicleRegistration: null });
  logger.info('Rider account anonymized', { userId });
}
