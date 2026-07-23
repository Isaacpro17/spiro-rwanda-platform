/**
 * @file paypackService.js
 * @description Paypack Rwanda payment gateway integration.
 *
 * Provides:
 *  - cashin()      → Send USSD push to rider's phone to collect payment
 *  - getTransaction() → Poll Paypack for the latest status of a transaction
 *
 * Authentication is handled automatically via a cached access token that is
 * refreshed before every request if it has expired.
 */

import Paypack from 'paypack-js';
import logger from '../utils/logger.js';

// ── Singleton client (cached) ─────────────────────────────────────────────────

let _client = null;

/**
 * Returns an authenticated Paypack client, creating one if needed.
 * The paypack-js library handles token caching internally.
 */
function getClient() {
  if (_client) return _client;

  const clientId     = process.env.PAYPACK_CLIENT_ID;
  const clientSecret = process.env.PAYPACK_CLIENT_SECRET;
  const environment  = process.env.PAYPACK_ENV || 'development';

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPACK_CLIENT_ID or PAYPACK_CLIENT_SECRET in environment variables');
  }

  _client = Paypack.config({
    client_id:     clientId,
    client_secret: clientSecret,
    environment,       // 'development' or 'production'
  });

  logger.info('Paypack client initialised', { environment });
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
 *   ref    — Paypack's transaction reference (store this to poll later)
 *   status — initial status, usually "pending"
 */
export async function cashin(amount, phoneNumber) {
  const client = getClient();

  logger.info('Paypack cashin initiated', { amount, phone: phoneNumber });

  const response = await client.cashin({
    amount: Number(amount),
    number: String(phoneNumber),
  });

  // paypack-js returns the response data directly
  const ref    = response?.data?.ref    ?? response?.ref;
  const status = response?.data?.status ?? response?.status ?? 'pending';

  if (!ref) {
    logger.error('Paypack cashin response missing ref', { response });
    throw new Error('Paypack did not return a transaction reference. Check your credentials and phone number.');
  }

  logger.info('Paypack cashin created', { ref, status });
  return { ref, status };
}

/**
 * Polls Paypack for the current status of a previously initiated transaction.
 * Use this to implement polling instead of webhooks.
 *
 * @param {string} ref  The Paypack transaction ref returned by cashin()
 * @returns {Promise<{ ref: string, status: string, amount: number, kind: string }>}
 *   status: "pending" | "successful" | "failed"
 */
export async function getTransaction(ref) {
  const client = getClient();

  const response = await client.getTransactions({ ref });

  // paypack-js wraps the result; handle both shapes
  const transactions = response?.data?.transactions ?? response?.transactions ?? [];
  const tx = Array.isArray(transactions) ? transactions[0] : transactions;

  if (!tx) {
    // Transaction not found yet — treat as still pending
    logger.warn('Paypack getTransaction: no record found', { ref });
    return { ref, status: 'pending', amount: 0, kind: 'CASHIN' };
  }

  logger.info('Paypack transaction polled', { ref, status: tx.status });
  return {
    ref:    tx.ref    ?? ref,
    status: tx.status ?? 'pending',   // "pending" | "successful" | "failed"
    amount: tx.amount ?? 0,
    kind:   tx.kind   ?? 'CASHIN',
  };
}
