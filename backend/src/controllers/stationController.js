/**
 * @file stationController.js
 */

import * as stationService from '../services/stationService.js';
import * as auditService from '../services/auditService.js';

const { EVENTS } = auditService;

export async function listStations(req, res, next) {
  try {
    const data = await stationService.listStations(req.query);
    res.json({ success: true, data, message: 'Stations retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function getStation(req, res, next) {
  try {
    const data = await stationService.getStation(req.params.id);
    res.json({ success: true, data, message: 'Station retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function createStation(req, res, next) {
  try {
    const data = await stationService.createStation(req.body);
    res.status(201).json({ success: true, data, message: 'Station created.', error: '' });
    void auditService.log({
      eventType: EVENTS.STATION_CREATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Station',
      resourceId: data._id?.toString(),
      description: `Created station "${data.name ?? ''}"`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

export async function updateStation(req, res, next) {
  try {
    const data = await stationService.updateStation(req.params.id, req.body);
    res.json({ success: true, data, message: 'Station updated.', error: '' });
    void auditService.log({
      eventType: EVENTS.STATION_UPDATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Station',
      resourceId: req.params.id,
      description: `Updated station ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

export async function updateInventory(req, res, next) {
  try {
    const io = req.app.get('io');
    const data = await stationService.updateInventory(req.params.id, req.body, io);
    res.json({ success: true, data, message: 'Inventory updated.', error: '' });
  } catch (err) { next(err); }
}

export async function setStatus(req, res, next) {
  try {
    const io = req.app.get('io');
    const data = await stationService.setStationStatus(req.params.id, req.body.status, io);
    res.json({ success: true, data, message: 'Status updated.', error: '' });
    void auditService.log({
      eventType: EVENTS.STATION_STATUS_CHANGED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Station',
      resourceId: req.params.id,
      description: `Station ${req.params.id} status set to "${req.body.status}"`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

export async function createMaintenance(req, res, next) {
  try {
    const data = await stationService.createMaintenanceRequest(req.params.id, req.user.userId, req.body);
    res.status(201).json({ success: true, data, message: 'Maintenance request created.', error: '' });
    void auditService.log({
      eventType: EVENTS.MAINTENANCE_REQUEST_CREATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Station',
      resourceId: req.params.id,
      description: `Maintenance request created for station ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

export async function getStationStats(req, res, next) {
  try {
    const data = await stationService.getStationStats(req.params.id);
    res.json({ success: true, data, message: 'Station stats retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function getStationReservations(req, res, next) {
  try {
    const data = await stationService.getStationReservations(req.params.id, req.query);
    res.json({ success: true, data, message: 'Reservations retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function getStationMaintenance(req, res, next) {
  try {
    const data = await stationService.getStationMaintenanceList(req.params.id, req.query);
    res.json({ success: true, data, message: 'Maintenance requests retrieved.', error: '' });
  } catch (err) { next(err); }
}
