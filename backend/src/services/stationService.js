/**
 * @file stationService.js
 * @description Station management: CRUD, inventory, maintenance.
 */

import Station from '../models/Station.js';
import Battery from '../models/Battery.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
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

  return Station.find(query).populate('operatorId', 'fullName phone');
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
