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
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

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
      return res.status(200).json({ success: true, data, message: 'Subscribed successfully', error: '' });
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
      return res.status(201).json({ success: true, data: plan, message: 'Plan created', error: '' });
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
    return res.json({ success: true, data: plan, message: 'Plan updated', error: '' });
  } catch (err) {
    return next(err);
  }
});

export default router;
