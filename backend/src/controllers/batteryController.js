/**
 * @file batteryController.js
 * @description Battery management route handlers
 */

import * as batteryService from '../services/batteryService.js';
import * as auditService from '../services/auditService.js';

const { EVENTS } = auditService;

/** GET /api/v1/batteries */
export async function listBatteries(req, res, next) {
  try {
    const data = await batteryService.listBatteries(req.query);
    res.json({ success: true, data, message: 'Batteries retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/batteries/:id */
export async function getBattery(req, res, next) {
  try {
    const data = await batteryService.getBattery(req.params.id);
    res.json({ success: true, data, message: 'Battery retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** POST /api/v1/batteries */
export async function createBattery(req, res, next) {
  try {
    const data = await batteryService.createBattery(req.body);
    res.status(201).json({ success: true, data, message: 'Battery created successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.BATTERY_CREATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Battery',
      resourceId: data._id?.toString(),
      description: `Created battery "${data.serialNumber ?? ''}"`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** PUT /api/v1/batteries/:id */
export async function updateBattery(req, res, next) {
  try {
    const data = await batteryService.updateBattery(req.params.id, req.body);
    res.json({ success: true, data, message: 'Battery updated successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.BATTERY_UPDATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Battery',
      resourceId: req.params.id,
      description: `Updated battery ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** DELETE /api/v1/batteries/:id */
export async function deleteBattery(req, res, next) {
  try {
    await batteryService.deleteBattery(req.params.id);
    res.json({ success: true, data: {}, message: 'Battery deleted successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.BATTERY_DELETED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Battery',
      resourceId: req.params.id,
      description: `Deleted battery ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** GET /api/v1/batteries/:id/health */
export async function getBatteryHealth(req, res, next) {
  try {
    const data = await batteryService.getBatteryHealth(req.params.id);
    res.json({ success: true, data, message: 'Battery diagnostics retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** POST /api/v1/batteries/:id/repair */
export async function createRepairRequest(req, res, next) {
  try {
    const data = await batteryService.createRepairRequest(req.params.id, req.user.userId, req.body);
    res.status(201).json({ success: true, data, message: 'Repair request created successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.BATTERY_REPAIR_REQUESTED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Battery',
      resourceId: req.params.id,
      description: `Repair request submitted for battery ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** GET /api/v1/batteries/stats */
export async function getBatteryStats(req, res, next) {
  try {
    const data = await batteryService.getBatteryStats();
    res.json({ success: true, data, message: 'Battery statistics retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** PUT /api/v1/batteries/bulk/status */
export async function bulkUpdateStatus(req, res, next) {
  try {
    const { batteryIds, status } = req.body;
    const data = await batteryService.bulkUpdateStatus(batteryIds, status);
    res.json({ success: true, data, message: 'Battery statuses updated successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.BATTERIES_BULK_STATUS_UPDATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Battery',
      description: `Bulk status update to "${status}" for ${batteryIds?.length ?? 0} battery(ies)`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}
