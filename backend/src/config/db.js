/**
 * @file db.js
 * @description MongoDB connection configuration using Mongoose.
 * Handles connection lifecycle, retry logic, and graceful shutdown.
 */

import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

/** @type {boolean} Tracks whether a connection attempt is already in progress */
let isConnecting = false;

/**
 * Establishes a connection to MongoDB using the URI from environment variables.
 * Implements exponential back-off retry on failure (max 5 attempts).
 *
 * @param {number} [attempt=1] - Current retry attempt number (used internally for recursion).
 * @returns {Promise<void>}
 * @throws {Error} After 5 failed connection attempts.
 */
export async function connectDB(attempt = 1) {
  if (isConnecting) return;
  isConnecting = true;

  const MAX_ATTEMPTS = 5;
  const BASE_DELAY_MS = 1_000;

  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
    });

    isConnecting = false;
    logger.info('MongoDB connected', { uri: env.mongodbUri.replace(/\/\/.*@/, '//***@') });

    // Re-attach event listeners after successful connection
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });
  } catch (err) {
    isConnecting = false;

    if (attempt >= MAX_ATTEMPTS) {
      logger.error('MongoDB connection failed after maximum retries', {
        attempts: MAX_ATTEMPTS,
        error: err.message,
      });
      throw err;
    }

    const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
    logger.warn(`MongoDB connection attempt ${attempt} failed — retrying in ${delay}ms`, {
      error: err.message,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
    await connectDB(attempt + 1);
  }
}

/**
 * Gracefully closes the MongoDB connection.
 * Should be called during application shutdown.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

/**
 * Returns the current MongoDB connection state as a human-readable string.
 *
 * @returns {'connected' | 'disconnected' | 'connecting' | 'disconnecting'}
 */
export function getDBStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'disconnected';
}
