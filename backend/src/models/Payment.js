/**
 * @file Payment.js
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    transactionId:     { type: String, required: true, unique: true },
    provider:          { type: String, enum: ['mtn_momo', 'airtel_money', 'cash'], required: true },
    amountRwf:         { type: Number, required: true, min: 0 },
    currency:          { type: String, default: 'RWF' },
    riderId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    swapTransactionId: { type: Schema.Types.ObjectId, ref: 'SwapTransaction' },
    status:            { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    invoicePdfUrl:     { type: String },
    retryCount:        { type: Number, default: 0 },
    failureReason:     { type: String },
    timestamp:         { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PaymentSchema.index({ riderId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ provider: 1 });
PaymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', PaymentSchema);
