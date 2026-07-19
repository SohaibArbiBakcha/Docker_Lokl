import { Router } from 'express';
import { City } from '../models/city.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();
const { getList, getOne, create, update, remove } = makeCrudController(City);

router.use(requireAuth);

// Reads are open to all authenticated users (mobile pickers) — writes are admin-only
router.get('/', getList);
router.get('/:id', getOne);
router.post('/', requireAdmin, create);
router.put('/:id', requireAdmin, update);
router.delete('/:id', requireAdmin, remove);

export default router;
