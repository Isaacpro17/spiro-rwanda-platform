/**
 * @file swapController.js
 */

import * as swapService from '../services/swapService.js';
import * as queueService from '../services/queueService.js';
import * as auditService from '../services/auditService.js';
import SlotReservation from '../models/SlotReservation.js';
import SwapTransaction from '../models/SwapTransaction.js';

const { EVENTS } = auditService;

export async function reserve(req, res, next) {
  try {
    const { stationId, reservedTime } = req.body;
    const data = await swapService.createReservation(req.user.userId, stationId, new Date(reservedTime));
    res.status(201).json({ success: true, data, message: 'Reservation confirmed.', error: '' });
    void auditService.log({
      eventType: EVENTS.RESERVATION_CREATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Reservation',
      resourceId: data._id?.toString(),
      description: `Rider ${req.user.userId} reserved a swap slot at station ${stationId}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

export async function cancelReservation(req, res, next) {
  try {
    const io = req.app.get('io');
    await swapService.cancelReservation(req.params.id, 'rider', io);
    res.json({ success: true, data: {}, message: 'Reservation cancelled.', error: '' });
    void auditService.log({
      eventType: EVENTS.RESERVATION_CANCELLED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Reservation',
      resourceId: req.params.id,
      description: `Reservation ${req.params.id} cancelled by rider ${req.user.userId}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** PATCH /swaps/reserve/:id/complete — operator marks reservation fulfilled after swap */
export async function completeReservationByOperator(req, res, next) {
  try {
    const io = req.app.get('io');
    await swapService.markReservationCompleted(req.params.id, io);
    res.json({ success: true, data: {}, message: 'Reservation marked as completed.', error: '' });
    void auditService.log({
      eventType: EVENTS.RESERVATION_CANCELLED, // closest existing event — swap audit covers the swap itself
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Reservation',
      resourceId: req.params.id,
      description: `Reservation ${req.params.id} fulfilled and marked completed by operator ${req.user.userId}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

export async function completeSwap(req, res, next) {
  try {
    const io = req.app.get('io');
    const { riderId, stationId, depletedBatteryId, chargedBatteryId } = req.body;
    const data = await swapService.completeSwap(riderId, stationId, depletedBatteryId, chargedBatteryId, io);
    res.json({ success: true, data, message: 'Swap completed.', error: '' });
    void auditService.log({
      eventType: EVENTS.SWAP_COMPLETED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'SwapTransaction',
      resourceId: data._id?.toString(),
      description: `Swap completed for rider ${riderId} at station ${stationId}`,
      ipAddress: req.ip,
    }).catch(() => {});
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

/** GET /api/v1/queue/my-position */
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

/** DELETE /api/v1/queue/:stationId/riders/:riderId */
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

/** GET /api/v1/swaps/bookings — admin */
export async function getAllBookings(req, res, next) {
  try {
    const data = await swapService.getAllBookings(req.query);
    res.json({ success: true, data, message: 'Bookings retrieved.', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/swaps/bookings/stats — admin */
export async function getBookingStats(req, res, next) {
  try {
    const data = await swapService.getBookingStats();
    res.json({ success: true, data, message: 'Booking statistics retrieved.', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/swaps/all — admin */
export async function getAllSwaps(req, res, next) {
  try {
    const data = await swapService.getAllSwaps(req.query);
    res.json({ success: true, data, message: 'Swaps retrieved.', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/swaps/stats — admin */
export async function getSwapStats(req, res, next) {
  try {
    const data = await swapService.getSwapStats();
    res.json({ success: true, data, message: 'Swap statistics retrieved.', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/swaps/my-reservations */
export async function getMyReservations(req, res, next) {
  try {
    const windowStart = new Date(Date.now() - 30 * 60 * 1000);
    const data = await SlotReservation.find({
      riderId:      req.user.userId,
      status:       'confirmed',
      reservedTime: { $gte: windowStart },
    })
      .populate('stationId', 'name address')
      .sort({ reservedTime: 1 });

    res.json({ success: true, data, message: 'Reservations retrieved.', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/swaps/rider/:riderId/last-battery */
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

/** GET /api/v1/swaps/my-swaps */
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
  } catch (err) { next(err); }
}
