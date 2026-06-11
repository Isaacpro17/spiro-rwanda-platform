/**
 * @file subscriptionService.js
 * @description Subscription plan management: listing, subscribing, wallet deduction.
 */

import SubscriptionPlan from '../models/SubscriptionPlan.js';
import RiderProfile from '../models/RiderProfile.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Returns all active subscription plans, sorted by price ascending.
 * @returns {Promise<SubscriptionPlan[]>}
 */
export async function getActivePlans() {
  return SubscriptionPlan.find({ isActive: true }).sort({ priceRwf: 1 }).lean();
}

/**
 * Subscribes a rider to a plan by deducting from wallet balance.
 * @param {string} riderId
 * @param {string} planId
 * @returns {Promise<{ profile: RiderProfile, plan: SubscriptionPlan }>}
 */
export async function subscribeToPlan(riderId, planId) {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) throw new NotFoundError('Subscription plan not found');
  if (!plan.isActive) throw new ValidationError('This plan is no longer available');

  let profile = await RiderProfile.findOne({ userId: riderId });
  if (!profile) {
    profile = await RiderProfile.create({ userId: riderId });
  }

  if (profile.walletBalance < plan.priceRwf) {
    throw new ValidationError(
      `Insufficient wallet balance. You need RWF ${plan.priceRwf.toLocaleString()} but have RWF ${profile.walletBalance.toLocaleString()}. Please top up your wallet first.`
    );
  }

  const updated = await RiderProfile.findOneAndUpdate(
    { userId: riderId },
    {
      subscriptionPlanId: planId,
      $inc: { walletBalance: -plan.priceRwf },
    },
    { new: true }
  ).populate('subscriptionPlanId');

  logger.info('Rider subscribed to plan', {
    riderId,
    planId,
    planName: plan.name,
    amountDeducted: plan.priceRwf,
    newBalance: updated.walletBalance,
  });

  return { profile: updated, plan };
}

/**
 * Gets the rider's current active subscription plan.
 * @param {string} riderId
 * @returns {Promise<SubscriptionPlan | null>}
 */
export async function getCurrentSubscription(riderId) {
  const profile = await RiderProfile.findOne({ userId: riderId })
    .populate('subscriptionPlanId')
    .lean();
  return profile?.subscriptionPlanId || null;
}
