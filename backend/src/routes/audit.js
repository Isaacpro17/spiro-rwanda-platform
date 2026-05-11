import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as auditService from '../services/auditService.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/logs', async (req, res, next) => {
  try {
    const data = await auditService.queryLogs(req.query);
    return res.status(200).json({ success: true, data, message: 'Audit logs retrieved', error: '' });
  } catch (err) { return next(err); }
});

export default router;
