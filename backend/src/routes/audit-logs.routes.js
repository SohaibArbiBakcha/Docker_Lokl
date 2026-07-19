import { Router } from 'express';
import { AuditLog } from '../models/audit-log.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();
// Read-only by design — an editable audit log is worthless
const { getList, getOne } = makeCrudController(AuditLog, ['actor_id']);

router.use(requireAuth, requireAdmin);

router.get('/', getList);
router.get('/:id', getOne);

export default router;
