import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import SupportTicket from '../models/SupportTicket.js';
import * as notificationService from '../services/notificationService.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { validationResult } from 'express-validator';
import crypto from 'crypto';

const router = Router();

// Public FAQ search
router.get('/faq', async (req, res, next) => {
  try {
    const { q, lang = 'en' } = req.query;
    // Static FAQ for now — full text search wired in production
    const faqs = [
      { id: 1, question: 'How do I reserve a battery swap?', answer: 'Open the app, find a nearby station, and tap Reserve Slot.', lang: 'en' },
      { id: 1, question: 'Nshobora gute gufata slot yo guhindura bateri?', answer: 'Fungura app, shakisha ikirunga hafi, unyuze kuri Reserve Slot.', lang: 'rw' },
    ].filter(f => f.lang === lang && (!q || f.question.toLowerCase().includes(q.toLowerCase())));
    return res.status(200).json({ success: true, data: faqs, message: 'FAQ results', error: '' });
  } catch (err) { return next(err); }
});

router.use(authenticate);

// Create ticket
router.post('/tickets', requireRole('rider'), [
  body('subject').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('category').isIn(['payment', 'swap', 'account', 'other']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new ValidationError('Validation failed', errors.array());
    const ticketNumber = `TKT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const ticket = await SupportTicket.create({ ...req.body, riderId: req.user.userId, ticketNumber });
    const io = req.app.get('io');
    await notificationService.sendNotification(req.user.userId, `Support ticket ${ticketNumber} received. We will respond shortly.`, {}, 'sms', io);
    return res.status(201).json({ success: true, data: ticket, message: 'Ticket created', error: '' });
  } catch (err) { return next(err); }
});

// List tickets
router.get('/tickets', async (req, res, next) => {
  try {
    const query = req.user.role === 'rider' ? { riderId: req.user.userId } : {};
    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, data: tickets, message: 'Tickets retrieved', error: '' });
  } catch (err) { return next(err); }
});

// Update ticket status
router.put('/tickets/:id', requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (ticket?.riderId) {
      const io = req.app.get('io');
      io?.to(`rider:${ticket.riderId}`).emit('rider:notification', { message: `Your ticket ${ticket.ticketNumber} status: ${ticket.status}`, type: 'ticket_update' });
    }
    return res.status(200).json({ success: true, data: ticket, message: 'Ticket updated', error: '' });
  } catch (err) { return next(err); }
});

export default router;
