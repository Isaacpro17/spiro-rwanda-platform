/**
 * @file SlotReservation.js
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const SlotReservationSchema = new Schema(
  {
    riderId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stationId:        { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    reservedTime:     { type: Date, required: true },
    cancellationCode: { type: String, required: true },
    status:           { type: String, enum: ['confirmed', 'cancelled', 'expired', 'completed'], default: 'confirmed' },
    cancelledBy:      { type: String, enum: ['rider', 'system'] },
    cancelledAt:      { type: Date },
    queuePosition:    { type: Number },
  },
  { timestamps: true }
);

SlotReservationSchema.index({ riderId: 1 });
SlotReservationSchema.index({ stationId: 1 });
SlotReservationSchema.index({ status: 1 });
SlotReservationSchema.index({ reservedTime: 1 });

export default mongoose.model('SlotReservation', SlotReservationSchema);
