/**
 * @file errorHandler.js
 * @description Central error handler middleware and typed application error classes.
 * All errors thrown in the application should extend AppError for consistent HTTP responses.
 */

import logger from '../utils/logger.js';

// ─── Base Error Class ─────────────────────────────────────────────────────────

/**
 * Base application error class.
 * All custom errors should extend this class.
 *
 * @extends Error
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} statusCode - HTTP status code to return.
   * @param {string} [errorCode] - Machine-readable error code for clients.
   */
  constructor(message, statusCode, errorCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode || this.constructor.name.toUpperCase();
    this.isOperational = true; // Distinguishes expected errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Typed Error Classes ──────────────────────────────────────────────────────

/**
 * 422 Unprocessable Entity — Input validation failed.
 * @extends AppError
 */
export class ValidationError extends AppError {
  /**
   * @param {string} [message='Validation failed']
   * @param {Array<Object>} [details=[]] - Array of field-level validation errors.
   */
  constructor(message = 'Validation failed', details = []) {
    super(message, 422, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * 401 Unauthorized — Authentication required or credentials invalid.
 * @extends AppError
 */
export class AuthError extends AppError {
  /**
   * @param {string} [message='Authentication required']
   */
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

/**
 * 403 Forbidden — Authenticated but insufficient permissions.
 * @extends AppError
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} [message='Access forbidden']
   */
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

/**
 * 409 Conflict — Resource already exists or state conflict.
 * @extends AppError
 */
export class ConflictError extends AppError {
  /**
   * @param {string} [message='Resource conflict']
   */
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * 404 Not Found — Requested resource does not exist.
 * @extends AppError
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} [message='Resource not found']
   */
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * 429 Too Many Requests — Rate limit exceeded.
 * @extends AppError
 */
export class RateLimitError extends AppError {
  /**
   * @param {string} [message='Too many requests — please try again later']
   */
  constructor(message = 'Too many requests — please try again later') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// ─── Central Error Handler Middleware ────────────────────────────────────────

/**
 * Express central error handler middleware.
 * Must be registered AFTER all routes with four parameters (err, req, res, next).
 *
 * Handles:
 * - AppError subclasses → operational errors with known status codes
 * - Mongoose ValidationError → mapped to 422
 * - Mongoose CastError (invalid ObjectId) → mapped to 400
 * - Mongoose duplicate key error (code 11000) → mapped to 409
 * - JWT errors → mapped to 401
 * - Unknown errors → 500 Internal Server Error (details hidden in production)
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // ── Mongoose Validation Error ──────────────────────────────────────────────
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      success: false,
      data: {},
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details,
    });
  }

  // ── Mongoose CastError (bad ObjectId) ─────────────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      data: {},
      message: `Invalid value for field: ${err.path}`,
      error: 'CAST_ERROR',
    });
  }

  // ── MongoDB Duplicate Key ──────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      data: {},
      message: `A record with this ${field} already exists`,
      error: 'CONFLICT_ERROR',
    });
  }

  // ── JWT Errors ─────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      data: {},
      message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
      error: 'AUTH_ERROR',
    });
  }

  // ── Operational AppError subclasses ───────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational server error', {
        error: err.message,
        errorCode: err.errorCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.warn('Client error', {
        error: err.message,
        errorCode: err.errorCode,
        path: req.path,
        method: req.method,
      });
    }

    const response = {
      success: false,
      data: {},
      message: err.message,
      error: err.errorCode,
    };

    if (err instanceof ValidationError && err.details?.length) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // ── Unknown / Programming Errors ───────────────────────────────────────────
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    data: {},
    message: isProd ? 'An unexpected error occurred' : err.message,
    error: 'INTERNAL_SERVER_ERROR',
  });
}
