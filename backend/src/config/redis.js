/**
 * @file redis.js
 * @description Redis client configuration using ioredis.
 * Provides a singleton Redis client with connection lifecycle management.
 */

import Redis from 'ioredis';
import { env } from './env.js';
import logger from '../utils/logger.js';

/** @type {Redis | null} Singleton Redis client instance */
let redisClient = null;

/**
 * Returns the singleton Redis client, creating it on first call.
 * The client is configured with automatic reconnection and error handling.
 *
 * @returns {Redis} The ioredis client instance.
 */
export function getRedisClient() {
  if (redisClient) return redisClient;

  redisClient = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      if (times > 10) {
        logger.error('Redis retry limit exceeded — giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 200, 2_000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected', { url: env.redisUrl });
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis reconnecting...');
  });

  return redisClient;
}

/**
 * Gracefully closes the Redis connection.
 * Should be called during application shutdown.
 *
 * @returns {Promise<void>}
 */
export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Returns the current Redis connection status.
 *
 * @returns {'connected' | 'disconnected'}
 */
export function getRedisStatus() {
  if (!redisClient) return 'disconnected';
  return redisClient.status === 'ready' ? 'connected' : 'disconnected';
}
