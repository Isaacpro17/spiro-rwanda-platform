/**
 * @file batteryController.js
 * @description Battery management route handlers
 */

import * as batteryService from '../services/batteryService.js';

/**
 * GET /api/v1/batteries
 * List all batteries with filtering and pagination
 */
export async function listBatteries(req, res, next) {
  try {
    const data = await batteryService.listBatteries(req.query);
    res.json({
      success: true,
      data,
      message: 'Batteries retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/batteries/:id
 * Get battery details by ID
 */
export async function getBattery(req, res, next) {
  try {
    const data = await batteryService.getBattery(req.params.id);
    res.json({
      success: true,
      data,
      message: 'Battery retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/batteries
 * Create a new battery
 */
export async function createBattery(req, res, next) {
  try {
    const data = await batteryService.createBattery(req.body);
    res.status(201).json({
      success: true,
      data,
      message: 'Battery created successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/batteries/:id
 * Update battery details
 */
export async function updateBattery(req, res, next) {
  try {
    const data = await batteryService.updateBattery(req.params.id, req.body);
    res.json({
      success: true,
      data,
      message: 'Battery updated successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/batteries/:id
 * Delete a battery
 */
export async function deleteBattery(req, res, next) {
  try {
    await batteryService.deleteBattery(req.params.id);
    res.json({
      success: true,
      data: {},
      message: 'Battery deleted successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/batteries/:id/health
 * Get battery health diagnostics
 */
export async function getBatteryHealth(req, res, next) {
  try {
    const data = await batteryService.getBatteryHealth(req.params.id);
    res.json({
      success: true,
      data,
      message: 'Battery diagnostics retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/batteries/:id/repair
 * Create a repair/maintenance request
 */
export async function createRepairRequest(req, res, next) {
  try {
    const data = await batteryService.createRepairRequest(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.status(201).json({
      success: true,
      data,
      message: 'Repair request created successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/batteries/stats
 * Get battery statistics
 */
export async function getBatteryStats(req, res, next) {
  try {
    const data = await batteryService.getBatteryStats();
    res.json({
      success: true,
      data,
      message: 'Battery statistics retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/batteries/bulk/status
 * Bulk update battery status
 */
export async function bulkUpdateStatus(req, res, next) {
  try {
    const { batteryIds, status } = req.body;
    const data = await batteryService.bulkUpdateStatus(batteryIds, status);
    res.json({
      success: true,
      data,
      message: 'Battery statuses updated successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}
