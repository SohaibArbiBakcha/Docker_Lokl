import { Router } from 'express';
import { Payment } from '../models/payment.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();
// No create/delete: payments are only written by the gateway callback,
// refunds go through the gateway — never manually in the DB
const { getList, getOne, update } = makeCrudController(Payment);

router.use(requireAuth, requireAdmin);

router.get('/', getList);
router.get('/:id', getOne);
router.put('/:id', update);

export default router;
