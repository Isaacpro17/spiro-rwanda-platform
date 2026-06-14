/**
 * @file userController.js
 * @description User management route handlers
 */

import * as userService from '../services/userService.js';
import * as auditService from '../services/auditService.js';

const { EVENTS } = auditService;

/** GET /api/v1/users */
export async function listUsers(req, res, next) {
  try {
    const data = await userService.listUsers(req.query);
    res.json({ success: true, data, message: 'Users retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** GET /api/v1/users/:id */
export async function getUser(req, res, next) {
  try {
    const data = await userService.getUser(req.params.id);
    res.json({ success: true, data, message: 'User retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** POST /api/v1/users */
export async function createUser(req, res, next) {
  try {
    const data = await userService.createUser(req.body);
    res.status(201).json({ success: true, data, message: 'User created successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_CREATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: data._id?.toString(),
      description: `Admin created user ${data.fullName ?? ''} (${data.phone ?? ''})`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** PUT /api/v1/users/:id */
export async function updateUser(req, res, next) {
  try {
    const data = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data, message: 'User updated successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_UPDATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: req.params.id,
      description: `Admin updated user ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** DELETE /api/v1/users/:id */
export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ success: true, data: {}, message: 'User deleted successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_DELETED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: req.params.id,
      description: `Admin deleted user ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** PUT /api/v1/users/:id/role */
export async function changeUserRole(req, res, next) {
  try {
    const { role } = req.body;
    const data = await userService.changeUserRole(req.params.id, role);
    res.json({ success: true, data, message: 'User role changed successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_ROLE_CHANGED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: req.params.id,
      description: `Admin changed user ${req.params.id} role to "${role}"`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** PUT /api/v1/users/:id/password */
export async function resetPassword(req, res, next) {
  try {
    const { password } = req.body;
    await userService.resetPassword(req.params.id, password);
    res.json({ success: true, data: {}, message: 'Password reset successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_PASSWORD_RESET,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: req.params.id,
      description: `Admin reset password for user ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** PUT /api/v1/users/:id/status */
export async function toggleUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    const data = await userService.toggleUserStatus(req.params.id, isActive);
    res.json({ success: true, data, message: 'User status updated successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USER_STATUS_CHANGED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      resourceId: req.params.id,
      description: `Admin ${isActive ? 'activated' : 'deactivated'} user ${req.params.id}`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}

/** GET /api/v1/users/stats */
export async function getUserStats(req, res, next) {
  try {
    const data = await userService.getUserStats();
    res.json({ success: true, data, message: 'User statistics retrieved successfully', error: '' });
  } catch (err) { next(err); }
}

/** PUT /api/v1/users/bulk/status */
export async function bulkUpdateStatus(req, res, next) {
  try {
    const { userIds, isActive } = req.body;
    const data = await userService.bulkUpdateStatus(userIds, isActive);
    res.json({ success: true, data, message: 'User statuses updated successfully', error: '' });
    void auditService.log({
      eventType: EVENTS.USERS_BULK_STATUS_UPDATED,
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'User',
      description: `Admin bulk ${isActive ? 'activated' : 'deactivated'} ${userIds?.length ?? 0} user(s)`,
      ipAddress: req.ip,
    }).catch(() => {});
  } catch (err) { next(err); }
}
