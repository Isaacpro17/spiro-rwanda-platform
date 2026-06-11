/**
 * @file operators.js
 * @description Operator portal utility routes.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import * as operatorController from '../controllers/operatorController.js';

const router = Router();
router.use(authenticate, requireRole('operator', 'admin'));

router.get('/rider-lookup', operatorController.lookupRider);

export default router;
