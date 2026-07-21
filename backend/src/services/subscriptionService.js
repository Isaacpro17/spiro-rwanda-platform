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

/**
 * Returns a paginated list of all riders who currently have a subscription plan.
 * @param {Object} query - { page?, limit?, planId? }
 * @returns {Promise<{ subscribers, total, page, limit, pages }>}
 */
export async function getSubscribers(query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const filter = { subscriptionPlanId: { $ne: null } };
  if (query.planId) filter.subscriptionPlanId = query.planId;

  const [subscribers, total] = await Promise.all([
    RiderProfile.find(filter)
      .populate('userId', 'fullName phone email isActive')
      .populate('subscriptionPlanId', 'name priceRwf swapsPerMonth')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RiderProfile.countDocuments(filter),
  ]);

  return { subscribers, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Admin removes a rider's subscription plan (does not issue a refund).
 * @param {string} riderId
 * @returns {Promise<{ riderId: string, previousPlanId: string }>}
 */
export async function removeSubscription(riderId) {
  const profile = await RiderProfile.findOne({ userId: riderId });
  if (!profile) throw new NotFoundError('Rider profile not found');
  if (!profile.subscriptionPlanId) throw new ValidationError('This rider has no active subscription');

  const previousPlanId = profile.subscriptionPlanId.toString();
  await RiderProfile.findOneAndUpdate(
    { userId: riderId },
    { $unset: { subscriptionPlanId: 1 } },
  );

  logger.info('Subscription removed by admin', { riderId, previousPlanId });
  return { riderId, previousPlanId };
}
