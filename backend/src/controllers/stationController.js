/**
 * @file stationController.js
 */

import * as stationService from '../services/stationService.js';

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
  } catch (err) { next(err); }
}

export async function updateStation(req, res, next) {
  try {
    const data = await stationService.updateStation(req.params.id, req.body);
    res.json({ success: true, data, message: 'Station updated.', error: '' });
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
  } catch (err) { next(err); }
}

export async function createMaintenance(req, res, next) {
  try {
    const data = await stationService.createMaintenanceRequest(req.params.id, req.user.userId, req.body);
    res.status(201).json({ success: true, data, message: 'Maintenance request created.', error: '' });
  } catch (err) { next(err); }
}
