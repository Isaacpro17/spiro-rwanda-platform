/**
 * @file env.js
 * @description Environment variable validation on startup.
 * Throws a descriptive error if any required variable is missing or invalid.
 */

/**
 * List of required environment variables with optional validation rules.
 * @type {Array<{ key: string, description: string, validate?: (v: string) => boolean }>}
 */
const REQUIRED_VARS = [
  { key: 'NODE_ENV', description: 'Application environment (development|test|production)' },
  { key: 'PORT', description: 'HTTP server port', validate: (v) => !isNaN(Number(v)) },
  { key: 'MONGODB_URI', description: 'MongoDB connection URI' },
  { key: 'REDIS_URL', description: 'Redis connection URL' },
  {
    key: 'JWT_SECRET',
    description: 'JWT signing secret (min 32 characters)',
    validate: (v) => v.length >= 32,
  },
  {
    key: 'JWT_REFRESH_SECRET',
    description: 'JWT refresh token signing secret (min 32 characters)',
    validate: (v) => v.length >= 32,
  },
  { key: 'JWT_EXPIRES_IN', description: 'JWT access token expiry (e.g. 15m)' },
  { key: 'JWT_REFRESH_EXPIRES_IN', description: 'JWT refresh token expiry (e.g. 7d)' },
  { key: 'CORS_ORIGIN', description: 'Allowed CORS origin(s)' },
  { key: 'LOG_LEVEL', description: 'Winston log level' },
  {
    key: 'RATE_LIMIT_WINDOW_MS',
    description: 'Rate limit window in milliseconds (e.g. 60000)',
    validate: (v) => Number.isInteger(Number(v)) && Number(v) > 0,
  },
  {
    key: 'RATE_LIMIT_MAX_REQUESTS',
    description: 'Maximum requests per window per IP (e.g. 100)',
    validate: (v) => Number.isInteger(Number(v)) && Number(v) > 0,
  },
];

/**
 * Validates all required environment variables.
 * Collects all errors before throwing so the developer sees every missing variable at once.
 *
 * @returns {void}
 * @throws {Error} If one or more required variables are missing or invalid.
 */
export function validateEnv() {
  const errors = [];

  for (const { key, description, validate } of REQUIRED_VARS) {
    const value = process.env[key];

    if (!value || value.trim() === '') {
      errors.push(`  ✗ ${key}: ${description} — MISSING`);
      continue;
    }

    if (validate && !validate(value)) {
      errors.push(`  ✗ ${key}: ${description} — INVALID value "${value}"`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `\n\nEnvironment variable validation failed:\n${errors.join('\n')}\n\n` +
        `Copy .env.example to .env and fill in all required values.\n`
    );
  }
}

/**
 * Parsed and typed environment configuration object.
 * Uses getters so values are read from process.env at access time,
 * allowing tests to set env vars before importing modules.
 *
 * @type {Object}
 */
export const env = {
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get port() { return Number(process.env.PORT) || 5000; },
  get mongodbUri() { return process.env.MONGODB_URI; },
  get redisUrl() { return process.env.REDIS_URL; },
  get jwt() {
    return {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    };
  },
  get corsOrigin() { return process.env.CORS_ORIGIN || 'http://localhost:3000'; },
  get logLevel() { return process.env.LOG_LEVEL || 'info'; },
  get rateLimit() {
    return {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
      maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    };
  },
};
