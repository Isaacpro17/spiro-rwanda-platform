/**
 * @file rbac.js
 * @description Role-Based Access Control middleware.
 */

import { ForbiddenError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Returns middleware that allows only the specified roles.
 * Logs RBAC violations to audit trail (full audit service wired in Task 9).
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
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }
    next();
  };
}
