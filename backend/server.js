/**
 * @file server.js
 * @description Application entry point.
 * Loads environment variables, validates configuration, connects to databases,
 * and starts the HTTP server with Socket.IO support.
 */

import 'dotenv/config';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { validateEnv, env } from './src/config/env.js';
import { connectDB } from './src/config/db.js';
import { getRedisClient } from './src/config/redis.js';
import { createApp } from './src/app.js';
import logger from './src/utils/logger.js';

/**
 * Bootstraps and starts the Spiro Rwanda Platform backend server.
 *
 * Startup sequence:
 * 1. Validate all required environment variables
 * 2. Connect to MongoDB
 * 3. Initialize Redis client
 * 4. Create Express app
 * 5. Attach Socket.IO to HTTP server
 * 6. Start listening on configured port
 *
 * @returns {Promise<void>}
 */
async function bootstrap() {
  // ── 1. Validate environment ─────────────────────────────────────────────────
  validateEnv();
  logger.info('Environment variables validated');

  // ── 2. Connect to MongoDB ───────────────────────────────────────────────────
  await connectDB();

  // ── 3. Initialize Redis ─────────────────────────────────────────────────────
  const redisClient = getRedisClient();
  // Ping Redis to verify connectivity on startup
  await redisClient.ping();
  logger.info('Redis client initialized and connected');

  // ── 4. Create Express app ───────────────────────────────────────────────────
  const app = createApp();

  // ── 5. Attach Socket.IO ─────────────────────────────────────────────────────
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.corsOrigin.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Attach io instance to app for use in route handlers
  app.set('io', io);

  // Socket.IO connection handler (full implementation in Task 6)
  io.on('connection', (socket) => {
    logger.info('Socket.IO client connected', { socketId: socket.id });

    socket.on('disconnect', (reason) => {
      logger.info('Socket.IO client disconnected', { socketId: socket.id, reason });
    });
  });

  // ── 6. Start HTTP server ────────────────────────────────────────────────────
  httpServer.listen(env.port, () => {
    logger.info('Spiro Rwanda Platform backend started', {
      port: env.port,
      environment: env.nodeEnv,
      pid: process.pid,
    });
  });

  // ── Graceful Shutdown ───────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal} — shutting down gracefully`);

    httpServer.close(async () => {
      try {
        const { disconnectDB } = await import('./src/config/db.js');
        const { disconnectRedis } = await import('./src/config/redis.js');
        await disconnectDB();
        await disconnectRedis();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // Use console.error here since logger may not be initialized yet
  console.error('Fatal startup error:', err.message); // eslint-disable-line no-console
  process.exit(1);
});
