/**
 * @file PendingTransaction.js
 * @description Short-lived PIN-gated transaction initiated by an operator.
 * Rider confirms with the PIN to apply the effect (topup / subscription / swap cost).
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const PendingTransactionSchema = new Schema(
  {
    riderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    operatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['wallet_topup', 'subscription', 'swap_cost'],
      required: true,
    },
    amountRwf:  { type: Number, required: true, min: 0 },
    planId:     { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    pinHash:    { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'cancelled'],
      default: 'pending',
    },
    attempts:    { type: Number, default: 0 },
    expiresAt:   { type: Date, required: true },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

PendingTransactionSchema.index({ riderId: 1, status: 1 });
PendingTransactionSchema.index({ operatorId: 1 });
PendingTransactionSchema.index({ expiresAt: 1 });

export default mongoose.model('PendingTransaction', PendingTransactionSchema);
