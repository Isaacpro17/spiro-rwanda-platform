/**
 * @file AuditEntry.js
 * @description Append-only audit trail. No updates or deletes permitted.
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const AuditEntrySchema = new Schema(
  {
    eventType:    { type: String, required: true },
    actorUserId:  { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole:    { type: String },
    resourceId:   { type: String },
    resourceType: { type: String },
    ipAddress:    { type: String },
    description:  { type: String },
    timestamp:    { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false }
);

AuditEntrySchema.index({ eventType: 1 });
AuditEntrySchema.index({ actorUserId: 1 });
AuditEntrySchema.index({ timestamp: -1 });
AuditEntrySchema.index({ resourceId: 1 });

export default mongoose.model('AuditEntry', AuditEntrySchema);
