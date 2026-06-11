/**
 * @file technicianController.js
 * @description Technician-specific endpoints: my tasks, update task, my assigned stations.
 */

import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Station from '../models/Station.js';
import logger from '../utils/logger.js';

/**
 * GET /api/v1/technicians/my-tasks
 * Returns maintenance requests assigned to the authenticated technician.
 * Query: status (single or comma-separated), page, limit
 */
export async function getMyTasks(req, res, next) {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { assignedTechnician: req.user.userId };

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [tasks, total] = await Promise.all([
      MaintenanceRequest.find(filter)
        .populate('stationId', 'name address province stationCode')
        .populate('createdByOperator', 'fullName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      MaintenanceRequest.countDocuments(filter),
    ]);

    logger.info('Technician fetched tasks', { userId: req.user.userId, count: tasks.length });

    res.json({
      success: true,
      data: { tasks, total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
      message: 'Tasks retrieved.',
      error: '',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/technicians/tasks/:id
 * Allows a technician to update status and notes on their assigned tasks.
 * Allowed status transitions: assigned→in_progress, in_progress→resolved
 */
export async function updateTask(req, res, next) {
  try {
    const { status, notes } = req.body;

    const task = await MaintenanceRequest.findOne({
      _id: req.params.id,
      assignedTechnician: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you.',
        error: 'NotFound',
      });
    }

    if (status) {
      const allowed = ['in_progress', 'resolved'];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${allowed.join(', ')}.`,
          error: 'ValidationError',
        });
      }
      task.status = status;
      if (status === 'resolved' && !task.resolvedAt) {
        task.resolvedAt = new Date();
      }
    }

    if (notes !== undefined) task.notes = notes;

    await task.save();

    const populated = await MaintenanceRequest.findById(task._id)
      .populate('stationId', 'name address province stationCode')
      .populate('createdByOperator', 'fullName phone')
      .lean();

    logger.info('Technician updated task', { userId: req.user.userId, taskId: task._id, status });

    res.json({ success: true, data: populated, message: 'Task updated.', error: '' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/technicians/my-stations
 * Returns all stations where this technician is in the assignedTechnicians array.
 */
export async function getMyStations(req, res, next) {
  try {
    const stations = await Station.find({ assignedTechnicians: req.user.userId })
      .populate('operatorId', 'fullName phone email')
      .lean();

    logger.info('Technician fetched stations', { userId: req.user.userId, count: stations.length });

    res.json({ success: true, data: stations, message: 'Stations retrieved.', error: '' });
  } catch (err) {
    next(err);
  }
}
