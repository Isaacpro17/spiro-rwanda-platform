/**
 * @file riderController.js
 */

import * as riderService from '../services/riderService.js';

export async function getProfile(req, res, next) {
  try {
    const data = await riderService.getRiderProfile(req.user.userId);
    res.json({ success: true, data, message: 'Profile retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const data = await riderService.updateRiderProfile(req.user.userId, req.body);
    res.json({ success: true, data, message: 'Profile updated.', error: '' });
  } catch (err) { next(err); }
}

export async function getHistory(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await riderService.getRiderHistory(req.user.userId, page);
    res.json({ success: true, data, message: 'History retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function redeemLoyalty(req, res, next) {
  try {
    const { points } = req.body;
    const data = await riderService.redeemLoyaltyPoints(req.user.userId, points);
    res.json({ success: true, data, message: 'Loyalty points redeemed.', error: '' });
  } catch (err) { next(err); }
}

export async function exportData(req, res, next) {
  try {
    const data = await riderService.exportRiderData(req.user.userId);
    res.json({ success: true, data, message: 'Data export ready.', error: '' });
  } catch (err) { next(err); }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, data: {}, message: 'New password and confirm password do not match', error: 'password_mismatch' });
    }
    await riderService.changeRiderPassword(req.user.userId, currentPassword, newPassword);
    res.json({ success: true, data: {}, message: 'Password updated successfully.', error: '' });
  } catch (err) { next(err); }
}

export async function deleteAccount(req, res, next) {
  try {
    await riderService.deleteRiderAccount(req.user.userId);
    res.json({ success: true, data: {}, message: 'Account deletion initiated.', error: '' });
  } catch (err) { next(err); }
}
