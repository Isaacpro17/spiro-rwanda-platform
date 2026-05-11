/**
 * @file userController.js
 * @description User management route handlers
 */

import * as userService from '../services/userService.js';

/**
 * GET /api/v1/users
 * List all users with filtering and pagination
 */
export async function listUsers(req, res, next) {
  try {
    const data = await userService.listUsers(req.query);
    res.json({
      success: true,
      data,
      message: 'Users retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/:id
 * Get user details by ID
 */
export async function getUser(req, res, next) {
  try {
    const data = await userService.getUser(req.params.id);
    res.json({
      success: true,
      data,
      message: 'User retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/users
 * Create a new user
 */
export async function createUser(req, res, next) {
  try {
    const data = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      data,
      message: 'User created successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/:id
 * Update user details
 */
export async function updateUser(req, res, next) {
  try {
    const data = await userService.updateUser(req.params.id, req.body);
    res.json({
      success: true,
      data,
      message: 'User updated successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/users/:id
 * Delete a user
 */
export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.json({
      success: true,
      data: {},
      message: 'User deleted successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/:id/role
 * Change user role
 */
export async function changeUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const data = await userService.changeUserRole(req.params.id, role);
    res.json({
      success: true,
      data,
      message: 'User role changed successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/:id/password
 * Reset user password
 */
export async function resetPassword(req, res, next) {
  try {
    const { password } = req.body;
    await userService.resetPassword(req.params.id, password);
    res.json({
      success: true,
      data: {},
      message: 'Password reset successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/:id/status
 * Toggle user active status
 */
export async function toggleUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const data = await userService.toggleUserStatus(req.params.id, isActive);
    res.json({
      success: true,
      data,
      message: 'User status updated successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/users/stats
 * Get user statistics
 */
export async function getUserStats(req, res, next) {
  try {
    const data = await userService.getUserStats();
    res.json({
      success: true,
      data,
      message: 'User statistics retrieved successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/bulk/status
 * Bulk update user status
 */
export async function bulkUpdateStatus(req, res, next) {
  try {
    const { userIds, isActive } = req.body;
    const data = await userService.bulkUpdateStatus(userIds, isActive);
    res.json({
      success: true,
      data,
      message: 'User statuses updated successfully',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}
