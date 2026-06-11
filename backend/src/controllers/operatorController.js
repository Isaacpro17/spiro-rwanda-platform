/**
 * @file operatorController.js
 * @description Operator-specific route handlers.
 */

import User from '../models/User.js';

/** GET /operators/rider-lookup?phone=X — find a rider by phone number */
export async function lookupRider(req, res, next) {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'phone query parameter is required', error: 'Bad Request' });
    }
    const rider = await User.findOne({ phone: phone.trim(), role: 'rider' }).select('_id fullName phone');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'No rider found with this phone number', error: 'Not Found' });
    }
    res.json({ success: true, data: rider, message: 'Rider found.', error: '' });
  } catch (err) { next(err); }
}
