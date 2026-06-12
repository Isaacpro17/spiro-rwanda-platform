/**
 * @file swapController.js
 */

import * as swapService from '../services/swapService.js';
import * as queueService from '../services/queueService.js';
import SlotReservation from '../models/SlotReservation.js';
import SwapTransaction from '../models/SwapTransaction.js';

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

/**
 * GET /api/v1/queue/my-position
 * Returns the authenticated rider's current position in any live queue.
 * Returns null data if not in any queue.
 */
export async function getMyQueuePosition(req, res, next) {
  try {
    const data = await queueService.getMyQueuePosition(req.user.userId);
    res.json({
      success: true,
      data,
      message: data ? 'In queue.' : 'Not in queue.',
      error: '',
    });
  } catch (err) { next(err); }
}

/**
 * DELETE /api/v1/queue/:stationId/riders/:riderId
 * Operator or admin removes a specific rider from the live queue.
 */
export async function removeRiderFromQueue(req, res, next) {
  try {
    const io = req.app.get('io');
    await queueService.leaveQueue(req.params.stationId, req.params.riderId);
    await queueService.broadcastQueueUpdate(req.params.stationId, io);
    res.json({ success: true, data: {}, message: 'Rider removed from queue.', error: '' });
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

/**
 * GET /api/v1/swaps/my-reservations
 * Get the authenticated rider's upcoming confirmed reservations.
 */
export async function getMyReservations(req, res, next) {
  try {
    // Include reservations from up to 30 min ago so a rider at the station
    // still sees their active slot during the 15-minute auto-cancel grace window.
    const windowStart = new Date(Date.now() - 30 * 60 * 1000);
    const data = await SlotReservation.find({
      riderId:      req.user.userId,
      status:       'confirmed',
      reservedTime: { $gte: windowStart },
    })
      .populate('stationId', 'name address')
      .sort({ reservedTime: 1 });

    res.json({ success: true, data, message: 'Reservations retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/swaps/rider/:riderId/last-battery
 * Returns the battery a rider currently holds (chargedBatteryId from their last
 * completed swap). Accessible to operators and admins to pre-fill the depleted
 * battery field during a swap transaction.
 */
export async function getRiderLastBattery(req, res, next) {
  try {
    const swap = await SwapTransaction.findOne({
      riderId: req.params.riderId,
      status: 'completed',
    })
      .populate('chargedBatteryId', 'serialNumber chargeLevel status')
      .sort({ startTime: -1 })
      .lean();

    const battery = swap?.chargedBatteryId ?? null;
    res.json({ success: true, data: battery, message: battery ? 'Battery found.' : 'No previous swap found.', error: '' });
  } catch (err) { next(err); }
}

/**
 * GET /api/v1/swaps/my-swaps
 * Rider-scoped swap history with optional ?limit, ?status, ?startDate filters.
 */
export async function getMySwaps(req, res, next) {
  try {
    const { limit = 50, status, startDate } = req.query;

    const filter = { riderId: req.user.userId };
    if (status)    filter.status    = status;
    if (startDate) filter.startTime = { $gte: new Date(startDate) };

    const data = await SwapTransaction.find(filter)
      .populate('stationId',        'name address')
      .populate('depletedBatteryId','serialNumber')
      .populate('chargedBatteryId', 'serialNumber')
      .populate('paymentId',        'amountRwf status')
      .sort({ startTime: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data, message: 'Swaps retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}
