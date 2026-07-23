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
    senderPhone:       { type: String },
    providerRef:       { type: String, index: true },   // Paypack transaction ref
    type:              { type: String, enum: ['swap_payment', 'wallet_topup', 'subscription'], default: 'swap_payment' },
    status:            { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    invoicePdfUrl:     { type: String },
    retryCount:        { type: Number, default: 0 },
    failureReason:     { type: String },
    refunded:          { type: Boolean, default: false },
    refundReason:      { type: String },
    refundedBy:        { type: Schema.Types.ObjectId, ref: 'User' },
    refundedAt:        { type: Date },
    timestamp:         { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PaymentSchema.index({ riderId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ provider: 1 });
PaymentSchema.index({ createdAt: -1 });

export default mongoose.model('Payment', PaymentSchema);
