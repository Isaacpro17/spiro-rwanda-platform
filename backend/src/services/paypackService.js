/**
 * @file paypackService.js
 * @description Paypack Rwanda payment gateway integration.
 *
 * Correct usage per official README:
 *   const paypackJs = require("paypack").default;
 *   const paypack = new paypackJs({ client_id, client_secret });
 *
 * Provides:
 *  - cashin()         → Send USSD push to rider's phone to collect payment
 *  - getTransaction() → Poll Paypack events for the latest status of a ref
 */

import { createRequire } from 'module';
import logger from '../utils/logger.js';

// paypack-js uses CommonJS exports (module.exports.default = ...) so we
// must load it with require() inside an ESM project.
const require = createRequire(import.meta.url);
const PaypackJs = require('paypack-js').default;

// ── Singleton client ──────────────────────────────────────────────────────────

let _client = null;

/**
 * Returns an authenticated Paypack client (singleton).
 * Uses the constructor pattern from the official README.
 */
function getClient() {
  if (_client) return _client;

  const clientId     = process.env.PAYPACK_CLIENT_ID;
  const clientSecret = process.env.PAYPACK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new AppError('Missing PAYPACK_CLIENT_ID or PAYPACK_CLIENT_SECRET in environment variables', 500, 'PAYMENT_GATEWAY_ERROR');
  }

  // Correct instantiation per official README
  _client = new PaypackJs({ client_id: clientId, client_secret: clientSecret });

  logger.info('Paypack client initialised');
  return _client;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initiates a Cashin (collect money FROM the rider's phone).
 * Paypack sends a USSD PIN prompt to the rider's mobile money number.
 *
 * @param {number} amount        Amount in RWF (minimum 100)
 * @param {string} phoneNumber   Rider's Mobile Money phone number (e.g. "078xxxxxxx")
 * @returns {Promise<{ ref: string, status: string }>}
 */
export async function cashin(amount, phoneNumber) {
  const client      = getClient();
  const environment = process.env.PAYPACK_ENV || 'development';

  logger.info('Paypack cashin initiated', { amount, phone: phoneNumber, environment });

  let response;
  try {
    response = await client.cashin({
      number:      String(phoneNumber),
      amount:      Number(amount),
      environment,            // "development" or "production"
    });
  } catch (error) {
    logger.error('Paypack cashin failed', { error: error.message, status: error.response?.status });
    
    // Throw a more readable error if Paypack is down or returns a Bad Gateway
    if (error.response?.status >= 500) {
      throw new AppError('Payment gateway is currently unavailable. Please try again in a few moments.', 502, 'PAYMENT_GATEWAY_UNAVAILABLE');
    }
    throw new AppError(error.response?.data?.message || error.message || 'Payment request failed.', 400, 'PAYMENT_REQUEST_FAILED');
  }

  // Response shape: response.data = { ref, status, ... }
  const data   = response?.data ?? response;
  const ref    = data?.ref;
  const status = data?.status ?? 'pending';

  if (!ref) {
    logger.error('Paypack cashin response missing ref', { response });
    throw new AppError('Paypack did not return a transaction reference. Check your credentials and phone number.', 500, 'PAYMENT_GATEWAY_ERROR');
  }

  logger.info('Paypack cashin created', { ref, status });
  return { ref, status };
}

/**
 * Polls Paypack events for the current status of a transaction.
 * The events endpoint contains the latest status in `event.data.status`.
 *
 * @param {string} ref  The Paypack transaction ref returned by cashin()
 * @returns {Promise<{ ref: string, status: string }>}
 *   status: "pending" | "successful" | "failed"
 */
export async function getTransaction(ref) {
  const client = getClient();

  // Use events API because it contains the exact status transitions
  const response = await client.events({ ref, limit: 1 });
  const data = response?.data ?? response;
  
  // Paypack returns a list of events under `transactions` in the events response
  const eventsList = data?.transactions ?? data?.events ?? [];
  const event = Array.isArray(eventsList) ? eventsList[0] : null;

  if (!event || !event.data) {
    logger.info('Paypack: no event data found yet (still pending)', { ref });
    return { ref, status: 'pending' };
  }

  // event.data contains { status: 'successful', ... }
  let status = (event.data.status ?? 'pending').toLowerCase();
  
  // Normalise Paypack's typo if it ever happens: "successfull" → "successful"
  if (status === 'successfull') status = 'successful';

  logger.info('Paypack transaction polled via events', { ref, status });
  return { ref, status };
}

