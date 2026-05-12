/**
 * @file RiderProfile.js
 * @description Extended profile for Rider role users.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const RiderProfileSchema = new Schema(
  {
    userId:              { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleRegistration: { type: String, trim: true },
    motorcycleModel:     { type: String, trim: true },
    isVehicleVerified:   { type: Boolean, default: false },
    subscriptionPlanId:  { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    loyaltyPoints:       { type: Number, default: 0, min: 0 },
    emergencyContact:    { type: String },
  },
  { timestamps: true }
);

// userId is indexed via unique:true above — no duplicate index() needed


export default mongoose.model('RiderProfile', RiderProfileSchema);
