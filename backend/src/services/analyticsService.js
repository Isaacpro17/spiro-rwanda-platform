/**
 * @file analyticsService.js
 * @description KPI computation, report generation, and export.
 */

import SwapTransaction from '../models/SwapTransaction.js';
import Payment from '../models/Payment.js';
import Station from '../models/Station.js';
import Battery from '../models/Battery.js';
import User from '../models/User.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

const KPI_CACHE_TTL = 300; // 5 minutes

/**
 * Returns cached KPIs or recomputes if stale.
 * @param {{ startDate?: string, endDate?: string, stationId?: string }} filters
 * @returns {Promise<Object>}
 */
export async function getKpiReport(filters = {}) {
  const redis = getRedisClient();
  const cacheKey = `kpi:dashboard:${JSON.stringify(filters)}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const kpis = await computeKpis(filters);
  await redis.set(cacheKey, JSON.stringify(kpis), 'EX', KPI_CACHE_TTL);
  return kpis;
}

/**
 * Computes all KPIs from the database.
 * @param {Object} filters
 * @returns {Promise<Object>}
 */
async function computeKpis(filters = {}) {
  const dateQuery = buildDateQuery(filters);
  const stationFilter = filters.stationId ? { stationId: filters.stationId } : {};

  const [
    totalSwaps,
    completedSwaps,
    totalRevenue,
    activeRiders,
    totalStations,
    totalBatteries,
    activeBatteries,
    faultyBatteries,
    chargingBatteries,
  ] = await Promise.all([
    SwapTransaction.countDocuments({ ...dateQuery, ...stationFilter }),
    SwapTransaction.countDocuments({ status: 'completed', ...dateQuery, ...stationFilter }),
    Payment.aggregate([
      { $match: { status: 'success', ...dateQuery } },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
    User.countDocuments({ role: 'rider', isActive: true }),
    Station.countDocuments(),
    Battery.countDocuments(),
    Battery.countDocuments({ status: 'available' }),
    Battery.countDocuments({ status: 'faulty' }),
    Battery.countDocuments({ status: 'charging' }),
  ]);

  // Average wait time from completed swaps
  const avgWaitResult = await SwapTransaction.aggregate([
    { $match: { status: 'completed', durationMinutes: { $gt: 0 }, ...dateQuery } },
    { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
  ]);

  const avgWaitTime = avgWaitResult[0]?.avg || 0;
  const revenue = totalRevenue[0]?.total || 0;
  const batteryHealthPct = totalBatteries > 0
    ? Math.round(((totalBatteries - faultyBatteries) / totalBatteries) * 100)
    : 100;

  const utilizationRate = totalStations > 0
    ? Math.round((completedSwaps / (totalStations * 50)) * 100)
    : 0;

  return {
    totalSwaps,
    completedSwaps,
    avgWaitTimeMinutes: Math.round(avgWaitTime * 10) / 10,
    stationUtilizationRate: Math.min(utilizationRate, 100),
    totalRevenueRwf: revenue,
    activeRiders,
    totalStations,
    totalBatteries,
    activeBatteries,
    chargingBatteries,
    faultyBatteries,
    batteryHealthPercent: batteryHealthPct,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Builds a date range query from filters.
 * @param {{ startDate?: string, endDate?: string }} filters
 * @returns {Object}
 */
function buildDateQuery(filters) {
  if (!filters.startDate && !filters.endDate) return {};
  const q = { createdAt: {} };
  if (filters.startDate) q.createdAt.$gte = new Date(filters.startDate);
  if (filters.endDate) q.createdAt.$lte = new Date(filters.endDate);
  return q;
}

/**
 * Gets per-station breakdown.
 * @param {string} stationId
 * @param {Object} filters
 * @returns {Promise<Object>}
 */
export async function getStationBreakdown(stationId, filters = {}) {
  const dateQuery = buildDateQuery(filters);

  const [swaps, revenue, maintenanceCount] = await Promise.all([
    SwapTransaction.countDocuments({ stationId, status: 'completed', ...dateQuery }),
    Payment.aggregate([
      { $match: { status: 'success', ...dateQuery } },
      { $lookup: { from: 'swaptransactions', localField: 'swapTransactionId', foreignField: '_id', as: 'swap' } },
      { $unwind: '$swap' },
      { $match: { 'swap.stationId': stationId } },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
    (await import('../models/MaintenanceRequest.js')).default.countDocuments({ stationId, ...dateQuery }),
  ]);

  const avgWait = await SwapTransaction.aggregate([
    { $match: { stationId, status: 'completed', durationMinutes: { $gt: 0 }, ...dateQuery } },
    { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
  ]);

  return {
    stationId,
    totalSwaps: swaps,
    avgWaitTimeMinutes: Math.round((avgWait[0]?.avg || 0) * 10) / 10,
    revenueRwf: revenue[0]?.total || 0,
    maintenanceIncidents: maintenanceCount,
  };
}

/**
 * Exports report as JSON (PDF/Excel generation handled by controller with libraries).
 * @param {Object} filters
 * @param {'pdf'|'excel'|'csv'} format
 * @returns {Promise<Object>} report data
 */
export async function exportReport(filters, format) {
  const kpis = await computeKpis(filters);

  const swaps = await SwapTransaction.find(buildDateQuery(filters))
    .populate('riderId', 'fullName phone')
    .populate('stationId', 'name')
    .limit(1000)
    .lean();

  const payments = await Payment.find({ status: 'success', ...buildDateQuery(filters) })
    .populate('riderId', 'fullName phone')
    .limit(1000)
    .lean();

  logger.info('Report exported', { format, filters });

  return { kpis, swaps, payments, format, generatedAt: new Date().toISOString() };
}
