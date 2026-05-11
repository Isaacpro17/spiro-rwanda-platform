/**
 * @file MaintenanceRequest.js
 * @description Equipment maintenance request schema.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const MaintenanceRequestSchema = new Schema(
  {
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true },
    createdByOperator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    equipment: { type: String, required: true },
    faultDescription: { type: String, required: true },
    urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'resolved'], default: 'open' },
    assignedTechnician: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

MaintenanceRequestSchema.index({ stationId: 1 });
MaintenanceRequestSchema.index({ status: 1 });

export default mongoose.model('MaintenanceRequest', MaintenanceRequestSchema);
