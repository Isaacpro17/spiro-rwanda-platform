/**
 * @file logger.js
 * @description Structured logger using Winston.
 * Outputs JSON in production and colorized text in development.
 * Never logs sensitive fields (passwords, tokens, secrets).
 */

import { createLogger, format, transports } from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, printf } = format;

/**
 * Custom printf format for human-readable development output.
 */
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${message}${metaStr}`;
});

/**
 * Redacts sensitive keys from log metadata before output.
 * Prevents accidental logging of passwords, tokens, or secrets.
 */
const redactSensitive = format((info) => {
  const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'authorization'];

  const redact = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(result)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        result[key] = '[REDACTED]';
      } else if (typeof result[key] === 'object') {
        result[key] = redact(result[key]);
      }
    }
    return result;
  };

  return redact(info);
});

const isDevelopment = env.nodeEnv !== 'production';

/**
 * Winston logger instance.
 * Use this throughout the application instead of console.log.
 *
 * @example
 * import logger from '../utils/logger.js';
 * logger.info('Server started', { port: 5000 });
 * logger.error('Database error', { error: err.message });
 *
 * @type {import('winston').Logger}
 */
const logger = createLogger({
  level: env.logLevel || 'info',
  format: combine(
    redactSensitive(),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true }),
    isDevelopment ? combine(colorize(), devFormat) : json()
  ),
  transports: [
    new transports.Console({
      silent: env.nodeEnv === 'test', // Suppress logs during tests
    }),
  ],
  exitOnError: false,
});

export default logger;
