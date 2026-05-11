/**
 * @file Battery.js
 * @description Individual battery unit schema.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const BatterySchema = new Schema(
  {
    serialNumber: { type: String, required: true, unique: true, trim: true },
    stationId:    { type: Schema.Types.ObjectId, ref: 'Station' },
    status:       { type: String, enum: ['available', 'charging', 'in_use', 'faulty', 'repair'], default: 'charging' },
    chargeLevel:  { type: Number, min: 0, max: 100, default: 0 },
    lastSwapAt:   { type: Date },
    isFaulty:     { type: Boolean, default: false },
    repairCount:  { type: Number, default: 0 },
    arrivedForRepairAt: { type: Date },
  },
  { timestamps: true }
);

BatterySchema.index({ stationId: 1 });
BatterySchema.index({ status: 1 });
// serialNumber is indexed via unique:true above — no duplicate index() needed


export default mongoose.model('Battery', BatterySchema);
