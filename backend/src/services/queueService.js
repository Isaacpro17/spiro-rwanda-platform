/**
 * @file queueService.js
 * @description Real-time queue management with Redis and Socket.IO.
 */

import SwapTransaction from '../models/SwapTransaction.js';
import SlotReservation from '../models/SlotReservation.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

const QUEUE_TTL = 3600; // 1 hour

/**
 * Calculates estimated wait time from last 50 completed swaps.
 * Formula: queue_length × avg_swap_duration
 * @param {string} stationId
 * @returns {Promise<number>} estimated wait in minutes
 */
export async function calculateWaitTime(stationId) {
  const [recentSwaps, queueLength] = await Promise.all([
    SwapTransaction.find({ stationId, status: 'completed' })
      .sort({ endTime: -1 })
      .limit(50)
      .select('durationMinutes'),
    SlotReservation.countDocuments({ stationId, status: 'confirmed' }),
  ]);

  const avgDuration = recentSwaps.length > 0
    ? recentSwaps.reduce((sum, s) => sum + (s.durationMinutes || 5), 0) / recentSwaps.length
    : 5; // default 5 min

  return Math.round(queueLength * avgDuration);
}

/**
 * Adds a rider to the station queue.
 * @param {string} stationId
 * @param {string} riderId
 * @returns {Promise<{ position: number, estimatedWait: number }>}
 */
export async function joinQueue(stationId, riderId) {
  const redis = getRedisClient();
  const key = `queue:${stationId}`;

  // Add to Redis list if not already present
  const existing = await redis.lpos(key, riderId);
  if (existing === null) {
    await redis.rpush(key, riderId);
    await redis.expire(key, QUEUE_TTL);
  }

  const queue = await redis.lrange(key, 0, -1);
  const position = queue.indexOf(riderId) + 1;
  const estimatedWait = await calculateWaitTime(stationId);

  return { position, estimatedWait };
}

/**
 * Removes a rider from the station queue.
 * @param {string} stationId
 * @param {string} riderId
 * @returns {Promise<void>}
 */
export async function leaveQueue(stationId, riderId) {
  const redis = getRedisClient();
  await redis.lrem(`queue:${stationId}`, 0, riderId);
}

/**
 * Gets current queue state for a station.
 * @param {string} stationId
 * @returns {Promise<{ queue: string[], length: number, estimatedWait: number }>}
 */
export async function getQueueStatus(stationId) {
  const redis = getRedisClient();
  const queue = await redis.lrange(`queue:${stationId}`, 0, -1);
  const estimatedWait = await calculateWaitTime(stationId);
  return { queue, length: queue.length, estimatedWait };
}

/**
 * Broadcasts updated queue state to all clients in the station room.
 * @param {string} stationId
 * @param {import('socket.io').Server} io
 * @returns {Promise<void>}
 */
export async function broadcastQueueUpdate(stationId, io) {
  if (!io) return;

  const { length, estimatedWait } = await getQueueStatus(stationId);

  io.to(`station:${stationId}`).emit('station:queue_update', {
    stationId,
    queueLength: length,
    estimatedWait,
  });

  logger.info('Queue update broadcast', { stationId, queueLength: length, estimatedWait });
}
