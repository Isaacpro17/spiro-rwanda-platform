/**
 * @file swapController.js
 */

import * as swapService from '../services/swapService.js';
import * as queueService from '../services/queueService.js';

export async function reserve(req, res, next) {
  try {
    const { stationId, reservedTime } = req.body;
    const data = await swapService.createReservation(req.user.userId, stationId, new Date(reservedTime));
    res.status(201).json({ success: true, data, message: 'Reservation confirmed.', error: '' });
  } catch (err) { next(err); }
}

export async function cancelReservation(req, res, next) {
  try {
    const io = req.app.get('io');
    await swapService.cancelReservation(req.params.id, 'rider', io);
    res.json({ success: true, data: {}, message: 'Reservation cancelled.', error: '' });
  } catch (err) { next(err); }
}

export async function completeSwap(req, res, next) {
  try {
    const io = req.app.get('io');
    const { riderId, stationId, depletedBatteryId, chargedBatteryId } = req.body;
    const data = await swapService.completeSwap(riderId, stationId, depletedBatteryId, chargedBatteryId, io);
    res.json({ success: true, data, message: 'Swap completed.', error: '' });
  } catch (err) { next(err); }
}

export async function getSwap(req, res, next) {
  try {
    const { SwapTransaction } = await import('../models/SwapTransaction.js');
    const data = await SwapTransaction.findById(req.params.id);
    res.json({ success: true, data, message: 'Swap retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function getGuidance(req, res, next) {
  try {
    const lang = req.query.lang || req.user?.language || 'rw';
    const data = swapService.getSwapGuidance(lang);
    res.json({ success: true, data, message: 'Guidance retrieved.', error: '' });
  } catch (err) { next(err); }
}

export async function joinQueue(req, res, next) {
  try {
    const data = await queueService.joinQueue(req.params.stationId, req.user.userId);
    res.json({ success: true, data, message: 'Joined queue.', error: '' });
  } catch (err) { next(err); }
}

export async function leaveQueue(req, res, next) {
  try {
    await queueService.leaveQueue(req.params.stationId, req.user.userId);
    res.json({ success: true, data: {}, message: 'Left queue.', error: '' });
  } catch (err) { next(err); }
}

export async function getQueueStatus(req, res, next) {
  try {
    const data = await queueService.getQueueStatus(req.params.stationId);
    res.json({ success: true, data, message: 'Queue status retrieved.', error: '' });
  } catch (err) { next(err); }
}


/**
 * GET /api/v1/swaps/bookings
 * Get all bookings (admin)
 */
export async function getAllBookings(req, res, next) {
  try {
    const data = await swapService.getAllBookings(req.query);
    res.json({ success: true, data, message: 'Bookings retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/swaps/bookings/stats
 * Get booking statistics (admin)
 */
export async function getBookingStats(req, res, next) {
  try {
    const data = await swapService.getBookingStats();
    res.json({ success: true, data, message: 'Booking statistics retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/swaps/all
 * Get all swap transactions (admin)
 */
export async function getAllSwaps(req, res, next) {
  try {
    const data = await swapService.getAllSwaps(req.query);
    res.json({ success: true, data, message: 'Swaps retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/swaps/stats
 * Get swap statistics (admin)
 */
export async function getSwapStats(req, res, next) {
  try {
    const data = await swapService.getSwapStats();
    res.json({ success: true, data, message: 'Swap statistics retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}
