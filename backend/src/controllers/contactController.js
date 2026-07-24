/**
 * @file contactController.js
 * @description Handles contact form submissions from the landing page.
 */

import ContactMessage from '../models/ContactMessage.js';
import { validationResult } from 'express-validator';
import { ValidationError, AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * POST /contact
 * Public endpoint to submit a contact form message.
 */
export async function submitMessage(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { name, email, phone, subject, message } = req.body;

    const newMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    logger.info('New contact message received', { messageId: newMessage._id, email });

    res.status(201).json({
      success: true,
      message: 'Your message has been received successfully. We will get back to you shortly.',
      data: {
        messageId: newMessage._id,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /contact
 * Admin endpoint to list contact messages.
 */
export async function getMessages(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    
    // Optional status filter
    if (req.query.status) {
      query.status = req.query.status;
    }

    const messages = await ContactMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await ContactMessage.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        messages,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /contact/:id/status
 * Admin endpoint to update the status of a message.
 */
export async function updateMessageStatus(req, res, next) {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const message = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Message status updated',
      data: message,
    });
  } catch (error) {
    next(error);
  }
}
