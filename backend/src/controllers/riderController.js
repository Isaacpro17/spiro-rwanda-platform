/**
 * @file riderController.js
 */

import * as riderService from '../services/riderService.js';
import * as pendingTxService from '../services/pendingTransactionService.js';
import * as auditService from '../services/auditService.js';

const { EVENTS } = auditService;

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

/** GET /riders/transactions/pending — get the rider's current pending transaction (for modal) */
export async function getPendingTransaction(req, res, next) {
  try {
    const tx = await pendingTxService.getPendingForRider(req.user.userId);
    res.json({ success: true, data: tx ?? null, message: '', error: '' });
  } catch (err) { next(err); }
}

/** POST /riders/transactions/:id/confirm — rider enters PIN to apply the transaction */
export async function confirmTransaction(req, res, next) {
  try {
    const { pin } = req.body;
    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, data: {}, message: 'PIN must be exactly 4 digits', error: 'bad_request' });
    }
    const result = await pendingTxService.confirm(req.params.id, req.user.userId, pin);
    res.json({ success: true, data: result, message: 'Transaction confirmed successfully!', error: '' });

    void auditService.log({
      eventType: EVENTS.WALLET_TOPUP,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'PendingTransaction',
      resourceId: req.params.id,
      description: `Rider confirmed ${result.type} transaction — RWF ${result.amountRwf}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}
