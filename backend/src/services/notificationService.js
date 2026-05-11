/**
 * @file notificationService.js
 * @description Notification service: SMS (Africa's Talking) and in-app (Socket.IO).
 * Supports Kinyarwanda/English, retry logic, and full logging.
 */

import NotificationLog from '../models/NotificationLog.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

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
  const message = resolveMessage(messageKey, params, language);

  if (channel === 'sms' || channel === 'both') {
    await sendSms(userId, user.phone, message, language);
  }

  if ((channel === 'in_app' || channel === 'both') && io) {
    sendInApp(userId, message, messageKey, io);
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
 */
function sendInApp(userId, message, type, io) {
  io.to(`rider:${userId}`).emit('rider:notification', { message, type, timestamp: new Date() });
  logger.info('In-app notification sent', { userId, type });
}

/**
 * Resolves a message from key + params.
 * Simple interpolation — full i18n handled in frontend.
 * @param {string} key
 * @param {Object} params
 * @param {string} language
 * @returns {string}
 */
function resolveMessage(key, params, language) {
  // Basic message templates
  const templates = {
    rw: {
      'reservation.confirmed': `Reservation ya bateri yawe yemejwe kuri ${params.stationName || 'ikirunga'}. Igihe: ${params.time || ''}. Code yo guhagarika: ${params.code || ''}`,
      'reservation.cancelled': `Reservation yawe ihagaritswe.`,
      'reservation.expired': `Reservation yawe irangiye kubera ko ntiwagarutse mu gihe.`,
      'payment.success': `Kwishyura kwawe kwa ${params.amount || ''} RWF byakunze. Ref: ${params.ref || ''}`,
      'payment.failed': `Kwishyura kwawe ntibyakunze. Ongera ugerageze.`,
      'swap.completed': `Guhindura bateri byakunze. Urakoze gukoresha Spiro!`,
      'low.inventory': `Ikirunga ${params.stationName || ''} gifite bateri nke: ${params.count || 0} gusa.`,
      'maintenance.created': `Gusaba gukora maintenance byakiriwe. ID: ${params.requestId || ''}`,
    },
    en: {
      'reservation.confirmed': `Your battery swap reservation at ${params.stationName || 'station'} is confirmed. Time: ${params.time || ''}. Cancellation code: ${params.code || ''}`,
      'reservation.cancelled': `Your reservation has been cancelled.`,
      'reservation.expired': `Your reservation expired because you did not arrive in time.`,
      'payment.success': `Payment of ${params.amount || ''} RWF successful. Ref: ${params.ref || ''}`,
      'payment.failed': `Your payment failed. Please try again.`,
      'swap.completed': `Battery swap completed successfully. Thank you for using Spiro!`,
      'low.inventory': `Station ${params.stationName || ''} has low battery stock: only ${params.count || 0} remaining.`,
      'maintenance.created': `Maintenance request received. ID: ${params.requestId || ''}`,
    },
  };

  const lang = templates[language] || templates.en;
  return lang[key] || key;
}
