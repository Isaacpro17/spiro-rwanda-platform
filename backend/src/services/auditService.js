/**
 * @file auditService.js
 * @description Append-only audit trail service.
 */

import AuditEntry from '../models/AuditEntry.js';
import logger from '../utils/logger.js';

export const EVENTS = {
  // Auth
  USER_REGISTERED: 'USER_REGISTERED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  // User management (admin)
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  USERS_BULK_STATUS_UPDATED: 'USERS_BULK_STATUS_UPDATED',
  // Stations
  STATION_CREATED: 'STATION_CREATED',
  STATION_UPDATED: 'STATION_UPDATED',
  STATION_STATUS_CHANGED: 'STATION_STATUS_CHANGED',
  MAINTENANCE_REQUEST_CREATED: 'MAINTENANCE_REQUEST_CREATED',
  // Batteries
  BATTERY_CREATED: 'BATTERY_CREATED',
  BATTERY_UPDATED: 'BATTERY_UPDATED',
  BATTERY_DELETED: 'BATTERY_DELETED',
  BATTERY_REPAIR_REQUESTED: 'BATTERY_REPAIR_REQUESTED',
  BATTERIES_BULK_STATUS_UPDATED: 'BATTERIES_BULK_STATUS_UPDATED',
  // Payments
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  WALLET_TOPUP: 'WALLET_TOPUP',
  REFUND_ISSUED: 'REFUND_ISSUED',
  // Swaps & Reservations
  SWAP_COMPLETED: 'SWAP_COMPLETED',
  RESERVATION_CREATED: 'RESERVATION_CREATED',
  RESERVATION_CANCELLED: 'RESERVATION_CANCELLED',
  // Subscriptions
  PLAN_CREATED: 'PLAN_CREATED',
  PLAN_UPDATED: 'PLAN_UPDATED',
  RIDER_SUBSCRIBED: 'RIDER_SUBSCRIBED',
  SUBSCRIPTION_REMOVED: 'SUBSCRIPTION_REMOVED',
  // Operator actions
  OPERATOR_WALLET_TOPUP: 'OPERATOR_WALLET_TOPUP',
  PENDING_TX_INITIATED: 'PENDING_TX_INITIATED',
  PENDING_TX_CONFIRMED: 'PENDING_TX_CONFIRMED',
  PENDING_TX_CANCELLED: 'PENDING_TX_CANCELLED',
  // Security
  RBAC_VIOLATION: 'RBAC_VIOLATION',
};

/**
 * Creates an immutable audit log entry. Never throws — audit failures are silently logged.
 * @param {{ eventType: string, actorUserId?: string, actorRole?: string, resourceId?: string, resourceType?: string, ipAddress?: string, description?: string }} data
 * @returns {Promise<AuditEntry|undefined>}
 */
export async function log(data) {
  try {
    return await AuditEntry.create(data);
  } catch (err) {
    logger.error('Failed to write audit entry', { error: err.message, data });
  }
}

/**
 * Queries audit log with filters and pagination.
 * @param {{ eventType?: string, actorUserId?: string, startDate?: Date, endDate?: Date, resourceId?: string, page?: number }} filters
 * @returns {Promise<{ entries: Array, total: number, page: number }>}
 */
export async function queryLogs(filters = {}) {
  const query = {};
  const PAGE_SIZE = 50;
  const page = filters.page || 1;

  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.actorUserId) query.actorUserId = filters.actorUserId;
  if (filters.resourceId) query.resourceId = filters.resourceId;
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }

  const [entries, total] = await Promise.all([
    AuditEntry.find(query).sort({ timestamp: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    AuditEntry.countDocuments(query),
  ]);

  return { entries, total, page, pages: Math.ceil(total / PAGE_SIZE) };
}
