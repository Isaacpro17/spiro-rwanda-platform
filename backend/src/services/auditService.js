/**
 * @file auditService.js
 * @description Append-only audit trail service.
 */

import AuditEntry from '../models/AuditEntry.js';
import logger from '../utils/logger.js';

/**
 * Creates an immutable audit log entry.
 * @param {{ eventType: string, actorUserId?: string, actorRole?: string, resourceId?: string, resourceType?: string, ipAddress?: string, description?: string }} data
 * @returns {Promise<AuditEntry>}
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
