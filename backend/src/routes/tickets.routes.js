import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Ticket } from '../models/ticket.model.js';
import { Event } from '../models/event.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();
const { getList, getOne, remove } = makeCrudController(Ticket);

// Current user's tickets, newest first, with the event populated for display
const getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user_id: req.adminId })
    .sort({ created_at: -1 })
    .populate('event_id');
  res.setHeader('X-Total-Count', tickets.length);
  res.json(tickets);
});

// QR check-in at the event entrance — scanned by the organizer or an admin
const checkIn = asyncHandler(async (req, res) => {
  const { qr_code } = req.body ?? {};
  if (!qr_code || typeof qr_code !== 'string') {
    res.status(400).json({ success: false, error: { code: 'MISSING_QR', message: 'QR code requis' } });
    return;
  }

  const ticket = await Ticket.findOne({ qr_code }).populate('event_id');
  if (!ticket) {
    res.status(404).json({ success: false, error: { code: 'TICKET_NOT_FOUND', message: 'Ticket introuvable' } });
    return;
  }

  const event = ticket.event_id;
  const isOrganizer = event && String(event.created_by) === String(req.adminId);
  const isStaff = ['admin', 'moderator'].includes(req.adminRole ?? '');
  if (!isOrganizer && !isStaff) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: "Seul l'organisateur peut scanner les tickets" } });
    return;
  }

  if (ticket.status === 'used') {
    res.status(409).json({ success: false, error: { code: 'TICKET_ALREADY_USED', message: 'Ticket déjà utilisé' } });
    return;
  }
  if (ticket.status === 'cancelled') {
    res.status(409).json({ success: false, error: { code: 'TICKET_CANCELLED', message: 'Ticket annulé' } });
    return;
  }

  ticket.status = 'used';
  ticket.checked_in_at = new Date();
  await ticket.save();

  res.json({ success: true, data: ticket });
});

// Admin create: QR is always generated server-side, never accepted from the client
const createTicket = asyncHandler(async (req, res) => {
  const { qr_code: _qr, checked_in_at: _ci, _id: _id, __v: _v, ...rest } = req.body;
  if (rest.event_id) {
    const event = await Event.findById(rest.event_id);
    if (!event) {
      res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
      return;
    }
  }
  const ticket = await Ticket.create({ ...rest, qr_code: `LOKL-${uuidv4()}` });
  res.status(201).json(ticket);
});

// Admin update: status/type only — QR and check-in timestamp are managed by the system
const updateTicket = asyncHandler(async (req, res) => {
  const { qr_code: _qr, checked_in_at: _ci, _id: _id, __v: _v, ...rest } = req.body;
  const doc = await Ticket.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
    return;
  }
  res.json(doc);
});

router.use(requireAuth);

router.get('/mine', getMyTickets);
router.post('/checkin', checkIn);

router.use(requireAdmin);

router.get('/', getList);
router.get('/:id', getOne);
router.post('/', createTicket);
router.put('/:id', updateTicket);
router.delete('/:id', remove);

export default router;
