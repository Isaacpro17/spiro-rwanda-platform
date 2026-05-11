/**
 * @file seed-admin.js
 * @description One-time script to create an admin user directly in MongoDB,
 * bypassing the OTP flow. Run this ONCE to bootstrap the first admin account.
 *
 * Usage (from the backend/ directory):
 *   node seed-admin.js
 *
 * The script will:
 *   1. Connect to MongoDB using your .env settings
 *   2. Create an admin user with the credentials below
 *   3. Mark the account as verified and active
 *   4. Disconnect and exit
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ─── Admin credentials — CHANGE THESE before running ─────────────────────────
const ADMIN = {
  fullName:  'Spiro Admin',
  phone:     '+250781000000',   // ← Change to your phone number
  email:     'admin@spiro.rw',  // ← Change to your email
  password:  'Admin@1234!',     // ← Change to a strong password (min 8 chars)
  role:      'admin',
  language:  'en',
};
// ─────────────────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spiro-rwanda';

// Inline User schema (avoids circular import issues in standalone scripts)
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

async function seedAdmin() {
  console.log('\n🚀 Spiro Rwanda — Admin Seeder\n');
  console.log(`📦 Connecting to MongoDB: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ MongoDB connected\n');

  // Check if admin already exists
  const existing = await User.findOne({
    $or: [{ phone: ADMIN.phone }, { email: ADMIN.email }],
  });

  if (existing) {
    console.log(`⚠️  A user with phone "${ADMIN.phone}" or email "${ADMIN.email}" already exists.`);
    console.log(`   Role: ${existing.role} | Active: ${existing.isActive}`);
    console.log('\n   If you need to reset the password, delete the user from MongoDB Compass');
    console.log('   and run this script again.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 12);

  const user = await User.create({
    fullName:        ADMIN.fullName,
    phone:           ADMIN.phone,
    email:           ADMIN.email,
    passwordHash,
    role:            ADMIN.role,
    language:        ADMIN.language,
    isPhoneVerified: true,   // Skip OTP for seed account
    isActive:        true,   // Activate immediately
  });

  console.log('✅ Admin user created successfully!\n');
  console.log('─'.repeat(45));
  console.log(`  Name  : ${user.fullName}`);
  console.log(`  Phone : ${user.phone}   ← use this to log in`);
  console.log(`  Email : ${user.email}`);
  console.log(`  Role  : ${user.role}`);
  console.log(`  ID    : ${user._id}`);
  console.log('─'.repeat(45));
  console.log('\n📋 Login credentials:');
  console.log(`  Phone    : ${ADMIN.phone}`);
  console.log(`  Password : ${ADMIN.password}`);
  console.log('\n🌐 Open the web portal at: http://localhost:3000\n');

  await mongoose.disconnect();
  console.log('👋 Done — MongoDB disconnected.\n');
}

seedAdmin().catch((err) => {
  console.error('\n❌ Seeder failed:', err.message);
  process.exit(1);
});
