/**
 * @file reports.js
 * @description Express routes for PDF report generation.
 * All routes require authentication. Role-based access is enforced
 * within the report service layer (not at the route level) because
 * different report types have different role requirements.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// All report routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/reports/available
 * Returns list of report types available to the authenticated user's role.
 */
router.get('/available', reportController.getAvailableReports);

/**
 * GET /api/v1/reports/generate
 * Generates and streams a PDF report.
 * Query params: type, startDate, endDate, stationId, status, provider, lang
 */
router.get('/generate', reportController.generateReport);

export default router;
