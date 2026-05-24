/**
 * @file patch-rider-profile.js
 * @description Patches existing rider profiles with walletBalance and subscriptionPlanId.
 *              Safe to run multiple times (idempotent).
 *
 * Usage (from the backend/ directory):
 *   node patch-rider-profile.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spiro-rwanda';

// ── Inline schemas (avoid circular imports) ──────────────────────────────────

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    name:                       { type: String, required: true, unique: true },
    swapsPerMonth:              { type: Number },
    priceRwf:                   { type: Number, required: true, min: 0 },
    loyaltyPointsPerSwap:       { type: Number, default: 10 },
    loyaltyRedemptionThreshold: { type: Number, default: 100 },
    renewalDayOfMonth:          { type: Number, min: 1, max: 31 },
    isActive:                   { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RiderProfileSchema = new mongoose.Schema(
  {
    userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleRegistration: { type: String, trim: true },
    motorcycleModel:     { type: String, trim: true },
    isVehicleVerified:   { type: Boolean, default: false },
    subscriptionPlanId:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    loyaltyPoints:       { type: Number, default: 0, min: 0 },
    walletBalance:       { type: Number, default: 0, min: 0 },
    emergencyContact:    { type: String },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema({
  fullName: String,
  phone:    String,
  email:    String,
  role:     String,
}, { timestamps: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
const RiderProfile     = mongoose.model('RiderProfile', RiderProfileSchema);
const User             = mongoose.model('User', UserSchema);

// ── Subscription plans to ensure exist ───────────────────────────────────────

const PLANS = [
  { name: 'Basic',    priceRwf: 5000,  swapsPerMonth: 10, loyaltyPointsPerSwap: 5,  renewalDayOfMonth: 1 },
  { name: 'Standard', priceRwf: 9000,  swapsPerMonth: 20, loyaltyPointsPerSwap: 10, renewalDayOfMonth: 1 },
  { name: 'Premium',  priceRwf: 15000, swapsPerMonth: 40, loyaltyPointsPerSwap: 20, renewalDayOfMonth: 1 },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function patch() {
  console.log('\n🔧 Spiro Rwanda — Rider Profile Patcher\n');
  console.log(`📦 Connecting to: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log('✅ Connected\n');

  // 1. Upsert subscription plans
  console.log('📋 Ensuring subscription plans exist...');
  for (const plan of PLANS) {
    await SubscriptionPlan.findOneAndUpdate(
      { name: plan.name },
      { $setOnInsert: plan },
      { upsert: true, new: true }
    );
    console.log(`   ✓ Plan "${plan.name}" — RWF ${plan.priceRwf.toLocaleString()} / ${plan.swapsPerMonth} swaps`);
  }

  const standardPlan = await SubscriptionPlan.findOne({ name: 'Standard' });
  console.log(`\n📌 Default plan for unsubscribed riders: Standard (${standardPlan._id})\n`);

  // 2. Find all riders
  const riders = await User.find({ role: 'rider' });
  console.log(`🏍️  Found ${riders.length} rider(s)\n`);

  for (const rider of riders) {
    // Find or create profile
    let profile = await RiderProfile.findOne({ userId: rider._id });

    if (!profile) {
      profile = await RiderProfile.create({
        userId:            rider._id,
        walletBalance:     25000,
        subscriptionPlanId: standardPlan._id,
        loyaltyPoints:     0,
      });
      console.log(`   ✅ Created profile for ${rider.fullName} (${rider.email})`);
    } else {
      // Patch missing fields without overwriting existing data
      const updates = {};

      if (profile.walletBalance == null || profile.walletBalance === 0) {
        updates.walletBalance = 25000; // Seed with RWF 25,000
      }
      if (!profile.subscriptionPlanId) {
        updates.subscriptionPlanId = standardPlan._id;
      }

      if (Object.keys(updates).length > 0) {
        await RiderProfile.updateOne({ _id: profile._id }, { $set: updates });
        console.log(`   ✅ Patched ${rider.fullName} (${rider.email}):`, updates);
      } else {
        console.log(`   ℹ️  ${rider.fullName} (${rider.email}) — already complete, skipped`);
      }
    }
  }

  console.log('\n✅ Patch complete!\n');
  console.log('📊 Riders will now show:');
  console.log('   • Wallet Balance: RWF 25,000 (unless already set)');
  console.log('   • Active Plan: Standard');
  console.log('   • Battery Level: derived from latest completed swap (shows — if no swaps yet)\n');

  await mongoose.disconnect();
  console.log('👋 Done\n');
}

patch().catch((err) => {
  console.error('\n❌ Patch failed:', err.message);
  process.exit(1);
});
