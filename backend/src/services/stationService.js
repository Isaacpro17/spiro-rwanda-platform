/**
 * @file stationService.js
 * @description Station management: CRUD, inventory, maintenance.
 */

import mongoose from 'mongoose';
import Station from '../models/Station.js';
import Battery from '../models/Battery.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import SwapTransaction from '../models/SwapTransaction.js';
import SlotReservation from '../models/SlotReservation.js';
import Payment from '../models/Payment.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Lists stations with optional geo filter.
 * @param {{ lat?: number, lng?: number, radius?: number, status?: string }} filters
 * @returns {Promise<Array>}
 */
export async function listStations(filters = {}) {
  const query = {};

  if (filters.status) query.status = filters.status;

  if (filters.lat && filters.lng) {
    const radius = filters.radius || 10000; // 10km default
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(filters.lng), parseFloat(filters.lat)] },
        $maxDistance: radius,
      },
    };
  }

  return Station.find(query)
    .populate('operatorId', 'fullName phone')
    .populate('assignedTechnicians', 'fullName phone');
}

/**
 * Gets a single station by ID.
 * @param {string} stationId
 * @returns {Promise<Object>}
 */
export async function getStation(stationId) {
  const station = await Station.findById(stationId)
    .populate('operatorId', 'fullName phone')
    .populate('assignedTechnicians', 'fullName phone');
  if (!station) throw new NotFoundError('Station not found');
  return station;
}

/**
 * Creates a new station (Admin only).
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createStation(data) {
  const count = await Station.countDocuments();
  const stationCode = `ST${String(count + 1).padStart(7, '0')}`;
  const station = await Station.create({ ...data, stationCode });
  logger.info('Station created', { stationId: station._id, name: station.name });
  return station;
}

/**
 * Updates a station.
 * @param {string} stationId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateStation(stationId, updates) {
  const station = await Station.findByIdAndUpdate(stationId, updates, { new: true, runValidators: true });
  if (!station) throw new NotFoundError('Station not found');
  return station;
}

/**
 * Updates battery inventory and broadcasts via Socket.IO.
 * @param {string} stationId
 * @param {{ availableBatteries?: number, chargingBatteries?: number }} counts
 * @param {import('socket.io').Server} io
 * @returns {Promise<Object>}
 */
export async function updateInventory(stationId, counts, io) {
  const station = await Station.findByIdAndUpdate(stationId, counts, { new: true });
  if (!station) throw new NotFoundError('Station not found');

  // Broadcast to all connected clients
  if (io) {
    io.to(`station:${stationId}`).emit('station:inventory_update', {
      stationId,
      available: station.availableBatteries,
      charging: station.chargingBatteries,
    });
  }

  // Check low inventory threshold
  if (station.availableBatteries <= station.lowInventoryThreshold) {
    logger.warn('Low battery inventory alert', { stationId, available: station.availableBatteries });
    // Notification sent in Task 10
  }

  return station;
}

/**
 * Sets station operational status.
 * @param {string} stationId
 * @param {string} status
 * @param {import('socket.io').Server} io
 * @returns {Promise<Object>}
 */
export async function setStationStatus(stationId, status, io) {
  const station = await Station.findByIdAndUpdate(stationId, { status }, { new: true });
  if (!station) throw new NotFoundError('Station not found');

  if (io) {
    io.to(`station:${stationId}`).emit('station:status_update', { stationId, status });
  }

  return station;
}

/**
 * Marks a battery as faulty — removes from available count atomically.
 * @param {string} batteryId
 * @param {import('socket.io').Server} io
 * @returns {Promise<Object>}
 */
export async function markBatteryFaulty(batteryId, io) {
  const battery = await Battery.findById(batteryId);
  if (!battery) throw new NotFoundError('Battery not found');

  battery.status = 'faulty';
  battery.isFaulty = true;
  await battery.save();

  if (battery.stationId) {
    await Station.findByIdAndUpdate(battery.stationId, {
      $inc: { availableBatteries: -1 },
    });
    if (io) {
      const station = await Station.findById(battery.stationId);
      io.to(`station:${battery.stationId}`).emit('station:inventory_update', {
        stationId: battery.stationId,
        available: station?.availableBatteries,
      });
    }
  }

  logger.info('Battery marked faulty', { batteryId, stationId: battery.stationId });
  return battery;
}

/**
 * Creates a maintenance request and notifies technicians.
 * @param {string} stationId
 * @param {string} operatorId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createMaintenanceRequest(stationId, operatorId, data) {
  const station = await Station.findById(stationId);
  if (!station) throw new NotFoundError('Station not found');

  const request = await MaintenanceRequest.create({
    stationId,
    createdByOperator: operatorId,
    ...data,
  });

  logger.info('Maintenance request created', { requestId: request._id, stationId, urgency: data.urgency });
  // Notification to technicians handled in Task 10
  return request;
}

/**
 * Returns today's swap count, revenue, avg wait time, and utilization for a station.
 * @param {string} stationId
 */
export async function getStationStats(stationId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const stationOid = new mongoose.Types.ObjectId(stationId);

  const [todaySwaps, revenueResult, avgWaitResult, station] = await Promise.all([
    SwapTransaction.countDocuments({ stationId: stationOid, status: 'completed', createdAt: { $gte: start, $lte: end } }),
    Payment.aggregate([
      { $match: { status: 'success', type: 'swap_payment', createdAt: { $gte: start, $lte: end } } },
      { $lookup: { from: 'swaptransactions', localField: 'swapTransactionId', foreignField: '_id', as: 'swap' } },
      { $unwind: '$swap' },
      { $match: { 'swap.stationId': stationOid } },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
    SwapTransaction.aggregate([
      { $match: { stationId: stationOid, status: 'completed', durationMinutes: { $gt: 0 }, createdAt: { $gte: start } } },
      { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
    ]),
    Station.findById(stationId).select('totalSlots').lean(),
  ]);

  const utilization = station && station.totalSlots > 0
    ? Math.min(Math.round((todaySwaps / (station.totalSlots * 10)) * 100), 100)
    : 0;

  return {
    todaySwaps,
    todayRevenueRwf: revenueResult[0]?.total || 0,
    avgWaitTimeMinutes: Math.round((avgWaitResult[0]?.avg || 0) * 10) / 10,
    utilizationPercent: utilization,
  };
}

/**
 * Lists reservations for a station with optional status filter.
 * @param {string} stationId
 * @param {Object} query - { status?, page?, limit? }
 */
export async function getStationReservations(stationId, query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const filter = { stationId };
  if (query.status) {
    filter.status = query.status;
  } else {
    filter.status = { $in: ['confirmed', 'completed', 'cancelled', 'expired'] };
  }
  if (query.upcoming === 'true') {
    filter.reservedTime = { $gte: new Date() };
    filter.status = 'confirmed';
  }

  const [reservations, total] = await Promise.all([
    SlotReservation.find(filter)
      .populate('riderId', 'fullName phone')
      .sort({ reservedTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SlotReservation.countDocuments(filter),
  ]);

  return { reservations, total, page, limit };
}

/**
 * Lists maintenance requests for a station.
 * @param {string} stationId
 * @param {Object} query - { status?, page?, limit? }
 */
export async function getStationMaintenanceList(stationId, query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const filter = { stationId };
  if (query.status) filter.status = query.status;

  const [requests, total] = await Promise.all([
    MaintenanceRequest.find(filter)
      .populate('createdByOperator', 'fullName')
      .populate('assignedTechnician', 'fullName phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    MaintenanceRequest.countDocuments(filter),
  ]);

  return { requests, total, page, limit };
}
