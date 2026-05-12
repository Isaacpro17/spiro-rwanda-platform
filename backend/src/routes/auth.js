/**
 * @file auth.js
 * @description Auth routes with express-validator input validation.
 */

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

/** Runs validation and throws ValidationError if any fail */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationError('Validation failed', errors.array()));
  }
  next();
}

// POST /auth/register
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['rider', 'operator', 'technician']).withMessage('Invalid role — admin accounts cannot be self-registered'),
    body('language').optional().isIn(['rw', 'en']),
    body('nid')
      .trim()
      .notEmpty().withMessage('National ID number is required')
      .isLength({ min: 16, max: 16 }).withMessage('National ID must be exactly 16 digits')
      .isNumeric().withMessage('National ID must contain only digits'),
    body('vehicleRegistration').optional().trim(),
    body('motorcycleModel').optional().trim(),
  ],
  validate,
  authController.register
);

// POST /auth/verify-otp
router.post(
  '/verify-otp',
  [
    body('userId').notEmpty().withMessage('userId is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  authController.verifyOtp
);

// POST /auth/resend-otp
router.post(
  '/resend-otp',
  [body('phone').trim().notEmpty().withMessage('Phone number is required')],
  validate,
  authController.resendOtp
);

// POST /auth/login
router.post(
  '/login',
  [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// POST /auth/refresh
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.refresh
);

// POST /auth/logout
router.post(
  '/logout',
  authenticate,
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.logout
);

// GET /auth/me — returns the current user's profile (requires valid access token)
router.get('/me', authenticate, authController.me);

// ── DEV-ONLY: view OTP without SMS ────────────────────────────────────────────
// This route is disabled automatically in production.
if (process.env.NODE_ENV !== 'production') {
  import('../models/Otp.js').then(({ default: Otp }) => {
    import('../models/User.js').then(({ default: User }) => {
      router.get('/dev/otp', async (req, res) => {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ success: false, message: 'phone query param required' });

        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const otp = await Otp.findOne({ userId: user._id, used: false }).sort({ createdAt: -1 });
        if (!otp) return res.status(404).json({ success: false, message: 'No active OTP found' });

        res.json({ success: true, data: { otp: otp.code, expiresAt: otp.expiresAt } });
      });
    });
  });
}

export default router;
