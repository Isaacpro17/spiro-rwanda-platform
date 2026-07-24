import NotificationLog from '../models/NotificationLog.js';
import { NotFoundError } from '../middleware/errorHandler.js';

/**
 * GET /notifications
 * Fetches recent in-app notifications for the logged-in user.
 */
export async function getNotifications(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const notifications = await NotificationLog.find({
      recipientUserId: req.user.userId,
      channel: 'in_app',
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const unreadCount = await NotificationLog.countDocuments({
      recipientUserId: req.user.userId,
      channel: 'in_app',
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
      message: 'Notifications retrieved',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notifications/read-all
 * Marks all unread in-app notifications as read for the user.
 */
export async function markAllRead(req, res, next) {
  try {
    await NotificationLog.updateMany(
      {
        recipientUserId: req.user.userId,
        channel: 'in_app',
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.json({
      success: true,
      data: {},
      message: 'All notifications marked as read',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notifications/:id/read
 * Marks a specific notification as read.
 */
export async function markAsRead(req, res, next) {
  try {
    const notification = await NotificationLog.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientUserId: req.user.userId,
      },
      {
        $set: { isRead: true },
      },
      { new: true }
    );

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}
