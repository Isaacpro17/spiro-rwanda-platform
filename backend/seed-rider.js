/**
 * @file seed-rider.js
 * @description Script to create a test rider user
 *
 * Usage (from the backend/ directory):
 *   node seed-rider.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ─── Rider credentials ─────────────────────────────────────────────────────
const RIDER = {
  fullName:  'Test Rider',
  phone:     '+250788111111',
  email:     'rider@test.com',
  password:  'Rider@123!',
  role:      'rider',
  language:  'en',
};
// ─────────────────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spiro-rwanda';

// Inline User schema
const UserSchema = new mongoose.Schema(
  {
    fullName:          { type: String, required: true },
    phone:             { type: String, required: true, unique: true },
    email:             { type: String, required: true, unique: true },
    passwordHash:      { type: String, required: true },
    role:              { type: String, required: true },
    language:          { type: String, default: 'rw' },
    isPhoneVerified:   { type: Boolean, default: false },
    isActive:          { type: Boolean, default: false },
    biometricEnrolled: { type: Boolean, default: false },
    failedLoginCount:  { type: Number, default: 0 },
    lockedUntil:       { type: Date, default: null },
    nid:               { type: String },
    profilePicture:    { type: String },
    lastLoginAt:       { type: Date },
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);

async function seedRider() {
  console.log('\n🚀 Spiro Rwanda — Rider Seeder\n');
  console.log(`📦 Connecting to MongoDB: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ MongoDB connected\n');

  // Check if rider already exists
  const existing = await User.findOne({
    $or: [{ phone: RIDER.phone }, { email: RIDER.email }],
  });

  if (existing) {
    console.log(`⚠️  A user with phone "${RIDER.phone}" or email "${RIDER.email}" already exists.`);
    console.log(`   Role: ${existing.role} | Active: ${existing.isActive}`);
    console.log('\n   If you need to reset, delete the user from MongoDB and run this script again.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(RIDER.password, 12);

  const user = await User.create({
    fullName:        RIDER.fullName,
    phone:           RIDER.phone,
    email:           RIDER.email,
    passwordHash,
    role:            RIDER.role,
    language:        RIDER.language,
    isPhoneVerified: true,   // Skip OTP for test account
    isActive:        true,   // Activate immediately
  });

  console.log('✅ Rider user created successfully!\n');
  console.log('─'.repeat(45));
  console.log(`  Name  : ${user.fullName}`);
  console.log(`  Phone : ${user.phone}   ← use this to log in`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Role  : ${user.role}`);
  console.log(`  ID    : ${user._id}`);
  console.log('─'.repeat(45));
  console.log('\n📋 Login credentials:');
  console.log(`  Phone    : ${RIDER.phone}`);
  console.log(`  Password : ${RIDER.password}`);
  console.log('\n🌐 Open the web portal at: http://localhost:3000\n');

  await mongoose.disconnect();
  console.log('👋 Done — MongoDB disconnected.\n');
}

seedRider().catch((err) => {
  console.error('\n❌ Seeder failed:', err.message);
  process.exit(1);
});
