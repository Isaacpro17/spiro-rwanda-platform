/**
 * @file userService.js
 * @description User management business logic
 */

import bcrypt from 'bcrypt';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const BCRYPT_ROUNDS = 12;

/**
 * List all users with filtering and pagination
 * @param {Object} query - Query parameters (page, limit, role, isActive, search)
 * @returns {Promise<Object>} Paginated user list
 */
export async function listUsers(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.isPhoneVerified !== undefined) filter.isPhoneVerified = query.isPhoneVerified === 'true';
  if (query.search) {
    filter.$or = [
      { fullName: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -failedLoginCount -lockedUntil')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user details by ID
 * @param {string} userId
 * @returns {Promise<Object>} User details
 */
export async function getUser(userId) {
  const user = await User.findById(userId)
    .select('-passwordHash -failedLoginCount -lockedUntil')
    .lean();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // If rider, get profile details
  if (user.role === 'rider') {
    const profile = await RiderProfile.findOne({ userId }).lean();
    return { ...user, profile };
  }

  return user;
}

/**
 * Create a new user
 * @param {Object} data - User data
 * @returns {Promise<Object>} Created user
 */
export async function createUser(data) {
  const { fullName, phone, email, password, role, language, nid } = data;

  // Check for duplicates
  const existing = await User.findOne({ $or: [{ phone }, { email }] });
  if (existing) {
    const field = existing.phone === phone ? 'phone' : 'email';
    throw new ConflictError(`A user with this ${field} already exists`);
  }

  // Validate role
  const validRoles = ['rider', 'operator', 'admin', 'technician'];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = await User.create({
    fullName,
    phone,
    email,
    passwordHash,
    role,
    language: language || 'rw',
    nid,
    isPhoneVerified: true, // Admin-created users are pre-verified
    isActive: true,
  });

  // Create rider profile if role is rider
  if (role === 'rider') {
    await RiderProfile.create({
      userId: user._id,
      vehicleRegistration: '',
      emergencyContact: '',
    });
  }

  logger.info('User created by admin', { userId: user._id, role, createdBy: 'admin' });

  return user.toSafeObject();
}

/**
 * Update user details
 * @param {string} userId
 * @param {Object} updates
 * @returns {Promise<Object>} Updated user
 */
export async function updateUser(userId, updates) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check for duplicate phone/email if being updated
  if (updates.phone || updates.email) {
    const existing = await User.findOne({
      _id: { $ne: userId },
      $or: [
        ...(updates.phone ? [{ phone: updates.phone }] : []),
        ...(updates.email ? [{ email: updates.email }] : []),
      ],
    });

    if (existing) {
      const field = existing.phone === updates.phone ? 'phone' : 'email';
      throw new ConflictError(`A user with this ${field} already exists`);
    }
  }

  // Allowed fields to update
  const allowedUpdates = [
    'fullName',
    'phone',
    'email',
    'language',
    'nid',
    'profilePicture',
    'isActive',
    'isPhoneVerified',
  ];

  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      user[key] = updates[key];
    }
  });

  await user.save();

  logger.info('User updated', { userId, updates: Object.keys(updates) });

  return user.toSafeObject();
}

/**
 * Delete a user
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Don't allow deleting the last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ValidationError('Cannot delete the last admin user');
    }
  }

  // Delete associated data
  if (user.role === 'rider') {
    await RiderProfile.deleteOne({ userId });
  }

  await User.findByIdAndDelete(userId);

  logger.info('User deleted', { userId, role: user.role });
}

/**
 * Change user role
 * @param {string} userId
 * @param {string} newRole
 * @returns {Promise<Object>} Updated user
 */
export async function changeUserRole(userId, newRole) {
  const validRoles = ['rider', 'operator', 'admin', 'technician'];
  if (!validRoles.includes(newRole)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const oldRole = user.role;

  // Don't allow changing the last admin
  if (oldRole === 'admin' && newRole !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ValidationError('Cannot change role of the last admin user');
    }
  }

  user.role = newRole;
  await user.save();

  // Create rider profile if changing to rider
  if (newRole === 'rider' && oldRole !== 'rider') {
    await RiderProfile.create({
      userId: user._id,
      vehicleRegistration: '',
      emergencyContact: '',
    });
  }

  // Delete rider profile if changing from rider
  if (oldRole === 'rider' && newRole !== 'rider') {
    await RiderProfile.deleteOne({ userId });
  }

  logger.info('User role changed', { userId, oldRole, newRole });

  return user.toSafeObject();
}

/**
 * Reset user password
 * @param {string} userId
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function resetPassword(userId, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordHash = passwordHash;
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  await user.save();

  logger.info('User password reset by admin', { userId });
}

/**
 * Toggle user active status
 * @param {string} userId
 * @param {boolean} isActive
 * @returns {Promise<Object>} Updated user
 */
export async function toggleUserStatus(userId, isActive) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Don't allow deactivating the last admin
  if (user.role === 'admin' && !isActive) {
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdminCount <= 1) {
      throw new ValidationError('Cannot deactivate the last active admin user');
    }
  }

  user.isActive = isActive;
  await user.save();

  logger.info('User status toggled', { userId, isActive });

  return user.toSafeObject();
}

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
export async function getUserStats() {
  const [total, byRole, byStatus, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $project: { role: '$_id', count: 1, _id: 0 } },
    ]),
    User.aggregate([
      {
        $group: {
          _id: null,
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
          verified: { $sum: { $cond: ['$isPhoneVerified', 1, 0] } },
          unverified: { $sum: { $cond: ['$isPhoneVerified', 0, 1] } },
        },
      },
    ]),
    User.find()
      .select('fullName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const roleStats = {};
  byRole.forEach((item) => {
    roleStats[item.role] = item.count;
  });

  return {
    total,
    byRole: roleStats,
    byStatus: byStatus[0] || { active: 0, inactive: 0, verified: 0, unverified: 0 },
    recentUsers,
  };
}

/**
 * Bulk update user status
 * @param {Array<string>} userIds
 * @param {boolean} isActive
 * @returns {Promise<Object>} Update result
 */
export async function bulkUpdateStatus(userIds, isActive) {
  // Don't allow deactivating all admins
  if (!isActive) {
    const affectedAdmins = await User.countDocuments({
      _id: { $in: userIds },
      role: 'admin',
    });

    const totalActiveAdmins = await User.countDocuments({
      role: 'admin',
      isActive: true,
    });

    if (affectedAdmins >= totalActiveAdmins) {
      throw new ValidationError('Cannot deactivate all admin users');
    }
  }

  const result = await User.updateMany({ _id: { $in: userIds } }, { $set: { isActive } });

  logger.info('Bulk user status update', {
    count: result.modifiedCount,
    isActive,
  });

  return {
    updated: result.modifiedCount,
    isActive,
  };
}
