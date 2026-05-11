/**
 * @file SwapTransaction.js
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const SwapTransactionSchema = new Schema(
  {
    riderId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stationId:         { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    depletedBatteryId: { type: Schema.Types.ObjectId, ref: 'Battery', required: true },
    chargedBatteryId:  { type: Schema.Types.ObjectId, ref: 'Battery', required: true },
    startTime:         { type: Date, required: true },
    endTime:           { type: Date },
    durationMinutes:   { type: Number },
    amountRwf:         { type: Number },
    paymentId:         { type: Schema.Types.ObjectId, ref: 'Payment' },
    status:            { type: String, enum: ['in_progress', 'completed', 'cancelled'], default: 'in_progress' },
    swapCode:          { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

SwapTransactionSchema.index({ riderId: 1 });
SwapTransactionSchema.index({ stationId: 1 });
SwapTransactionSchema.index({ status: 1 });
SwapTransactionSchema.index({ createdAt: -1 });

export default mongoose.model('SwapTransaction', SwapTransactionSchema);
