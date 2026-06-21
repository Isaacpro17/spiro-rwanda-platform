/**
 * @file SystemSettings.js
 * @description Singleton document for admin-configurable system parameters.
 * Only one document should ever exist — use findOne / findOneAndUpdate with upsert.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const SwapPricingTierSchema = new Schema(
  {
    name:        { type: String, required: true, trim: true },
    priceRwf:    { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

// SMS templates use {{token}} placeholders, stored as nested groups matching MongoDB paths
// e.g. 'reservation.confirmed' → smsTemplates.en.reservation.confirmed
const SmsTemplateMapSchema = new Schema(
  {
    reservation: {
      confirmed: { type: String, default: '' },
      cancelled: { type: String, default: '' },
      expired:   { type: String, default: '' },
    },
    payment: {
      success: { type: String, default: '' },
      failed:  { type: String, default: '' },
    },
    swap:        { completed:  { type: String, default: '' } },
    low:         { inventory:  { type: String, default: '' } },
    maintenance: { created:    { type: String, default: '' } },
  },
  { _id: false }
);

const SystemSettingsSchema = new Schema(
  {
    // Per-swap pricing tiers (for non-subscription or metered riders)
    swapPricingTiers: { type: [SwapPricingTierSchema], default: [] },

    // Default operating hours applied to newly created stations
    defaultOperatingHours: {
      open:  { type: String, default: '06:00' },
      close: { type: String, default: '22:00' },
    },

    // Editable SMS notification templates (EN + RW)
    smsTemplates: {
      en: { type: SmsTemplateMapSchema, default: () => ({}) },
      rw: { type: SmsTemplateMapSchema, default: () => ({}) },
    },

    // Security / authentication settings
    otpExpiryMinutes:  { type: Number, default: 10,  min: 1, max: 60 },
    maxFailedAttempts: { type: Number, default: 5,   min: 1, max: 20 },
    lockoutMinutes:    { type: Number, default: 30,  min: 1, max: 1440 },
  },
  { timestamps: true }
);

export default mongoose.model('SystemSettings', SystemSettingsSchema);
