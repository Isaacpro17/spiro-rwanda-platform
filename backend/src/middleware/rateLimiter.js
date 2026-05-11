/**
 * @file rateLimiter.js
 * @description Rate limiting middleware using express-rate-limit with Redis store.
 * Limits each IP to 100 requests per minute (configurable via environment variables).
 * Returns HTTP 429 with the standard API error format on limit exceeded.
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Creates and returns the rate limiter middleware.
 * Uses Redis as the backing store for distributed rate limiting across multiple instances.
 *
 * @returns {import('express').RequestHandler} Express rate limiter middleware.
 */
export function createRateLimiter() {
  const redisClient = getRedisClient();

  return rateLimit({
    windowMs: env.rateLimit.windowMs,   // Default: 60,000ms (1 minute)
    max: env.rateLimit.maxRequests,     // Default: 100 requests per window
    standardHeaders: true,              // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,               // Disable `X-RateLimit-*` headers

    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rate_limit:',
    }),

    keyGenerator: (req) => {
      // Use X-Forwarded-For if behind a proxy, otherwise use direct IP
      return req.ip || req.headers['x-forwarded-for'] || 'unknown';
    },

    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        success: false,
        data: {},
        message: 'Too many requests — please try again later',
        error: 'RATE_LIMIT_ERROR',
      });
    },

    skip: (req) => {
      // Skip rate limiting for health check endpoint
      return req.path === '/api/v1/health';
    },
  });
}

/**
 * Pre-built rate limiter middleware instance for use in app.js.
 * @type {import('express').RequestHandler}
 */
export const rateLimiter = createRateLimiter();
