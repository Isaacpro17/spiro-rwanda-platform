/**
 * @file reportController.js
 * @description Controller for PDF report generation and report listing endpoints.
 * Validates filters, enforces RBAC, generates PDFs via pdfService, and streams to response.
 */

import * as reportService from '../services/reportService.js';
import * as pdfService from '../services/pdfService.js';
import * as auditService from '../services/auditService.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';
import fs from 'fs';

// ── PDF Render Map ───────────────────────────────────────────────────────────
/**
 * Maps report types to their pdfService render functions.
 */
const RENDER_MAP = {
  swap_operations:    pdfService.renderSwapOperationsPdf,
  financial:          pdfService.renderFinancialPdf,
  battery_health:     pdfService.renderBatteryHealthPdf,
  station_performance: pdfService.renderStationPerformancePdf,
  user_activity:      pdfService.renderUserActivityPdf,
  audit_trail:        pdfService.renderAuditTrailPdf,
  daily_station:      pdfService.renderDailyStationPdf,
  inventory_status:   pdfService.renderInventoryStatusPdf,
  maintenance_log:    pdfService.renderMaintenanceLogPdf,
  swap_history:       pdfService.renderSwapHistoryPdf,
  payment_statement:  pdfService.renderPaymentStatementPdf,
  work_history:       pdfService.renderWorkHistoryPdf,
};

/**
 * Generates a download filename for the PDF.
 * @param {string} reportType
 * @returns {string}
 */
function generateFilename(reportType) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const typeName = reportType.replace(/_/g, '-');
  return `spiro-${typeName}-${dateStr}.pdf`;
}

/**
 * Validates the report query parameters.
 * @param {Object} query
 * @returns {{ type: string, filters: Object }}
 */
function validateQuery(query) {
  const { type, startDate, endDate, stationId, status, provider, riderId, technicianId, eventType } = query;

  if (!type) throw new ValidationError('Report type is required');

  if (!reportService.REPORT_REGISTRY[type]) {
    throw new ValidationError(`Unknown report type: "${type}". Use GET /api/v1/reports/available to see valid types.`);
  }

  // Validate dates if provided
  if (startDate && isNaN(Date.parse(startDate))) {
    throw new ValidationError('Invalid startDate format. Use ISO 8601 (e.g., 2026-07-01)');
  }
  if (endDate && isNaN(Date.parse(endDate))) {
    throw new ValidationError('Invalid endDate format. Use ISO 8601 (e.g., 2026-07-22)');
  }
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new ValidationError('startDate must be before endDate');
  }

  return {
    type,
    filters: {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      stationId: stationId || undefined,
      status: status || undefined,
      provider: provider || undefined,
      riderId: riderId || undefined,
      technicianId: technicianId || undefined,
      eventType: eventType || undefined,
    },
  };
}

// ── Endpoints ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/reports/available
 * Returns the list of report types available for the authenticated user's role.
 */
export async function getAvailableReports(req, res, next) {
  try {
    const reports = reportService.getAvailableReports(req.user.role);
    return res.status(200).json({
      success: true,
      data: reports,
      message: `${reports.length} report types available`,
      error: '',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/reports/generate
 * Generates a PDF report and streams it to the client.
 * 
 * Query params:
 *   type       — (required) Report type from REPORT_REGISTRY
 *   startDate  — (optional) ISO date start of period
 *   endDate    — (optional) ISO date end of period
 *   stationId  — (optional) Filter by station
 *   status     — (optional) Filter by status
 *   provider   — (optional) Filter by payment provider
 *   lang       — (optional) PDF language: 'en' or 'rw' (defaults to user's lang pref)
 */
export async function generateReport(req, res, next) {
  try {
    // Validate inputs
    let type, filters;
    try {
      const validated = validateQuery(req.query);
      type = validated.type;
      filters = validated.filters;
    } catch (valErr) {
      console.error('Validation Error Details:', valErr);
      fs.writeFileSync('validation_error.log', JSON.stringify({ message: valErr.message, query: req.query, stack: valErr.stack }, null, 2));
      throw valErr;
    }

    // Resolve language: use query param, or user's stored preference, or default 'en'
    const lang = req.query.lang || 'en';

    // Fetch the generating user's name for the header
    const generatingUser = await User.findById(req.user.userId).select('fullName language').lean();
    const generatedBy = generatingUser?.fullName || 'System';
    const userLang = req.query.lang || generatingUser?.language || 'en';

    // Fetch the report data (enforces RBAC + data scoping inside)
    const data = await reportService.fetchReportData(type, filters, req.user);

    // Get the render function
    const renderFn = RENDER_MAP[type];
    if (!renderFn) throw new ValidationError(`No PDF renderer found for report type: ${type}`);

    // Create the PDF document
    const doc = pdfService.createBaseDocument();

    // Set response headers for PDF streaming
    const filename = generateFilename(type);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Pipe the PDF stream to the HTTP response
    doc.pipe(res);

    // Render the report content
    const renderOpts = {
      lang: userLang,
      startDate: filters.startDate,
      endDate: filters.endDate,
      generatedBy,
    };

    renderFn(doc, data, renderOpts);

    // Add page footers (requires bufferPages)
    pdfService.renderFooters(doc, { lang: userLang });

    // Finalize the PDF
    doc.end();

    // Audit log (fire-and-forget)
    void auditService.log({
      eventType: 'REPORT_GENERATED',
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      resourceType: 'Report',
      resourceId: type,
      description: `Generated "${type}" report (${filters.startDate || 'default'} to ${filters.endDate || 'now'})`,
      ipAddress: req.ip,
    }).catch(() => {});

    logger.info('PDF report generated and streamed', {
      reportType: type,
      userId: req.user.userId,
      role: req.user.role,
      filename,
    });

  } catch (err) {
    return next(err);
  }
}
