/**
 * @file batteryService.js
 * @description Battery management business logic
 */

import Battery from '../models/Battery.js';
import Station from '../models/Station.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * List all batteries with filtering and pagination
 * @param {Object} query - Query parameters (page, limit, status, stationId, healthStatus)
 * @returns {Promise<Object>} Paginated battery list
 */
export async function listBatteries(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.stationId) filter.currentStationId = query.stationId;
  if (query.healthStatus) filter.healthStatus = query.healthStatus;
  if (query.search) {
    filter.$or = [
      { serialNumber: { $regex: query.search, $options: 'i' } },
      { qrCode: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [batteries, total] = await Promise.all([
    Battery.find(filter)
      .populate('currentStationId', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Battery.countDocuments(filter),
  ]);

  return {
    batteries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get battery details by ID
 * @param {string} batteryId
 * @returns {Promise<Object>} Battery details
 */
export async function getBattery(batteryId) {
  const battery = await Battery.findById(batteryId)
    .populate('currentStationId', 'name location address')
    .lean();

  if (!battery) {
    throw new NotFoundError('Battery not found');
  }

  // Get maintenance history
  const maintenanceHistory = await MaintenanceRequest.find({
    batteryId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    ...battery,
    maintenanceHistory,
  };
}

/**
 * Create a new battery
 * @param {Object} data - Battery data
 * @returns {Promise<Object>} Created battery
 */
export async function createBattery(data) {
  const { serialNumber, qrCode, manufacturer, model, capacity, currentStationId } = data;

  // Check for duplicate serial number or QR code
  const existing = await Battery.findOne({
    $or: [{ serialNumber }, { qrCode }],
  });

  if (existing) {
    throw new ValidationError(
      `Battery with this ${existing.serialNumber === serialNumber ? 'serial number' : 'QR code'} already exists`
    );
  }

  // Verify station exists if provided
  if (currentStationId) {
    const station = await Station.findById(currentStationId);
    if (!station) {
      throw new NotFoundError('Station not found');
    }
  }

  const battery = await Battery.create({
    serialNumber,
    qrCode,
    manufacturer,
    model,
    capacity,
    currentStationId,
    status: 'available',
    healthStatus: 'healthy',
    chargeLevel: 100,
    cycleCount: 0,
    lastChargedAt: new Date(),
  });

  logger.info('Battery created', { batteryId: battery._id, serialNumber });

  return battery;
}

/**
 * Update battery details
 * @param {string} batteryId
 * @param {Object} updates
 * @returns {Promise<Object>} Updated battery
 */
export async function updateBattery(batteryId, updates) {
  const battery = await Battery.findById(batteryId);
  if (!battery) {
    throw new NotFoundError('Battery not found');
  }

  // Validate station if being updated
  if (updates.currentStationId) {
    const station = await Station.findById(updates.currentStationId);
    if (!station) {
      throw new NotFoundError('Station not found');
    }
  }

  // Don't allow updating certain fields directly
  const allowedUpdates = [
    'status',
    'healthStatus',
    'chargeLevel',
    'currentStationId',
    'manufacturer',
    'model',
    'capacity',
  ];

  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      battery[key] = updates[key];
    }
  });

  await battery.save();

  logger.info('Battery updated', { batteryId, updates: Object.keys(updates) });

  return battery;
}

/**
 * Delete a battery
 * @param {string} batteryId
 * @returns {Promise<void>}
 */
export async function deleteBattery(batteryId) {
  const battery = await Battery.findById(batteryId);
  if (!battery) {
    throw new NotFoundError('Battery not found');
  }

  // Check if battery is currently in use
  if (battery.status === 'in_use') {
    throw new ValidationError('Cannot delete battery that is currently in use');
  }

  await Battery.findByIdAndDelete(batteryId);

  logger.info('Battery deleted', { batteryId, serialNumber: battery.serialNumber });
}

/**
 * Get battery health diagnostics
 * @param {string} batteryId
 * @returns {Promise<Object>} Diagnostic data
 */
export async function getBatteryHealth(batteryId) {
  const battery = await Battery.findById(batteryId).lean();
  if (!battery) {
    throw new NotFoundError('Battery not found');
  }

  // Calculate health metrics
  const expectedLifeCycles = 1000; // Typical Li-ion battery life
  const healthPercentage = Math.max(0, 100 - (battery.cycleCount / expectedLifeCycles) * 100);

  const diagnostics = {
    batteryId: battery._id,
    serialNumber: battery.serialNumber,
    healthStatus: battery.healthStatus,
    healthPercentage: Math.round(healthPercentage),
    chargeLevel: battery.chargeLevel,
    cycleCount: battery.cycleCount,
    expectedRemainingCycles: Math.max(0, expectedLifeCycles - battery.cycleCount),
    lastChargedAt: battery.lastChargedAt,
    lastSwappedAt: battery.lastSwappedAt,
    ageInDays: Math.floor((Date.now() - battery.createdAt) / (1000 * 60 * 60 * 24)),
    recommendations: [],
  };

  // Add recommendations based on health
  if (battery.cycleCount > 800) {
    diagnostics.recommendations.push('Battery approaching end of life - consider replacement');
  }
  if (battery.healthStatus === 'degraded') {
    diagnostics.recommendations.push('Battery performance degraded - schedule maintenance');
  }
  if (battery.healthStatus === 'faulty') {
    diagnostics.recommendations.push('Battery faulty - remove from service immediately');
  }
  if (battery.chargeLevel < 20) {
    diagnostics.recommendations.push('Battery charge level low - recharge soon');
  }

  return diagnostics;
}

/**
 * Create a repair/maintenance request for a battery
 * @param {string} batteryId
 * @param {string} reportedBy - User ID
 * @param {Object} data - Issue details
 * @returns {Promise<Object>} Maintenance request
 */
export async function createRepairRequest(batteryId, reportedBy, data) {
  const battery = await Battery.findById(batteryId);
  if (!battery) {
    throw new NotFoundError('Battery not found');
  }

  const { issueType, description, priority } = data;

  const maintenanceRequest = await MaintenanceRequest.create({
    type: 'battery',
    batteryId,
    stationId: battery.currentStationId,
    reportedBy,
    issueType,
    description,
    priority: priority || 'medium',
    status: 'pending',
  });

  // Update battery status
  battery.status = 'maintenance';
  battery.healthStatus = issueType === 'faulty' ? 'faulty' : 'degraded';
  await battery.save();

  logger.info('Battery repair request created', {
    batteryId,
    requestId: maintenanceRequest._id,
    issueType,
  });

  return maintenanceRequest;
}

/**
 * Get battery statistics
 * @returns {Promise<Object>} Battery statistics
 */
export async function getBatteryStats() {
  const [
    total,
    available,
    inUse,
    charging,
    maintenance,
    healthy,
    degraded,
    faulty,
    avgCycleCount,
  ] = await Promise.all([
    Battery.countDocuments(),
    Battery.countDocuments({ status: 'available' }),
    Battery.countDocuments({ status: 'in_use' }),
    Battery.countDocuments({ status: 'charging' }),
    Battery.countDocuments({ status: 'maintenance' }),
    Battery.countDocuments({ healthStatus: 'healthy' }),
    Battery.countDocuments({ healthStatus: 'degraded' }),
    Battery.countDocuments({ healthStatus: 'faulty' }),
    Battery.aggregate([
      { $group: { _id: null, avgCycles: { $avg: '$cycleCount' } } },
    ]),
  ]);

  return {
    total,
    byStatus: {
      available,
      inUse,
      charging,
      maintenance,
    },
    byHealth: {
      healthy,
      degraded,
      faulty,
    },
    averageCycleCount: Math.round(avgCycleCount[0]?.avgCycles || 0),
  };
}

/**
 * Bulk update battery status (for station operations)
 * @param {Array<string>} batteryIds
 * @param {string} status
 * @returns {Promise<Object>} Update result
 */
export async function bulkUpdateStatus(batteryIds, status) {
  const validStatuses = ['available', 'in_use', 'charging', 'maintenance', 'retired'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await Battery.updateMany(
    { _id: { $in: batteryIds } },
    { $set: { status } }
  );

  logger.info('Bulk battery status update', {
    count: result.modifiedCount,
    status,
  });

  return {
    updated: result.modifiedCount,
    status,
  };
}
