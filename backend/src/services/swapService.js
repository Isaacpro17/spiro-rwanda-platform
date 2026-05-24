/**
 * @file swapService.js
 * @description Battery swap management: reservations, completions, cancellations.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import SwapTransaction from '../models/SwapTransaction.js';
import SlotReservation from '../models/SlotReservation.js';
import Station from '../models/Station.js';
import Battery from '../models/Battery.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { broadcastQueueUpdate } from './queueService.js';
import logger from '../utils/logger.js';

const MAX_RESERVATION_HOURS = 2;
const AUTO_CANCEL_MINUTES = 15;

/**
 * Creates a slot reservation (max 2 hours ahead).
 * @param {string} riderId
 * @param {string} stationId
 * @param {Date} requestedTime
 * @returns {Promise<SlotReservation>}
 */
export async function createReservation(riderId, stationId, requestedTime) {
  const now = new Date();
  const maxTime = new Date(now.getTime() + MAX_RESERVATION_HOURS * 60 * 60 * 1000);

  if (requestedTime > maxTime) {
    throw new ValidationError(`Reservations can only be made up to ${MAX_RESERVATION_HOURS} hours in advance`);
  }

  const station = await Station.findById(stationId);
  if (!station) throw new NotFoundError('Station not found');
  if (station.status !== 'active') throw new ValidationError('Station is not currently active');
  if (station.availableBatteries < 1) throw new ValidationError('No batteries available at this station');

  // Enforce 1 active reservation per rider
  const existingReservation = await SlotReservation.findOne({
    riderId,
    status:       'confirmed',
    reservedTime: { $gte: new Date() },
  });
  if (existingReservation) {
    throw new ValidationError(
      'You already have an active reservation. Please cancel it before creating a new one.'
    );
  }

  const cancellationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Count existing confirmed reservations for queue position
  const queueCount = await SlotReservation.countDocuments({ stationId, status: 'confirmed' });

  const reservation = await SlotReservation.create({
    riderId,
    stationId,
    reservedTime: requestedTime,
    cancellationCode,
    queuePosition: queueCount + 1,
  });

  logger.info('Slot reservation created', { reservationId: reservation._id, riderId, stationId });
  return reservation;
}

/**
 * Completes a swap transaction atomically using MongoDB session.
 * @param {string} riderId
 * @param {string} stationId
 * @param {string} depletedBatteryId
 * @param {string} chargedBatteryId
 * @param {import('socket.io').Server} io
 * @returns {Promise<SwapTransaction>}
 */
export async function completeSwap(riderId, stationId, depletedBatteryId, chargedBatteryId, io) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const startTime = new Date();
    const swapCode = `SWP${Date.now()}`;

    // Create swap transaction
    const [swap] = await SwapTransaction.create(
      [{ riderId, stationId, depletedBatteryId, chargedBatteryId, startTime, status: 'in_progress', swapCode }],
      { session }
    );

    // Update depleted battery → charging
    await Battery.findByIdAndUpdate(depletedBatteryId, { status: 'charging', lastSwapAt: new Date() }, { session });

    // Update charged battery → in_use
    await Battery.findByIdAndUpdate(chargedBatteryId, { status: 'in_use', lastSwapAt: new Date() }, { session });

    // Decrement available batteries
    await Station.findByIdAndUpdate(stationId, { $inc: { availableBatteries: -1 } }, { session });

    // Mark swap complete
    const endTime = new Date();
    const durationMinutes = Math.round((endTime - startTime) / 60000) || 1;
    await SwapTransaction.findByIdAndUpdate(
      swap._id,
      { status: 'completed', endTime, durationMinutes },
      { session }
    );

    await session.commitTransaction();

    // Broadcast inventory update
    if (io) {
      const station = await Station.findById(stationId);
      io.to(`station:${stationId}`).emit('station:inventory_update', {
        stationId,
        available: station?.availableBatteries,
      });
    }

    await broadcastQueueUpdate(stationId, io);

    logger.info('Swap completed', { swapId: swap._id, riderId, stationId });
    return swap;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * Cancels a reservation.
 * @param {string} reservationId
 * @param {string} cancelledBy - 'rider' | 'system'
 * @param {import('socket.io').Server} io
 * @returns {Promise<void>}
 */
export async function cancelReservation(reservationId, cancelledBy, io) {
  const reservation = await SlotReservation.findById(reservationId);
  if (!reservation) throw new NotFoundError('Reservation not found');
  if (reservation.status !== 'confirmed') throw new ValidationError('Reservation is not active');

  await SlotReservation.findByIdAndUpdate(reservationId, {
    status: 'cancelled',
    cancelledBy,
    cancelledAt: new Date(),
  });

  await broadcastQueueUpdate(reservation.stationId.toString(), io);
  logger.info('Reservation cancelled', { reservationId, cancelledBy });
}

/**
 * Auto-cancels reservations that are 15+ minutes past their slot time.
 * Called by a scheduled job.
 * @param {import('socket.io').Server} io
 * @returns {Promise<number>} count of cancelled reservations
 */
export async function autoExpireReservations(io) {
  const cutoff = new Date(Date.now() - AUTO_CANCEL_MINUTES * 60 * 1000);

  const expired = await SlotReservation.find({
    status: 'confirmed',
    reservedTime: { $lt: cutoff },
  });

  for (const res of expired) {
    await cancelReservation(res._id.toString(), 'system', io);
  }

  if (expired.length > 0) {
    logger.info(`Auto-expired ${expired.length} reservations`);
  }

  return expired.length;
}

/**
 * Returns step-by-step swap guidance in the user's language.
 * @param {'rw'|'en'} language
 * @returns {Array<string>}
 */
export function getSwapGuidance(language) {
  const steps = {
    en: [
      'Show your confirmation code to the station operator',
      'Hand over your depleted battery',
      'Receive your fully charged battery',
      'Confirm the swap on the app',
      'Proceed to payment',
    ],
    rw: [
      'Erekana kode yawe ya kwemeza umunyamabanga wa sitasiyo',
      'Tanga bateri yawe yashize',
      'Akira bateri nshya yuzuye',
      'Emeza guhindura kuri apulikasiyo',
      'Komeza kwishyura',
    ],
  };
  return steps[language] || steps.en;
}


/**
 * Get all bookings/reservations (admin view)
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Paginated bookings
 */
export async function getAllBookings(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.stationId) filter.stationId = query.stationId;
  if (query.riderId) filter.riderId = query.riderId;
  if (query.startDate || query.endDate) {
    filter.reservedTime = {};
    if (query.startDate) filter.reservedTime.$gte = new Date(query.startDate);
    if (query.endDate) filter.reservedTime.$lte = new Date(query.endDate);
  }

  const [bookings, total] = await Promise.all([
    SlotReservation.find(filter)
      .populate('riderId', 'fullName phone email')
      .populate('stationId', 'name location address')
      .sort({ reservedTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SlotReservation.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get booking statistics (admin)
 * @returns {Promise<Object>} Booking statistics
 */
export async function getBookingStats() {
  const [total, byStatus, todayBookings, upcomingBookings] = await Promise.all([
    SlotReservation.countDocuments(),
    SlotReservation.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]),
    SlotReservation.countDocuments({
      reservedTime: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    SlotReservation.countDocuments({
      reservedTime: { $gte: new Date() },
      status: 'confirmed',
    }),
  ]);

  const statusStats = {};
  byStatus.forEach((item) => {
    statusStats[item.status] = item.count;
  });

  return {
    total,
    byStatus: statusStats,
    todayBookings,
    upcomingBookings,
  };
}

/**
 * Get all swap transactions (admin view)
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} Paginated swaps
 */
export async function getAllSwaps(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.stationId) filter.stationId = query.stationId;
  if (query.riderId) filter.riderId = query.riderId;
  if (query.startDate || query.endDate) {
    filter.swapTime = {};
    if (query.startDate) filter.swapTime.$gte = new Date(query.startDate);
    if (query.endDate) filter.swapTime.$lte = new Date(query.endDate);
  }

  const [swaps, total] = await Promise.all([
    SwapTransaction.find(filter)
      .populate('riderId', 'fullName phone email')
      .populate('stationId', 'name location address')
      .populate('depletedBatteryId', 'serialNumber chargeLevel')
      .populate('chargedBatteryId', 'serialNumber chargeLevel')
      .sort({ swapTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SwapTransaction.countDocuments(filter),
  ]);

  return {
    swaps,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get swap statistics (admin)
 * @returns {Promise<Object>} Swap statistics
 */
export async function getSwapStats() {
  const [total, byStatus, todaySwaps, avgDuration] = await Promise.all([
    SwapTransaction.countDocuments(),
    SwapTransaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
    ]),
    SwapTransaction.countDocuments({
      swapTime: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }),
    SwapTransaction.aggregate([
      { $match: { durationSeconds: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: '$durationSeconds' } } },
    ]),
  ]);

  const statusStats = {};
  byStatus.forEach((item) => {
    statusStats[item.status] = item.count;
  });

  return {
    total,
    byStatus: statusStats,
    todaySwaps,
    averageDurationSeconds: Math.round(avgDuration[0]?.avgDuration || 0),
  };
}
