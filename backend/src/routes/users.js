/**
 * @file users.js
 * @description User management routes (admin only)
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as userController from '../controllers/userController.js';

const router = Router();

// All user management routes require admin authentication
router.use(authenticate);
router.use(requireRole('admin'));

// GET /users/stats - User statistics
router.get('/stats', userController.getUserStats);

// PUT /users/bulk/status - Bulk update user status
router.put(
  '/bulk/status',
  [
    body('userIds').isArray().withMessage('userIds must be an array'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ],
  userController.bulkUpdateStatus
);

// GET /users - List all users
router.get('/', userController.listUsers);

// POST /users - Create new user
router.post(
  '/',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role')
      .isIn(['rider', 'operator', 'admin', 'technician'])
      .withMessage('Invalid role'),
    body('language').optional().isIn(['rw', 'en']),
  ],
  userController.createUser
);

// GET /users/:id - Get user details
router.get('/:id', userController.getUser);

// PUT /users/:id - Update user
router.put('/:id', userController.updateUser);

// DELETE /users/:id - Delete user
router.delete('/:id', userController.deleteUser);

// PUT /users/:id/role - Change user role
router.put(
  '/:id/role',
  [
    body('role')
      .isIn(['rider', 'operator', 'admin', 'technician'])
      .withMessage('Invalid role'),
  ],
  userController.changeUserRole
);

// PUT /users/:id/password - Reset user password
router.put(
  '/:id/password',
  [body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')],
  userController.resetPassword
);

// PUT /users/:id/status - Toggle user active status
router.put(
  '/:id/status',
  [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
  userController.toggleUserStatus
);

export default router;
