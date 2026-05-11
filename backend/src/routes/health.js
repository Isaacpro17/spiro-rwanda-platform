/**
 * @file health.js
 * @description Health check route.
 * GET /api/v1/health — returns platform status including MongoDB and Redis connectivity.
 * Must respond within 500ms (Requirement 15.5).
 */

import { Router } from 'express';
import { getDBStatus } from '../config/db.js';
import { getRedisStatus } from '../config/redis.js';

const router = Router();

/**
 * GET /api/v1/health
 *
 * Returns the current health status of the platform and its dependencies.
 *
 * @name GET /health
 * @returns {Object} 200 - Standard success response with health data.
 * @example
 * // Response body:
 * {
 *   "success": true,
 *   "data": {
 *     "status": "ok",
 *     "mongodb": "connected",
 *     "redis": "connected",
 *     "uptime": 42.5
 *   },
 *   "message": "Platform is healthy",
 *   "error": ""
 * }
 */
router.get('/', (req, res) => {
  const mongoStatus = getDBStatus();
  const redisStatus = getRedisStatus();

  const isHealthy = mongoStatus === 'connected' && redisStatus === 'connected';

  return res.status(200).json({
    success: true,
    data: {
      status: isHealthy ? 'ok' : 'degraded',
      mongodb: mongoStatus,
      redis: redisStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
    message: isHealthy ? 'Platform is healthy' : 'Platform is running in degraded mode',
    error: '',
  });
});

export default router;
