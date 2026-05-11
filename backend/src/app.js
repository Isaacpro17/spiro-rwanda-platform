/**
 * @file app.js
 * @description Express application factory.
 * Configures all middleware, routes, and error handling.
 * Exported separately from server.js to allow supertest to import without starting the server.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import riderRouter from './routes/riders.js';
import stationRouter from './routes/stations.js';
import swapRouter from './routes/swaps.js';
import queueRouter from './routes/queue.js';
import paymentRouter from './routes/payments.js';
import analyticsRouter from './routes/analytics.js';
import auditRouter from './routes/audit.js';
import supportRouter from './routes/support.js';
import batteryRouter from './routes/batteries.js';
import userRouter from './routes/users.js';
import logger from './utils/logger.js';

/**
 * Creates and configures the Express application.
 *
 * Middleware stack (in order):
 * 1. helmet()          — Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. cors()            — Cross-Origin Resource Sharing with allowlist
 * 3. express.json()    — JSON body parser (10mb limit)
 * 4. rateLimiter       — 100 req/min/IP via Redis
 * 5. Routes            — /api/v1/*
 * 6. 404 handler       — Catch-all for unknown routes
 * 7. errorHandler      — Central error handler
 *
 * @returns {import('express').Application} Configured Express app.
 */
export function createApp() {
  const app = express();

  // ── Security Headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        logger.warn('CORS blocked request', { origin });
        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Body Parser ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Rate Limiter ────────────────────────────────────────────────────────────
  app.use(rateLimiter);

  // ── Request Logging ─────────────────────────────────────────────────────────
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      });
    });
    next();
  });

  // ── Routes ──────────────────────────────────────────────────────────────────
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/riders', riderRouter);
  app.use('/api/v1/stations', stationRouter);
  app.use('/api/v1/swaps', swapRouter);
  app.use('/api/v1/queue', queueRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/support', supportRouter);
  app.use('/api/v1/batteries', batteryRouter);
  app.use('/api/v1/users', userRouter);

  // ── 404 Handler ─────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      data: {},
      message: `Route ${req.method} ${req.path} not found`,
      error: 'NOT_FOUND_ERROR',
    });
  });

  // ── Central Error Handler ───────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
