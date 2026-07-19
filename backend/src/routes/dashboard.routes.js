import { Router } from 'express';
import { getStats } from '../controllers/dashboard.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/stats', requireAuth, requireAdmin, getStats);

export default router;
