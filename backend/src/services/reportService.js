/**
 * @file reportService.js
 * @description Central data-fetching service for report generation.
 * Uses a REPORT_REGISTRY pattern for scalable report type management.
 * All data-fetching functions enforce role-based data scoping.
 */

import SwapTransaction from '../models/SwapTransaction.js';
import Payment from '../models/Payment.js';
import Battery from '../models/Battery.js';
import Station from '../models/Station.js';
import User from '../models/User.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import AuditEntry from '../models/AuditEntry.js';
import logger from '../utils/logger.js';
import { ForbiddenError, ValidationError } from '../middleware/errorHandler.js';

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RECORDS = 5000;
const DEFAULT_DAYS = 30;

// ── Report Registry ──────────────────────────────────────────────────────────
/**
 * Maps report types to their data-fetching functions and allowed roles.
 * Adding a new report requires only a new entry here + the fetch function.
 */
export const REPORT_REGISTRY = {
  swap_operations: {
    fetch: fetchSwapOperationsData,
    roles: ['admin'],
    label: 'Swap Operations Summary',
    description: 'Complete overview of all swap transactions across the network.',
    icon: 'Zap',
  },
  financial: {
    fetch: fetchFinancialData,
    roles: ['admin'],
    label: 'Financial & Revenue Report',
    description: 'Revenue breakdown by provider, period, and payment type.',
    icon: 'TrendingUp',
  },
  battery_health: {
    fetch: fetchBatteryHealthData,
    roles: ['admin'],
    label: 'Battery Fleet Health Report',
    description: 'Fleet status, faulty rate, cycle counts, and repair history.',
    icon: 'Battery',
  },
  station_performance: {
    fetch: fetchStationPerformanceData,
    roles: ['admin', 'operator'],
    label: 'Station Performance Report',
    description: 'Per-station KPIs including swaps, revenue, and maintenance.',
    icon: 'MapPin',
  },
  user_activity: {
    fetch: fetchUserActivityData,
    roles: ['admin'],
    label: 'User Activity Report',
    description: 'User registration trends, active/inactive breakdown by role.',
    icon: 'Users',
  },
  audit_trail: {
    fetch: fetchAuditTrailData,
    roles: ['admin'],
    label: 'Audit Trail Report',
    description: 'Security events, RBAC violations, and login activity.',
    icon: 'Shield',
  },
  daily_station: {
    fetch: fetchDailyStationData,
    roles: ['admin', 'operator'],
    label: 'Daily Station Report',
    description: 'Today\'s swaps, revenue, and battery inventory for a station.',
    icon: 'Clock',
  },
  inventory_status: {
    fetch: fetchInventoryStatusData,
    roles: ['admin', 'operator'],
    label: 'Inventory Status Report',
    description: 'Current battery status and charge levels at a station.',
    icon: 'Battery',
  },
  maintenance_log: {
    fetch: fetchMaintenanceLogData,
    roles: ['admin', 'operator', 'technician'],
    label: 'Maintenance Log Report',
    description: 'Open and resolved maintenance requests with resolution details.',
    icon: 'Wrench',
  },
  swap_history: {
    fetch: fetchSwapHistoryData,
    roles: ['admin', 'rider'],
    label: 'Swap History Receipt',
    description: 'Personal swap transaction history with costs and durations.',
    icon: 'Zap',
  },
  payment_statement: {
    fetch: fetchPaymentStatementData,
    roles: ['admin', 'rider'],
    label: 'Payment Statement',
    description: 'Personal payment history including top-ups and swap payments.',
    icon: 'DollarSign',
  },
  work_history: {
    fetch: fetchWorkHistoryData,
    roles: ['admin', 'technician'],
    label: 'Work History Report',
    description: 'Resolved maintenance tasks with resolution times.',
    icon: 'Wrench',
  },
};

// ── Utility Functions ────────────────────────────────────────────────────────

/**
 * Builds a MongoDB date range query.
 * Defaults to last DEFAULT_DAYS days if no range is specified.
 * @param {{ startDate?: string, endDate?: string }} filters
 * @returns {Object}
 */
function buildDateQuery(filters) {
  const q = { createdAt: {} };

  if (filters.startDate) {
    q.createdAt.$gte = new Date(filters.startDate);
  } else {
    // Default: last 30 days
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS);
    d.setHours(0, 0, 0, 0);
    q.createdAt.$gte = d;
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    q.createdAt.$lte = end;
  } else {
    q.createdAt.$lte = new Date();
  }

  return q;
}

/**
 * Resolves the station for operator-scoped reports.
 * @param {Object} user - { userId, role }
 * @param {string} [requestedStationId] - Optional station from filters
 * @returns {Promise<string>} stationId
 */
async function resolveOperatorStation(user, requestedStationId) {
  if (user.role === 'admin' && requestedStationId) {
    return requestedStationId;
  }

  if (user.role === 'operator') {
    const station = await Station.findOne({ operatorId: user.userId }).select('_id name').lean();
    if (!station) throw new ForbiddenError('No station assigned to this operator');
    return station._id.toString();
  }

  if (requestedStationId) return requestedStationId;
  return null;
}

/**
 * Returns report types available for a given user role.
 * @param {string} role
 * @returns {Array<Object>}
 */
export function getAvailableReports(role) {
  return Object.entries(REPORT_REGISTRY)
    .filter(([, config]) => config.roles.includes(role))
    .map(([type, config]) => ({
      type,
      label: config.label,
      description: config.description,
      icon: config.icon,
    }));
}

/**
 * Fetches report data for the given type and filters.
 * Enforces role-based access and data scoping.
 * @param {string} reportType
 * @param {Object} filters
 * @param {Object} user - { userId, role }
 * @returns {Promise<Object>}
 */
export async function fetchReportData(reportType, filters, user) {
  const config = REPORT_REGISTRY[reportType];
  if (!config) throw new ValidationError(`Unknown report type: ${reportType}`);

  if (!config.roles.includes(user.role)) {
    throw new ForbiddenError(`Role "${user.role}" cannot access "${reportType}" reports`);
  }

  logger.info('Generating report data', { reportType, filters, userId: user.userId, role: user.role });

  return config.fetch(filters, user);
}

// ── Data Fetching Functions ──────────────────────────────────────────────────

/**
 * 1. Swap Operations Summary (Admin)
 */
async function fetchSwapOperationsData(filters, user) {
  const dateQuery = buildDateQuery(filters);
  const query = { ...dateQuery };
  if (filters.status) query.status = filters.status;
  if (filters.stationId) query.stationId = filters.stationId;

  const [swaps, totalSwaps, completedSwaps, revenueResult, avgWaitResult] = await Promise.all([
    SwapTransaction.find(query)
      .populate('riderId', 'fullName phone')
      .populate('stationId', 'name')
      .sort({ createdAt: -1 })
      .limit(MAX_RECORDS)
      .lean(),
    SwapTransaction.countDocuments(query),
    SwapTransaction.countDocuments({ ...query, status: 'completed' }),
    Payment.aggregate([
      { $match: { status: 'success', ...dateQuery } },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
    SwapTransaction.aggregate([
      { $match: { status: 'completed', durationMinutes: { $gt: 0 }, ...dateQuery } },
      { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
    ]),
  ]);

  return {
    kpis: {
      totalSwaps,
      completedSwaps,
      avgWaitTimeMinutes: Math.round((avgWaitResult[0]?.avg || 0) * 10) / 10,
      totalRevenueRwf: revenueResult[0]?.total || 0,
    },
    swaps,
  };
}

/**
 * 2. Financial / Revenue Report (Admin)
 */
async function fetchFinancialData(filters, user) {
  const dateQuery = buildDateQuery(filters);
  const paymentQuery = { ...dateQuery };
  if (filters.status) paymentQuery.status = filters.status;
  if (filters.provider) paymentQuery.provider = filters.provider;

  const [payments, stats] = await Promise.all([
    Payment.find(paymentQuery)
      .populate('riderId', 'fullName phone')
      .sort({ createdAt: -1 })
      .limit(MAX_RECORDS)
      .lean(),
    (async () => {
      const [total, byStatus, byProvider, todayTx, todayRev, totalRev] = await Promise.all([
        Payment.countDocuments(paymentQuery),
        Payment.aggregate([
          { $match: paymentQuery },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Payment.aggregate([
          { $match: paymentQuery },
          { $group: { _id: '$provider', count: { $sum: 1 } } },
        ]),
        Payment.countDocuments({
          ...paymentQuery,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        Payment.aggregate([
          {
            $match: {
              status: 'success',
              createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          },
          { $group: { _id: null, total: { $sum: '$amountRwf' } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'success', ...dateQuery } },
          { $group: { _id: null, total: { $sum: '$amountRwf' } } },
        ]),
      ]);

      const statusStats = {};
      byStatus.forEach((item) => { statusStats[item._id] = item.count; });
      const providerStats = {};
      byProvider.forEach((item) => { providerStats[item._id] = item.count; });

      return {
        total,
        byStatus: statusStats,
        byProvider: providerStats,
        todayTransactions: todayTx,
        todayRevenue: todayRev[0]?.total || 0,
        totalRevenue: totalRev[0]?.total || 0,
      };
    })(),
  ]);

  return { stats, payments };
}

/**
 * 3. Battery Fleet Health Report (Admin)
 */
async function fetchBatteryHealthData(filters, user) {
  const query = {};
  if (filters.stationId) query.stationId = filters.stationId;
  if (filters.status) query.status = filters.status;

  const [batteries, available, charging, faulty, total] = await Promise.all([
    Battery.find(query)
      .populate('stationId', 'name')
      .sort({ status: 1, chargeLevel: -1 })
      .limit(MAX_RECORDS)
      .lean(),
    Battery.countDocuments({ ...query, status: 'available' }),
    Battery.countDocuments({ ...query, status: 'charging' }),
    Battery.countDocuments({ ...query, status: 'faulty' }),
    Battery.countDocuments(query),
  ]);

  return {
    summary: { total, available, charging, faulty },
    batteries,
  };
}

/**
 * 4. Station Performance Report (Admin, Operator)
 */
async function fetchStationPerformanceData(filters, user) {
  let stationQuery = { status: { $ne: 'inactive' } };

  // Operator scoping: only their station
  if (user.role === 'operator') {
    const station = await Station.findOne({ operatorId: user.userId }).select('_id').lean();
    if (!station) throw new ForbiddenError('No station assigned to this operator');
    stationQuery._id = station._id;
  } else if (filters.stationId) {
    stationQuery._id = filters.stationId;
  }

  const stations = await Station.find(stationQuery).select('name province status').lean();
  const dateQuery = buildDateQuery(filters);

  const stationResults = await Promise.all(
    stations.map(async (station) => {
      const [swapCount, revenue, avgWait, maintenanceCount] = await Promise.all([
        SwapTransaction.countDocuments({ stationId: station._id, status: 'completed', ...dateQuery }),
        Payment.aggregate([
          { $match: { status: 'success', ...dateQuery } },
          { $lookup: { from: 'swaptransactions', localField: 'swapTransactionId', foreignField: '_id', as: 'swap' } },
          { $unwind: '$swap' },
          { $match: { 'swap.stationId': station._id } },
          { $group: { _id: null, total: { $sum: '$amountRwf' } } },
        ]),
        SwapTransaction.aggregate([
          { $match: { stationId: station._id, status: 'completed', durationMinutes: { $gt: 0 }, ...dateQuery } },
          { $group: { _id: null, avg: { $avg: '$durationMinutes' } } },
        ]),
        MaintenanceRequest.countDocuments({ stationId: station._id, ...dateQuery }),
      ]);

      return {
        ...station,
        totalSwaps: swapCount,
        avgWaitTimeMinutes: Math.round((avgWait[0]?.avg || 0) * 10) / 10,
        revenueRwf: revenue[0]?.total || 0,
        maintenanceIncidents: maintenanceCount,
      };
    })
  );

  return { stations: stationResults };
}

/**
 * 5. User Activity Report (Admin)
 */
async function fetchUserActivityData(filters, user) {
  const dateQuery = buildDateQuery(filters);
  const query = { ...dateQuery };

  const [users, riders, operators, technicians, admins, total] = await Promise.all([
    User.find(query)
      .select('fullName phone role isActive createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .limit(MAX_RECORDS)
      .lean(),
    User.countDocuments({ ...query, role: 'rider' }),
    User.countDocuments({ ...query, role: 'operator' }),
    User.countDocuments({ ...query, role: 'technician' }),
    User.countDocuments({ ...query, role: 'admin' }),
    User.countDocuments(query),
  ]);

  return {
    summary: { total, riders, operators, technicians, admins },
    users,
  };
}

/**
 * 6. Audit Trail Report (Admin)
 */
async function fetchAuditTrailData(filters, user) {
  const query = {};

  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.timestamp.$lte = end;
    }
  } else {
    // Default: last 30 days
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS);
    query.timestamp = { $gte: d };
  }

  if (filters.eventType) query.eventType = filters.eventType;

  const entries = await AuditEntry.find(query)
    .populate('actorUserId', 'fullName role')
    .sort({ timestamp: -1 })
    .limit(MAX_RECORDS)
    .lean();

  // Map actorUserId populated data to flat fields for PDF rendering
  const mappedEntries = entries.map((e) => ({
    ...e,
    actorName: e.actorUserId?.fullName || 'System',
    actorRole: e.actorUserId?.role || e.actorRole || 'N/A',
  }));

  return { entries: mappedEntries };
}

/**
 * 7. Daily Station Report (Admin, Operator)
 */
async function fetchDailyStationData(filters, user) {
  const stationId = await resolveOperatorStation(user, filters.stationId);
  if (!stationId) throw new ValidationError('Station ID is required for this report');

  const station = await Station.findById(stationId).select('name address province availableBatteries chargingBatteries').lean();
  if (!station) throw new ValidationError('Station not found');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayDateQuery = { createdAt: { $gte: todayStart, $lte: todayEnd } };

  const [swaps, todaySwapCount, todayRevenueResult] = await Promise.all([
    SwapTransaction.find({ stationId, ...todayDateQuery })
      .populate('riderId', 'fullName phone')
      .populate('depletedBatteryId', 'serialNumber')
      .populate('chargedBatteryId', 'serialNumber')
      .sort({ createdAt: -1 })
      .limit(MAX_RECORDS)
      .lean(),
    SwapTransaction.countDocuments({ stationId, status: 'completed', ...todayDateQuery }),
    Payment.aggregate([
      { $match: { status: 'success', ...todayDateQuery } },
      { $lookup: { from: 'swaptransactions', localField: 'swapTransactionId', foreignField: '_id', as: 'swap' } },
      { $unwind: '$swap' },
      { $match: { 'swap.stationId': station._id } },
      { $group: { _id: null, total: { $sum: '$amountRwf' } } },
    ]),
  ]);

  return {
    station,
    kpis: {
      todaySwaps: todaySwapCount,
      todayRevenue: todayRevenueResult[0]?.total || 0,
      availableBatteries: station.availableBatteries || 0,
      chargingBatteries: station.chargingBatteries || 0,
    },
    swaps,
  };
}

/**
 * 8. Inventory Status Report (Admin, Operator)
 */
async function fetchInventoryStatusData(filters, user) {
  const stationId = await resolveOperatorStation(user, filters.stationId);
  if (!stationId) throw new ValidationError('Station ID is required for this report');

  const station = await Station.findById(stationId).select('name address').lean();
  if (!station) throw new ValidationError('Station not found');

  const [batteries, available, charging, faulty, total] = await Promise.all([
    Battery.find({ stationId })
      .sort({ status: 1, chargeLevel: -1 })
      .lean(),
    Battery.countDocuments({ stationId, status: 'available' }),
    Battery.countDocuments({ stationId, status: 'charging' }),
    Battery.countDocuments({ stationId, status: 'faulty' }),
    Battery.countDocuments({ stationId }),
  ]);

  return {
    station,
    summary: { total, available, charging, faulty },
    batteries,
  };
}

/**
 * 9. Maintenance Log Report (Admin, Operator, Technician)
 */
async function fetchMaintenanceLogData(filters, user) {
  const dateQuery = buildDateQuery(filters);
  const query = { ...dateQuery };

  if (user.role === 'operator') {
    const station = await Station.findOne({ operatorId: user.userId }).select('_id').lean();
    if (!station) throw new ForbiddenError('No station assigned');
    query.stationId = station._id;
  } else if (user.role === 'technician') {
    query.assignedTechnician = user.userId;
  } else if (filters.stationId) {
    query.stationId = filters.stationId;
  }

  if (filters.status) query.status = filters.status;

  const requests = await MaintenanceRequest.find(query)
    .populate('stationId', 'name')
    .populate('assignedTechnician', 'fullName phone')
    .populate('createdByOperator', 'fullName')
    .sort({ createdAt: -1 })
    .limit(MAX_RECORDS)
    .lean();

  return { requests };
}

/**
 * 10. Swap History Receipt (Admin, Rider)
 */
async function fetchSwapHistoryData(filters, user) {
  const riderId = user.role === 'rider' ? user.userId : filters.riderId;
  if (!riderId) throw new ValidationError('Rider ID is required for this report');

  // Ensure rider can only get their own data
  if (user.role === 'rider' && riderId !== user.userId) {
    throw new ForbiddenError('Cannot access another rider\'s data');
  }

  const dateQuery = buildDateQuery(filters);
  const rider = await User.findById(riderId).select('fullName phone').lean();

  const swaps = await SwapTransaction.find({ riderId, ...dateQuery })
    .populate('stationId', 'name')
    .sort({ createdAt: -1 })
    .limit(MAX_RECORDS)
    .lean();

  const totalSpent = swaps.reduce((sum, sw) => sum + (sw.amountRwf || 0), 0);

  return { rider, swaps, totalSpent };
}

/**
 * 11. Payment Statement (Admin, Rider)
 */
async function fetchPaymentStatementData(filters, user) {
  const riderId = user.role === 'rider' ? user.userId : filters.riderId;
  if (!riderId) throw new ValidationError('Rider ID is required for this report');

  if (user.role === 'rider' && riderId !== user.userId) {
    throw new ForbiddenError('Cannot access another rider\'s data');
  }

  const dateQuery = buildDateQuery(filters);
  const rider = await User.findById(riderId).select('fullName phone').lean();

  const paymentQuery = { riderId, ...dateQuery };
  if (filters.status) paymentQuery.status = filters.status;
  if (filters.provider) paymentQuery.provider = filters.provider;

  const payments = await Payment.find(paymentQuery)
    .sort({ createdAt: -1 })
    .limit(MAX_RECORDS)
    .lean();

  const totalAmount = payments
    .filter((p) => p.status === 'success')
    .reduce((sum, p) => sum + (p.amountRwf || 0), 0);

  return { rider, payments, totalAmount };
}

/**
 * 12. Work History Report (Admin, Technician)
 */
async function fetchWorkHistoryData(filters, user) {
  const techId = user.role === 'technician' ? user.userId : filters.technicianId;
  if (!techId) throw new ValidationError('Technician ID is required for this report');

  if (user.role === 'technician' && techId !== user.userId) {
    throw new ForbiddenError('Cannot access another technician\'s data');
  }

  const dateQuery = buildDateQuery(filters);
  const technician = await User.findById(techId).select('fullName phone').lean();

  const tasks = await MaintenanceRequest.find({ assignedTechnician: techId, ...dateQuery })
    .populate('stationId', 'name')
    .sort({ createdAt: -1 })
    .limit(MAX_RECORDS)
    .lean();

  const totalResolved = tasks.filter((t) => t.status === 'resolved').length;

  return { technician, tasks, totalResolved };
}
