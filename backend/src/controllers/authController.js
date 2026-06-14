/**
 * @file authController.js
 * @description Auth route handlers — thin layer delegating to authService.
 */

import * as authService from '../services/authService.js';
import * as auditService from '../services/auditService.js';

const { EVENTS } = auditService;

/** POST /auth/register */
export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result, message: 'Registration successful. Please verify your phone number.', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_REGISTERED,
      actorUserId: result.userId?.toString(),
      resourceType: 'User',
      resourceId: result.userId?.toString(),
      description: `New user registered with phone ${result.phone ?? req.body.phone}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** POST /auth/verify-otp */
export async function verifyOtp(req, res, next) {
  try {
    const { userId, code } = req.body;
    await authService.verifyOtp(userId, code);
    res.json({ success: true, data: {}, message: 'Phone number verified. Account activated.', error: '' });
    void auditService.log({
      eventType: EVENTS.OTP_VERIFIED,
      actorUserId: userId,
      resourceType: 'User',
      resourceId: userId,
      description: `OTP verified — account activated for user ${userId}`,
      ipAddress: req.ip,
    }).catch(() => {});
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
  const { phone, password } = req.body;
  try {
    const result = await authService.loginUser(phone, password);
    res.json({ success: true, data: result, message: 'Login successful.', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_LOGIN,
      actorUserId: result.user?._id?.toString() ?? result.user?.id?.toString(),
      actorRole: result.user?.role,
      resourceType: 'User',
      resourceId: result.user?._id?.toString() ?? result.user?.id?.toString(),
      description: `User ${phone} logged in`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) {
    void auditService.log({
      eventType: EVENTS.USER_LOGIN_FAILED,
      resourceType: 'User',
      description: `Failed login attempt for ${phone}`,
      ipAddress: req.ip,
    }).catch(() => {});
    next(err);
  }
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
    void auditService.log({
      eventType: EVENTS.USER_LOGOUT,
      actorUserId: req.user?.userId,
      actorRole: req.user?.role,
      resourceType: 'User',
      resourceId: req.user?.userId,
      description: `User ${req.user?.userId} logged out`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** GET /auth/me — returns the currently authenticated user's profile */
export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.json({ success: true, data: { user }, message: 'User profile retrieved.', error: '' });
  } catch (err) { next(err); }
}

/** PUT /auth/me — updates the authenticated user's own profile */
export async function updateMe(req, res, next) {
  try {
    const user = await authService.updateCurrentUser(req.user.userId, req.body);
    res.json({ success: true, data: { user }, message: 'Profile updated.', error: '' });
  } catch (err) { next(err); }
}

/** PUT /auth/change-password — changes the authenticated user's password */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changeCurrentUserPassword(req.user.userId, currentPassword, newPassword);
    res.json({ success: true, data: {}, message: 'Password changed successfully.', error: '' });
    void auditService.log({
      eventType: EVENTS.PASSWORD_CHANGED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: req.user.userId,
      description: `User ${req.user.userId} changed their password`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}
