/**
 * @file SubscriptionPlan.js
 * @description Subscription plan definitions.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const SubscriptionPlanSchema = new Schema(
  {
    name:                       { type: String, required: true, unique: true },
    swapsPerMonth:              { type: Number },
    priceRwf:                   { type: Number, required: true, min: 0 },
    loyaltyPointsPerSwap:       { type: Number, default: 10 },
    loyaltyRedemptionThreshold: { type: Number, default: 100 },
    renewalDayOfMonth:          { type: Number, min: 1, max: 31 },
    isActive:                   { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
