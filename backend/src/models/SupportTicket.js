/**
 * @file SupportTicket.js
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

const SupportTicketSchema = new Schema(
  {
    ticketNumber:  { type: String, required: true, unique: true },
    riderId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject:       { type: String, required: true },
    description:   { type: String, required: true },
    category:      { type: String, enum: ['payment', 'swap', 'account', 'other'], required: true },
    screenshotUrl: { type: String },
    status:        { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    assignedTo:    { type: Schema.Types.ObjectId, ref: 'User' },
    resolution:    { type: String },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ riderId: 1 });
SupportTicketSchema.index({ status: 1 });

const FaqSchema = new Schema(
  {
    question_en: { type: String, required: true },
    question_rw: { type: String },
    answer_en:   { type: String, required: true },
    answer_rw:   { type: String },
    category:    { type: String },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

FaqSchema.index({ question_en: 'text', answer_en: 'text', question_rw: 'text', answer_rw: 'text' });

export const Faq = mongoose.model('Faq', FaqSchema);
export default mongoose.model('SupportTicket', SupportTicketSchema);
