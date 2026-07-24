import { Router } from 'express';
import { body } from 'express-validator';
import * as contactController from '../controllers/contactController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Public route to submit a contact message
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').notEmpty().withMessage('Phone number is required').trim(),
    body('subject').notEmpty().withMessage('Subject is required').trim(),
    body('message').notEmpty().withMessage('Message is required').trim(),
  ],
  contactController.submitMessage
);

// Admin-only routes to view and manage messages
router.use(authenticate, requireRole(['admin']));

router.get('/', contactController.getMessages);

router.patch(
  '/:id/status',
  [
    body('status').isIn(['new', 'read', 'replied', 'archived']).withMessage('Invalid status'),
  ],
  contactController.updateMessageStatus
);

export default router;
