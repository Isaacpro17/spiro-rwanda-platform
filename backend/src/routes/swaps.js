/**
 * @file swaps.js
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as swapController from '../controllers/swapController.js';

const router = Router();
router.use(authenticate);

// Admin routes for bookings
router.get('/bookings', requireRole('admin'), swapController.getAllBookings);
router.get('/bookings/stats', requireRole('admin'), swapController.getBookingStats);

// Admin routes for swaps
router.get('/all', requireRole('admin'), swapController.getAllSwaps);
router.get('/stats', requireRole('admin'), swapController.getSwapStats);

// Rider routes
router.post('/reserve', requireRole('rider'), swapController.reserve);
router.delete('/reserve/:id', requireRole('rider'), swapController.cancelReservation);
router.get('/my-reservations', requireRole('rider'), swapController.getMyReservations);
router.post('/complete', requireRole('operator', 'admin'), swapController.completeSwap);
router.get('/guidance', swapController.getGuidance);
router.get('/:id', swapController.getSwap);

export default router;
