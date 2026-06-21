import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as settingsService from '../services/settingsService.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

/** GET /api/v1/system-settings */
router.get('/', async (req, res, next) => {
  try {
    const data = await settingsService.getSettings();
    res.json({ success: true, data, message: 'Settings retrieved', error: '' });
  } catch (err) { next(err); }
});

/** PUT /api/v1/system-settings */
router.put('/', async (req, res, next) => {
  try {
    const data = await settingsService.updateSettings(req.body);
    res.json({ success: true, data, message: 'Settings updated', error: '' });
  } catch (err) { next(err); }
});

export default router;
