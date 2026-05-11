/**
 * @file User.js
 * @description Mongoose schema for all platform users (Rider, Operator, Admin, Technician).
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    fullName:          { type: String, required: true, trim: true, maxlength: 100 },
    phone:             { type: String, required: true, unique: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:      { type: String, required: true },
    role:              { type: String, enum: ['rider', 'operator', 'admin', 'technician'], required: true },
    language:          { type: String, enum: ['rw', 'en'], default: 'rw' },
    isPhoneVerified:   { type: Boolean, default: false },
    isActive:          { type: Boolean, default: false },
    biometricEnrolled: { type: Boolean, default: false },
    failedLoginCount:  { type: Number, default: 0 },
    lockedUntil:       { type: Date, default: null },
    nid:               { type: String, trim: true },
    profilePicture:    { type: String },
    lastLoginAt:       { type: Date },
  },
  { timestamps: true }
);

// phone and email are indexed via unique:true above — no duplicate index() needed
UserSchema.index({ role: 1 });


/** Strip passwordHash from JSON output */
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.failedLoginCount;
  delete obj.lockedUntil;
  return obj;
};

export default mongoose.model('User', UserSchema);
