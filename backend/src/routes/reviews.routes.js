import { Router } from 'express';
import { Review } from '../models/review.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();
const { getList, getOne, create, update, remove } = makeCrudController(Review);

router.use(requireAuth, requireAdmin);

router.get('/', getList);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
