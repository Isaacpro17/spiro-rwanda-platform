/**
 * @file queueService.js
 * @description Real-time queue management with Redis and Socket.IO.
 */

import SwapTransaction from '../models/SwapTransaction.js';
import SlotReservation from '../models/SlotReservation.js';
import Station from '../models/Station.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

const QUEUE_TTL = 3600; // 1 hour

/**
 * Calculates estimated wait time from last 50 completed swaps.
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
    : 5;

  return Math.round(queueLength * avgDuration);
}

/**
 * Adds a rider to the station queue and records their station in a rider-keyed entry
 * so position can be restored across logout/login.
 * @param {string} stationId
 * @param {string} riderId
 * @returns {Promise<{ position: number, estimatedWait: number }>}
 */
export async function joinQueue(stationId, riderId) {
  const redis = getRedisClient();
  const queueKey = `queue:${stationId}`;
  const riderKey = `rider_queue:${riderId}`;

  // Use lrange + includes — lpos requires Redis 6.0.6+ which may not be available
  const existing = await redis.lrange(queueKey, 0, -1);
  if (!existing.includes(riderId)) {
    await redis.rpush(queueKey, riderId);
    await redis.expire(queueKey, QUEUE_TTL);
  }

  // Track which station this rider is waiting at (survives logout/login)
  await redis.set(riderKey, stationId, 'EX', QUEUE_TTL);

  const queue = await redis.lrange(queueKey, 0, -1);
  const position = queue.indexOf(riderId) + 1;
  const estimatedWait = await calculateWaitTime(stationId);

  return { position, estimatedWait };
}

/**
 * Removes a rider from the station queue and deletes their rider-keyed entry.
 * @param {string} stationId
 * @param {string} riderId
 */
export async function leaveQueue(stationId, riderId) {
  const redis = getRedisClient();
  await redis.lrem(`queue:${stationId}`, 0, riderId);
  await redis.del(`rider_queue:${riderId}`);
}

/**
 * Returns the queue position of a rider across all stations.
 * Used to restore queue state after logout/login.
 * @param {string} riderId
 * @returns {Promise<{ stationId: string, stationName: string, position: number, estimatedWait: number } | null>}
 */
export async function getMyQueuePosition(riderId) {
  const redis = getRedisClient();
  const stationId = await redis.get(`rider_queue:${riderId}`);
  if (!stationId) return null;

  const queue = await redis.lrange(`queue:${stationId}`, 0, -1);
  const idx = queue.indexOf(riderId);

  if (idx === -1) {
    // Stale key — rider was removed from queue but key wasn't cleaned up
    await redis.del(`rider_queue:${riderId}`);
    return null;
  }

  const [estimatedWait, station] = await Promise.all([
    calculateWaitTime(stationId),
    Station.findById(stationId).select('name').lean(),
  ]);

  return {
    stationId,
    stationName: station?.name ?? 'Station',
    position: idx + 1,
    estimatedWait,
  };
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
