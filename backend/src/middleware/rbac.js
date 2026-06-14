/**
 * @file rbac.js
 * @description Role-Based Access Control middleware.
 */

import { ForbiddenError } from './errorHandler.js';
import logger from '../utils/logger.js';
import * as auditService from '../services/auditService.js';

const { EVENTS } = auditService;

/**
 * Returns middleware that allows only the specified roles.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'operator')
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ForbiddenError('Authentication required'));

    if (!roles.includes(req.user.role)) {
      logger.warn('RBAC violation', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      void auditService.log({
        eventType: EVENTS.RBAC_VIOLATION,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        resourceType: 'Route',
        description: `RBAC violation: role "${req.user.role}" attempted ${req.method} ${req.path} (requires: ${roles.join(' | ')})`,
        ipAddress: req.ip,
      }).catch(() => {});
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }
    next();
  };
}
