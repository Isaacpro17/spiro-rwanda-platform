/**
 * @file Station.js
 * @description Battery swap station schema with geospatial index.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const StationSchema = new Schema(
  {
    name:    { type: String, required: true, trim: true },
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address:  { type: String, trim: true },
    province: { type: String, trim: true },
    operatingHours: {
      open:  { type: String, default: '06:00' },
      close: { type: String, default: '22:00' },
    },
    totalSlots:            { type: Number, required: true, min: 1 },
    availableBatteries:    { type: Number, default: 0, min: 0 },
    chargingBatteries:     { type: Number, default: 0, min: 0 },
    lowInventoryThreshold: { type: Number, default: 3 },
    status:    { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    operatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTechnicians: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    stationCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

StationSchema.index({ location: '2dsphere' });
StationSchema.index({ status: 1 });
StationSchema.index({ operatorId: 1 });

export default mongoose.model('Station', StationSchema);
