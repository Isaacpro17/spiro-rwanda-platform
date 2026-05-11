/**
 * @file authController.js
 * @description Auth route handlers — thin layer delegating to authService.
 */

import * as authService from '../services/authService.js';

/** POST /auth/register */
export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result, message: 'Registration successful. Please verify your phone number.', error: '' });
  } catch (err) { next(err); }
}

/** POST /auth/verify-otp */
export async function verifyOtp(req, res, next) {
  try {
    const { userId, code } = req.body;
    await authService.verifyOtp(userId, code);
    res.json({ success: true, data: {}, message: 'Phone number verified. Account activated.', error: '' });
  } catch (err) { next(err); }
}

/** POST /auth/resend-otp */
export async function resendOtp(req, res, next) {
  try {
    const result = await authService.resendOtp(req.body.phone);
    res.json({ success: true, data: result, message: 'OTP resent successfully.', error: '' });
  } catch (err) { next(err); }
}

/** POST /auth/login */
export async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    const result = await authService.loginUser(phone, password);
    res.json({ success: true, data: result, message: 'Login successful.', error: '' });
  } catch (err) { next(err); }
}

/** POST /auth/refresh */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.rotateTokens(refreshToken);
    res.json({ success: true, data: tokens, message: 'Tokens refreshed.', error: '' });
  } catch (err) { next(err); }
}

/** POST /auth/logout */
export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json({ success: true, data: {}, message: 'Logged out successfully.', error: '' });
  } catch (err) { next(err); }
}

/** GET /auth/me — returns the currently authenticated user's profile */
export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.json({ success: true, data: { user }, message: 'User profile retrieved.', error: '' });
  } catch (err) { next(err); }
}
