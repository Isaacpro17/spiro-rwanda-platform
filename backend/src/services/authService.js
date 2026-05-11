/**
 * @file authService.js
 * @description Authentication business logic: register, OTP, login, token rotation, logout.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { env } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import { ConflictError, AuthError, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const BCRYPT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const FAILED_WINDOW_MINUTES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a 6-digit numeric OTP.
 * @returns {string}
 */
function generateOtpCode() {
  // crypto.randomInt uses OS CSPRNG — safe for security-sensitive codes.
  // Range [100000, 999999] guarantees a 6-digit string with no leading zero risk.
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Signs a JWT access token.
 * @param {string} userId
 * @param {string} role
 * @returns {string}
 */
function signAccessToken(userId, role) {
  return jwt.sign({ userId, role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

/**
 * Signs a JWT refresh token.
 * @param {string} userId
 * @returns {string}
 */
function signRefreshToken(userId) {
  const jti = crypto.randomUUID();
  return jwt.sign({ userId, jti }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

/**
 * Stores refresh token in Redis with 7-day TTL.
 * @param {string} userId
 * @param {string} token
 * @returns {Promise<void>}
 */
async function storeRefreshToken(userId, token) {
  const redis = getRedisClient();
  const decoded = jwt.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  await redis.set(`session:refresh:${token}`, userId, 'EX', ttl > 0 ? ttl : 604800);
}

/**
 * Revokes a refresh token in Redis.
 * @param {string} token
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(token) {
  const redis = getRedisClient();
  await redis.del(`session:refresh:${token}`);
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Registers a new user, hashes password, sends OTP.
 * @param {{ fullName: string, phone: string, email: string, role: string, language: string, password: string, nid?: string }} data
 * @returns {Promise<{ userId: string, otpSent: boolean }>}
 * @throws {ConflictError} if phone or email already exists
 */
export async function registerUser(data) {
  const { fullName, phone, email, role, language, password, nid } = data;

  // Check duplicates
  const existing = await User.findOne({ $or: [{ phone }, { email }] });
  if (existing) {
    const field = existing.phone === phone ? 'phone' : 'email';
    throw new ConflictError(`A user with this ${field} already exists`);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    fullName,
    phone,
    email,
    passwordHash,
    role,
    language: language || 'rw',
    nid,
    isActive: false,
    isPhoneVerified: false,
  });

  // Generate and store OTP
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await Otp.create({ userId: user._id, code, expiresAt });

  logger.info('User registered, OTP created', { userId: user._id, role });

  // In production this would call notificationService.sendSms()
  // For now we log it (SMS integration in Task 10)
  logger.info(`OTP for ${phone}: ${code}`, { userId: user._id });

  return { userId: user._id.toString(), otpSent: true };
}

/**
 * Verifies OTP and activates the user account.
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<boolean>}
 * @throws {ValidationError} if OTP is invalid or expired
 */
export async function verifyOtp(userId, code) {
  const otp = await Otp.findOne({ userId, code, used: false });

  if (!otp) {
    throw new ValidationError('Invalid OTP code');
  }

  if (otp.expiresAt < new Date()) {
    throw new ValidationError('OTP has expired — please request a new one');
  }

  await Otp.findByIdAndUpdate(otp._id, { used: true });
  await User.findByIdAndUpdate(userId, { isPhoneVerified: true, isActive: true });

  logger.info('OTP verified, account activated', { userId });
  return true;
}

/**
 * Resends a new OTP to the user's phone.
 * @param {string} phone
 * @returns {Promise<{ userId: string, otpSent: boolean }>}
 * @throws {AuthError} if user not found
 */
export async function resendOtp(phone) {
  const user = await User.findOne({ phone });
  if (!user) throw new AuthError('No account found with this phone number');

  // Invalidate old OTPs
  await Otp.updateMany({ userId: user._id, used: false }, { used: true });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await Otp.create({ userId: user._id, code, expiresAt });

  logger.info(`Resent OTP for ${phone}: ${code}`, { userId: user._id });
  return { userId: user._id.toString(), otpSent: true };
}

/**
 * Authenticates a user and issues JWT tokens.
 * @param {string} phone
 * @param {string} password
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: Object }>}
 * @throws {AuthError} on invalid credentials or locked account
 */
export async function loginUser(phone, password) {
  const redis = getRedisClient();

  const user = await User.findOne({ phone });

  // Generic error — don't reveal whether phone or password was wrong
  const genericError = new AuthError('Invalid credentials');

  if (!user) throw genericError;

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthError('Account is temporarily locked — please try again later');
  }

  if (!user.isActive || !user.isPhoneVerified) {
    throw new AuthError('Account is not yet verified — please verify your phone number');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    // Track failed attempts in Redis
    const attemptsKey = `login_attempts:${phone}`;
    const attempts = await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, FAILED_WINDOW_MINUTES * 60);

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await User.findByIdAndUpdate(user._id, {
        lockedUntil: lockUntil,
        failedLoginCount: attempts,
      });
      await redis.del(attemptsKey);
      logger.warn('Account locked after failed attempts', { userId: user._id, attempts });
      throw new AuthError('Account locked for 30 minutes due to too many failed attempts');
    }

    throw genericError;
  }

  // Reset failed attempts on success
  await redis.del(`login_attempts:${phone}`);
  await User.findByIdAndUpdate(user._id, {
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  });

  const accessToken = signAccessToken(user._id.toString(), user.role);
  const refreshToken = signRefreshToken(user._id.toString());
  await storeRefreshToken(user._id.toString(), refreshToken);

  logger.info('User logged in', { userId: user._id, role: user.role });

  return {
    accessToken,
    refreshToken,
    user: user.toSafeObject(),
  };
}

/**
 * Rotates refresh token — invalidates old, issues new pair.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 * @throws {AuthError} if token is invalid or revoked
 */
export async function rotateTokens(refreshToken) {
  const redis = getRedisClient();

  // Verify token signature
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }

  // Check Redis — token must still be valid (not revoked)
  const storedUserId = await redis.get(`session:refresh:${refreshToken}`);
  if (!storedUserId) {
    throw new AuthError('Refresh token has been revoked');
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new AuthError('User account not found or inactive');
  }

  // Revoke old token
  await revokeRefreshToken(refreshToken);

  // Issue new pair
  const newAccessToken = signAccessToken(user._id.toString(), user.role);
  const newRefreshToken = signRefreshToken(user._id.toString());
  await storeRefreshToken(user._id.toString(), newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logs out a user by revoking their refresh token.
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
export async function logout(refreshToken) {
  await revokeRefreshToken(refreshToken);
  logger.info('User logged out, refresh token revoked');
}

/**
 * Retrieves the currently authenticated user's safe profile.
 * Used by the GET /auth/me endpoint to hydrate the frontend after a page refresh.
 *
 * @param {string} userId - The user ID extracted from the verified JWT.
 * @returns {Promise<Object>} Safe user object (no passwordHash / security fields).
 * @throws {AuthError} If the user is not found or account is inactive.
 */
export async function getCurrentUser(userId) {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AuthError('User account not found or inactive');
  }

  return user.toSafeObject();
}
