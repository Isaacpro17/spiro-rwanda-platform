/**
 * @file notificationService.js
 * @description Notification service: SMS (Africa's Talking) and in-app (Socket.IO).
 * Supports Kinyarwanda/English, retry logic, and full logging.
 */

import NotificationLog from '../models/NotificationLog.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { getSettings, DEFAULTS } from './settingsService.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sends a notification via SMS and/or in-app channel.
 * @param {string} userId
 * @param {string} messageKey - i18n key or direct message
 * @param {Object} params - interpolation params
 * @param {'sms'|'in_app'|'both'} channel
 * @param {import('socket.io').Server} [io]
 * @returns {Promise<void>}
 */
export async function sendNotification(userId, messageKey, params = {}, channel = 'both', io = null) {
  const user = await User.findById(userId);
  if (!user) {
    logger.warn('Notification: user not found', { userId });
    return;
  }

  const language = user.language || 'rw';
  const message = await resolveMessage(messageKey, params, language);

  if (channel === 'sms' || channel === 'both') {
    await sendSms(userId, user.phone, message, language);
  }

  if ((channel === 'in_app' || channel === 'both') && io) {
    const log = await NotificationLog.create({
      recipientUserId: userId,
      channel: 'in_app',
      messageKey,
      messageContent: message,
      language,
      status: 'sent',
      deliveredAt: new Date(),
    });
    sendInApp(userId, message, messageKey, io, log._id);
  }
}

/**
 * Sends SMS via Africa's Talking gateway with retry logic.
 * @param {string} userId
 * @param {string} phone
 * @param {string} message
 * @param {string} language
 * @returns {Promise<void>}
 */
async function sendSms(userId, phone, message, language) {
  const log = await NotificationLog.create({
    recipientUserId: userId,
    channel: 'sms',
    messageContent: message,
    language,
    phone,
    status: 'pending',
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await dispatchSms(phone, message);
      await NotificationLog.findByIdAndUpdate(log._id, {
        status: 'sent',
        deliveredAt: new Date(),
      });
      return;
    } catch (err) {
      logger.warn(`SMS attempt ${attempt + 1} failed`, { userId, phone, error: err.message });

      if (attempt === MAX_RETRIES) {
        await NotificationLog.findByIdAndUpdate(log._id, {
          status: 'failed',
          retryCount: attempt,
        });
        logger.error('SMS delivery failed after max retries', { userId, phone });
        return;
      }

      await NotificationLog.findByIdAndUpdate(log._id, { retryCount: attempt + 1 });
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

/**
 * Dispatches SMS via Africa's Talking API.
 * Falls back to console log in development/test.
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<void>}
 */
async function dispatchSms(phone, message) {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    logger.info('SMS (dev/test)', { phone, message });
    return;
  }

  // Production: Africa's Talking integration
  const apiKey = process.env.SMS_GATEWAY_API_KEY;
  const username = process.env.SMS_GATEWAY_USERNAME;

  if (!apiKey || !username) {
    logger.warn('SMS gateway not configured — skipping');
    return;
  }

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'apiKey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      username,
      to: phone,
      message,
      from: process.env.SMS_SENDER_ID || 'SPIRO',
    }),
  });

  if (!response.ok) {
    throw new Error(`SMS gateway error: ${response.status}`);
  }
}

/**
 * Sends in-app notification via Socket.IO.
 * @param {string} userId
 * @param {string} message
 * @param {string} type
 * @param {import('socket.io').Server} io
 * @param {import('mongoose').Types.ObjectId} logId
 */
function sendInApp(userId, message, type, io, logId) {
  io.to(`rider:${userId}`).emit('rider:notification', { _id: logId, message, type, timestamp: new Date() });
  logger.info('In-app notification sent', { userId, type, logId });
}

/**
 * Resolves a message from key + params using DB-stored templates (with fallback).
 * Templates use {{token}} placeholders; direct message strings pass through unchanged.
 * @param {string} key
 * @param {Object} params
 * @param {string} language
 * @returns {Promise<string>}
 */
async function resolveMessage(key, params, language) {
  let templates;
  try {
    const settings = await getSettings();
    templates = settings.smsTemplates ?? DEFAULTS.smsTemplates;
  } catch {
    templates = DEFAULTS.smsTemplates;
  }

  const langMap = templates[language] ?? templates.en ?? {};

  // Navigate nested path: 'reservation.confirmed' → langMap.reservation.confirmed
  const template = key.split('.').reduce((obj, k) => obj?.[k], langMap);

  // No template match — key is likely a direct message string, return as-is
  if (typeof template !== 'string') return key;

  // Replace {{token}} placeholders with params
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ''));
}
