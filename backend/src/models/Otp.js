/**
 * @file Otp.js
 * @description OTP schema with TTL auto-expiry after 10 minutes.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const OtpSchema = new Schema(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    code:      { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes documents after expiresAt
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ userId: 1 });

export default mongoose.model('Otp', OtpSchema);
