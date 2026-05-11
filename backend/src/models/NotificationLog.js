/**
 * @file NotificationLog.js
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const NotificationLogSchema = new Schema(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channel:         { type: String, enum: ['sms', 'in_app'], required: true },
    messageKey:      { type: String },
    messageContent:  { type: String },
    language:        { type: String, enum: ['rw', 'en'], default: 'rw' },
    status:          { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
    retryCount:      { type: Number, default: 0 },
    deliveredAt:     { type: Date },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ recipientUserId: 1 });
NotificationLogSchema.index({ status: 1 });

export default mongoose.model('NotificationLog', NotificationLogSchema);
