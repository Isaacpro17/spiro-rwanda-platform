/**
 * @file settingsService.js
 * @description System-wide settings CRUD with Redis caching.
 * Always falls back to hardcoded defaults if DB or cache is unavailable.
 */

import SystemSettings from '../models/SystemSettings.js';
import { getRedisClient } from '../config/redis.js';
import logger from '../utils/logger.js';

const CACHE_KEY = 'system:settings';
const CACHE_TTL = 300; // 5 minutes

/** Hardcoded defaults — mirror the values that were previously baked into services */
export const DEFAULTS = {
  swapPricingTiers: [
    { name: 'Standard', priceRwf: 500, description: 'Standard per-swap rate' },
  ],
  defaultOperatingHours: { open: '06:00', close: '22:00' },
  smsTemplates: {
    en: {
      reservation: {
        confirmed: 'Your battery swap reservation at {{stationName}} is confirmed. Time: {{time}}. Cancellation code: {{code}}',
        cancelled: 'Your reservation has been cancelled.',
        expired:   'Your reservation expired because you did not arrive in time.',
      },
      payment: {
        success: 'Payment of {{amount}} RWF successful. Ref: {{ref}}',
        failed:  'Your payment failed. Please try again.',
      },
      swap:        { completed: 'Battery swap completed successfully. Thank you for using Spiro!' },
      low:         { inventory: 'Station {{stationName}} has low battery stock: only {{count}} remaining.' },
      maintenance: { created:   'Maintenance request received. ID: {{requestId}}' },
    },
    rw: {
      reservation: {
        confirmed: 'Reservation ya bateri yawe yemejwe kuri {{stationName}}. Igihe: {{time}}. Code yo guhagarika: {{code}}',
        cancelled: 'Reservation yawe ihagaritswe.',
        expired:   'Reservation yawe irangiye kubera ko ntiwagarutse mu gihe.',
      },
      payment: {
        success: 'Kwishyura kwawe kwa {{amount}} RWF byakunze. Ref: {{ref}}',
        failed:  'Kwishyura kwawe ntibyakunze. Ongera ugerageze.',
      },
      swap:        { completed: 'Guhindura bateri byakunze. Urakoze gukoresha Spiro!' },
      low:         { inventory: 'Ikirunga {{stationName}} gifite bateri nke: {{count}} gusa.' },
      maintenance: { created:   'Gusaba gukora maintenance byakiriwe. ID: {{requestId}}' },
    },
  },
  otpExpiryMinutes:  10,
  maxFailedAttempts: 5,
  lockoutMinutes:    30,
};

/**
 * Retrieve system settings. Checks Redis cache first, then DB, then returns DEFAULTS.
 * Never throws — always resolves.
 */
export async function getSettings() {
  try {
    const redis = getRedisClient();
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    let doc = await SystemSettings.findOne({}).lean();
    if (!doc) {
      // Seed defaults on first access
      doc = await SystemSettings.create(DEFAULTS);
    }

    await redis.set(CACHE_KEY, JSON.stringify(doc), 'EX', CACHE_TTL);
    return doc;
  } catch (err) {
    logger.warn('settingsService.getSettings fell back to defaults', { error: err.message });
    return DEFAULTS;
  }
}

/**
 * Persist partial settings updates. Invalidates cache on success.
 * @param {Partial<typeof DEFAULTS>} updates
 */
export async function updateSettings(updates) {
  const doc = await SystemSettings.findOneAndUpdate(
    {},
    { $set: updates },
    { upsert: true, new: true, runValidators: true }
  );

  try {
    const redis = getRedisClient();
    await redis.del(CACHE_KEY);
  } catch (err) {
    logger.warn('settingsService: failed to invalidate cache', { error: err.message });
  }

  return doc;
}
