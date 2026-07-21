/**
 * @file subscriptions.js
 * @description Subscription plan routes.
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import * as subscriptionService from '../services/subscriptionService.js';
import * as auditService from '../services/auditService.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();
const { EVENTS } = auditService;

// ── GET /subscriptions/plans — list active plans (any authenticated user) ────
router.get('/plans', authenticate, async (req, res, next) => {
  try {
    const plans = await subscriptionService.getActivePlans();
    return res.json({ success: true, data: plans, message: 'Plans retrieved', error: '' });
  } catch (err) {
    return next(err);
  }
});

// ── GET /subscriptions/current — rider's active plan ─────────────────────────
router.get('/current', authenticate, requireRole('rider'), async (req, res, next) => {
  try {
    const plan = await subscriptionService.getCurrentSubscription(req.user.userId);
    return res.json({ success: true, data: plan, message: 'Current subscription retrieved', error: '' });
  } catch (err) {
    return next(err);
  }
});

// ── POST /subscriptions/subscribe — rider subscribes to a plan ───────────────
router.post(
  '/subscribe',
  authenticate,
  requireRole('rider'),
  [body('planId').notEmpty().withMessage('Plan ID is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());

      const data = await subscriptionService.subscribeToPlan(req.user.userId, req.body.planId);
      res.status(200).json({ success: true, data, message: 'Subscribed successfully', error: '' });
      void auditService.log({
        eventType: EVENTS.RIDER_SUBSCRIBED,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        resourceType: 'Subscription',
        resourceId: data._id?.toString(),
        description: `Rider ${req.user.userId} subscribed to plan ${req.body.planId}`,
        ipAddress: req.ip,
      }).catch(() => {});
    } catch (err) {
      return next(err);
    }
  }
);

// ── POST /subscriptions/plans — admin creates a plan ─────────────────────────
router.post(
  '/plans',
  authenticate,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Plan name is required'),
    body('priceRwf').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());

      const plan = await SubscriptionPlan.create(req.body);
      res.status(201).json({ success: true, data: plan, message: 'Plan created', error: '' });
      void auditService.log({
        eventType: EVENTS.PLAN_CREATED,
        actorUserId: req.user.userId,
        actorRole: req.user.role,
        resourceType: 'SubscriptionPlan',
        resourceId: plan._id?.toString(),
        description: `Admin created subscription plan "${plan.name}"`,
        ipAddress: req.ip,
      }).catch(() => {});
    } catch (err) {
      return next(err);
    }
  }
);

// ── PUT /subscriptions/plans/:id — admin updates a plan ──────────────────────
router.put('/plans/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, data: {}, message: 'Plan not found', error: 'not_found' });
    res.json({ success: true, data: plan, message: 'Plan updated', error: '' });
    void auditService.log({
      eventType: EVENTS.PLAN_UPDATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'SubscriptionPlan',
      resourceId: req.params.id,
      description: `Admin updated subscription plan "${plan.name}"`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) {
    return next(err);
  }
});

// ── GET /subscriptions/subscribers — admin: paginated list of subscribed riders ─
router.get('/subscribers', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = await subscriptionService.getSubscribers(req.query);
    return res.json({ success: true, data, message: 'Subscribers retrieved', error: '' });
  } catch (err) {
    return next(err);
  }
});

// ── DELETE /subscriptions/subscriber/:riderId — admin removes a rider's plan ────
router.delete('/subscriber/:riderId', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await subscriptionService.removeSubscription(req.params.riderId);
    res.json({ success: true, data: result, message: 'Subscription removed', error: '' });
    void auditService.log({
      eventType: EVENTS.SUBSCRIPTION_REMOVED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'RiderProfile',
      resourceId: req.params.riderId,
      description: `Admin ${req.user.userId} removed subscription for rider ${req.params.riderId}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) {
    return next(err);
  }
});

export default router;
