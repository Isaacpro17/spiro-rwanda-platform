/**
 * @file seed.js
 * @description Comprehensive database seeding script for Spiro Rwanda platform
 * Creates test data for all collections with proper relationships
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import User from './models/User.js';
import RiderProfile from './models/RiderProfile.js';
import Station from './models/Station.js';
import Battery from './models/Battery.js';
import SwapTransaction from './models/SwapTransaction.js';
import Payment from './models/Payment.js';
import SupportTicket from './models/SupportTicket.js';

/**
 * Generates a random date within the last N days
 */
function randomDateWithinDays(days) {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime);
}

/**
 * Generates a random number between min and max (inclusive)
 */
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Main seeding function
 */
async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to MongoDB
    await connectDB();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      RiderProfile.deleteMany({}),
      Station.deleteMany({}),
      Battery.deleteMany({}),
      SwapTransaction.deleteMany({}),
      Payment.deleteMany({}),
      SupportTicket.deleteMany({}),
    ]);
    console.log('✅ All collections cleared\n');

    // ==================== CREATE USERS ====================
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('Admin@1234', 12);
    const operatorPassword = await bcrypt.hash('Operator@1234', 12);
    const techPassword = await bcrypt.hash('Tech@1234', 12);
    const riderPassword = await bcrypt.hash('Rider@1234', 12);

    const users = await User.insertMany([
      // ── Admin ──
      {
        fullName: 'Admin Spiro',
        phone: '+250780000001',
        email: 'admin@spiro.rw',
        passwordHash: hashedPassword,
        role: 'admin',
        language: 'en',
        nid: '1199080012345678',
        isPhoneVerified: true,
        isActive: true,
      },
      // ── Operator ──
      {
        fullName: 'Jean Baptiste',
        phone: '+250780000002',
        email: 'operator@spiro.rw',
        passwordHash: operatorPassword,
        role: 'operator',
        language: 'en',
        nid: '1198570023456789',
        isPhoneVerified: true,
        isActive: true,
      },
      // ── Technician ──
      {
        fullName: 'Eric Mugisha',
        phone: '+250780000003',
        email: 'tech@spiro.rw',
        passwordHash: techPassword,
        role: 'technician',
        language: 'rw',
        nid: '1199760034567890',
        isPhoneVerified: true,
        isActive: true,
      },
      // ── Rider 1 ──
      {
        fullName: 'Test Rider',
        phone: '+250780000004',
        email: 'rider@spiro.rw',
        passwordHash: riderPassword,
        role: 'rider',
        language: 'en',
        nid: '1200180045678901',
        isPhoneVerified: true,
        isActive: true,
      },
      // ── Rider 2 ──
      {
        fullName: 'Marie Claire',
        phone: '+250780000005',
        email: 'rider2@spiro.rw',
        passwordHash: riderPassword,
        role: 'rider',
        language: 'rw',
        nid: '1199890056789012',
        isPhoneVerified: true,
        isActive: true,
      },
    ]);

    const [admin, operator, technician, rider1, rider2] = users;
    console.log(`✅ Created ${users.length} users\n`);

    // ==================== CREATE RIDER PROFILES ====================
    console.log('🏍️  Creating rider profiles...');
    const riderProfiles = await RiderProfile.insertMany([
      {
        userId: rider1._id,
        loyaltyPoints: 250,
        walletBalance: 25000,
        vehicleRegistration: 'RAC 001 A',
        motorcycleModel: 'Spiro Ace',
        emergencyContact: '+250780000099',
      },
      {
        userId: rider2._id,
        loyaltyPoints: 80,
        walletBalance: 12000,
        vehicleRegistration: 'RAB 002 B',
        motorcycleModel: 'Spiro One',
      },
    ]);
    console.log(`✅ Created ${riderProfiles.length} rider profiles\n`);

    // ==================== CREATE STATIONS ====================
    console.log('🏢 Creating stations...');
    const stations = await Station.insertMany([
      {
        name: 'Kigali Station 1 — Kimironko',
        stationCode: 'KGL-001',
        address: 'KG 1 Ave, Kimironko, Kigali',
        province: 'Kigali',
        location: {
          type: 'Point',
          coordinates: [30.1127, -1.9441],
        },
        totalSlots: 20,
        availableBatteries: 14,
        chargingBatteries: 4,
        operatorId: operator._id,
        status: 'active',
        operatingHours: {
          open: '06:00',
          close: '22:00',
        },
      },
      {
        name: 'Kigali Station 2 — Remera',
        stationCode: 'KGL-002',
        address: 'KG 2 Ave, Remera, Kigali',
        province: 'Kigali',
        location: {
          type: 'Point',
          coordinates: [30.1200, -1.9500],
        },
        totalSlots: 15,
        availableBatteries: 13,
        chargingBatteries: 2,
        operatorId: operator._id,
        status: 'active',
        operatingHours: {
          open: '06:00',
          close: '22:00',
        },
      },
      {
        name: 'Kigali Station 3 — Nyabugogo',
        stationCode: 'KGL-003',
        address: 'KG 3 Ave, Nyabugogo, Kigali',
        province: 'Kigali',
        location: {
          type: 'Point',
          coordinates: [30.0500, -1.9600],
        },
        totalSlots: 18,
        availableBatteries: 12,
        chargingBatteries: 3,
        operatorId: operator._id,
        status: 'active',
        operatingHours: {
          open: '06:00',
          close: '22:00',
        },
      },
      {
        name: 'Kigali Station 4 — Kicukiro',
        stationCode: 'KGL-004',
        address: 'KG 4 Ave, Kicukiro, Kigali',
        province: 'Kigali',
        location: {
          type: 'Point',
          coordinates: [30.0800, -2.0000],
        },
        totalSlots: 12,
        availableBatteries: 11,
        chargingBatteries: 1,
        operatorId: operator._id,
        status: 'active',
        operatingHours: {
          open: '06:00',
          close: '22:00',
        },
      },
      {
        name: 'Kigali Station 5 — Gikondo',
        stationCode: 'KGL-005',
        address: 'KG 5 Ave, Gikondo, Kigali',
        province: 'Kigali',
        location: {
          type: 'Point',
          coordinates: [30.0650, -1.9800],
        },
        totalSlots: 10,
        availableBatteries: 10,
        chargingBatteries: 0,
        operatorId: operator._id,
        status: 'active',
        operatingHours: {
          open: '06:00',
          close: '22:00',
        },
      },
    ]);
    console.log(`✅ Created ${stations.length} stations\n`);

    // ==================== CREATE BATTERIES ====================
    console.log('🔋 Creating batteries...');
    const batteryConfigs = [
      { station: stations[0], available: 14, charging: 4, faulty: 2 }, // Station 1: 20 total
      { station: stations[1], available: 13, charging: 2, faulty: 0 }, // Station 2: 15 total
      { station: stations[2], available: 12, charging: 3, faulty: 3 }, // Station 3: 18 total
      { station: stations[3], available: 11, charging: 1, faulty: 0 }, // Station 4: 12 total
      { station: stations[4], available: 10, charging: 0, faulty: 0 }, // Station 5: 10 total
    ];

    const allBatteries = [];

    for (const config of batteryConfigs) {
      const { station, available, charging, faulty } = config;
      const stationBatteries = [];
      let batteryNum = 1;

      // Create available batteries
      for (let i = 0; i < available; i++) {
        stationBatteries.push({
          serialNumber: `BAT-${station.stationCode.replace('-', '')}-${String(batteryNum).padStart(2, '0')}`,
          stationId: station._id,
          chargeLevel: randomBetween(85, 100),
          status: 'available',
          lastSwapAt: randomDateWithinDays(30),
          isFaulty: false,
        });
        batteryNum++;
      }

      // Create charging batteries
      for (let i = 0; i < charging; i++) {
        stationBatteries.push({
          serialNumber: `BAT-${station.stationCode.replace('-', '')}-${String(batteryNum).padStart(2, '0')}`,
          stationId: station._id,
          chargeLevel: randomBetween(20, 60),
          status: 'charging',
          lastSwapAt: randomDateWithinDays(30),
          isFaulty: false,
        });
        batteryNum++;
      }

      // Create faulty batteries
      for (let i = 0; i < faulty; i++) {
        stationBatteries.push({
          serialNumber: `BAT-${station.stationCode.replace('-', '')}-${String(batteryNum).padStart(2, '0')}`,
          stationId: station._id,
          chargeLevel: randomBetween(0, 50),
          status: 'faulty',
          lastSwapAt: randomDateWithinDays(30),
          isFaulty: true,
        });
        batteryNum++;
      }

      allBatteries.push(...stationBatteries);
    }

    const batteries = await Battery.insertMany(allBatteries);
    console.log(`✅ Created ${batteries.length} batteries\n`);

    // ==================== CREATE SWAP TRANSACTIONS ====================
    console.log('🔄 Creating swap transactions...');
    const swapTransactions = [];
    const stationsForSwaps = [stations[0], stations[1], stations[2]];

    // Create 8 completed swaps
    for (let i = 0; i < 8; i++) {
      const station = stationsForSwaps[i % 3];
      const stationBatteries = batteries.filter(b => b.stationId.equals(station._id));
      const depletedBattery = stationBatteries[randomBetween(0, stationBatteries.length - 1)];
      const chargedBattery = stationBatteries.find(b => b.status === 'available') || stationBatteries[0];

      const startTime = randomDateWithinDays(30);
      const durationMinutes = randomBetween(2, 5);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      swapTransactions.push({
        riderId: rider1._id,
        stationId: station._id,
        depletedBatteryId: depletedBattery._id,
        chargedBatteryId: chargedBattery._id,
        startTime,
        endTime,
        durationMinutes,
        amountRwf: 500,
        status: 'completed',
        swapCode: `SWP${Date.now()}${i}`,
      });
    }

    // Create 1 in-progress swap
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const station1Batteries = batteries.filter(b => b.stationId.equals(stations[0]._id));
    swapTransactions.push({
      riderId: rider1._id,
      stationId: stations[0]._id,
      depletedBatteryId: station1Batteries[0]._id,
      chargedBatteryId: station1Batteries[1]._id,
      startTime: thirtyMinutesAgo,
      status: 'in_progress',
      swapCode: 'SWP-ACTIVE-001',
    });

    const createdSwaps = await SwapTransaction.insertMany(swapTransactions);
    console.log(`✅ Created ${createdSwaps.length} swap transactions\n`);

    // ==================== CREATE PAYMENTS ====================
    console.log('💳 Creating payments...');
    const completedSwaps = createdSwaps.filter(s => s.status === 'completed');
    const payments = completedSwaps.map((swap, index) => ({
      transactionId: `TXN-${swap.swapCode}`,
      provider: index % 2 === 0 ? 'mtn_momo' : 'airtel_money',
      amountRwf: 500,
      currency: 'RWF',
      riderId: rider1._id,
      swapTransactionId: swap._id,
      status: 'success',
      timestamp: swap.startTime,
    }));

    const createdPayments = await Payment.insertMany(payments);
    console.log(`✅ Created ${createdPayments.length} payments\n`);

    // ==================== CREATE SUPPORT TICKETS ====================
    console.log('🎫 Creating support tickets...');
    const tickets = await SupportTicket.insertMany([
      {
        ticketNumber: 'TKT-001',
        riderId: rider1._id,
        subject: 'Battery swap issue at Station 1',
        description: 'The battery I received was showing only 60% charge after the swap.',
        category: 'swap',
        status: 'in_progress',
      },
      {
        ticketNumber: 'TKT-002',
        riderId: rider1._id,
        subject: 'Payment not reflected',
        description: 'I paid via MTN Mobile Money but my transaction does not show in history.',
        category: 'payment',
        status: 'open',
      },
      {
        ticketNumber: 'TKT-003',
        riderId: rider1._id,
        subject: 'App login issue',
        description: 'I was unable to log in for 2 hours yesterday evening.',
        category: 'account',
        status: 'resolved',
      },
    ]);
    console.log(`✅ Created ${tickets.length} support tickets\n`);

    // ==================== SUMMARY ====================
    console.log('═══════════════════════════════════════');
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Users created: ${users.length}`);
    console.log(`✅ RiderProfiles created: ${riderProfiles.length}`);
    console.log(`✅ Stations created: ${stations.length}`);
    console.log(`✅ Batteries created: ${batteries.length}`);
    console.log(`✅ SwapTransactions created: ${createdSwaps.length}`);
    console.log(`✅ Payments created: ${createdPayments.length}`);
    console.log(`✅ SupportTickets created: ${tickets.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('📋 TEST CREDENTIALS:');
    console.log('Admin:     admin@spiro.rw / Admin@1234');
    console.log('Operator:  operator@spiro.rw / Operator@1234');
    console.log('Technician: tech@spiro.rw / Tech@1234');
    console.log('Rider 1:   rider@spiro.rw / Rider@1234');
    console.log('Rider 2:   rider2@spiro.rw / Rider@1234');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run the seed
seed();
