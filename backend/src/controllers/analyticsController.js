/**
 * @file analyticsController.js
 * @description Analytics and reporting route handlers.
 */

import * as analyticsService from '../services/analyticsService.js';

export async function getKpis(req, res, next) {
  try {
    const data = await analyticsService.getKpiReport(req.query);
    return res.status(200).json({ success: true, data, message: 'KPIs retrieved', error: '' });
  } catch (err) { return next(err); }
}

export async function getReport(req, res, next) {
  try {
    const data = await analyticsService.getKpiReport(req.query);
    return res.status(200).json({ success: true, data, message: 'Report generated', error: '' });
  } catch (err) { return next(err); }
}

export async function exportReport(req, res, next) {
  try {
    const { format = 'json' } = req.query;
    const data = await analyticsService.exportReport(req.query, format);
    return res.status(200).json({ success: true, data, message: 'Export ready', error: '' });
  } catch (err) { return next(err); }
}

export async function getStationBreakdown(req, res, next) {
  try {
    const data = await analyticsService.getStationBreakdown(req.params.id, req.query);
    return res.status(200).json({ success: true, data, message: 'Station breakdown retrieved', error: '' });
  } catch (err) { return next(err); }
}
