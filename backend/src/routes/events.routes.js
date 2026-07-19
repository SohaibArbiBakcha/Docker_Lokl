import { Router } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Event } from '../models/event.model.js';
import { Ticket } from '../models/ticket.model.js';
import { Review } from '../models/review.model.js';
import { Message } from '../models/message.model.js';
import { Group } from '../models/group.model.js';
import { User } from '../models/user.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { notify } from '../services/notify.js';

const router = Router();
const { getList, getOne } = makeCrudController(Event);

const isStaff = (req) => ['admin', 'moderator'].includes(req.adminRole ?? '');

const OBJECT_ID = /^[a-f\d]{24}$/i;

// Photos are uploaded as base64 data URIs and stored inline (no S3/R2 yet —
// see backend/CLAUDE.md). Mobile compresses to ~1024px/quality 70 before
// sending, so 700k chars (~500KB) comfortably covers a real photo while
// still bounding document size on the free Atlas tier.
const IMAGE_URL = z.string().trim().max(700_000).regex(
  /^(https?:\/\/\S+|data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*)$/,
  'Image invalide'
).optional();

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description_fr: z.string().trim().max(5000).optional(),
  description_ar: z.string().trim().max(5000).optional(),
  image_url: IMAGE_URL,
  type: z.enum(['in_person', 'online', 'hybrid']).optional(),
  group_id: z.string().regex(OBJECT_ID).optional(),
  // Online events have no physical venue — city becomes optional for them
  // (enforced by the refine below for in-person events)
  city_id: z.string().regex(OBJECT_ID).optional(),
  category_id: z.string().regex(OBJECT_ID),
  start_at: z.coerce.date(),
  end_at: z.coerce.date(),
  recurrence: z.enum(['once', 'weekly', 'monthly']).optional(),
  capacity: z.number().int().min(0).max(100000).optional(),
  location: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  online_link: z.string().trim().max(500).optional(),
  is_free: z.boolean().optional(),
}).refine((d) => d.end_at > d.start_at, { message: 'La date de fin doit être après le début' })
  .refine((d) => d.type === 'online' || d.city_id, { message: 'La ville est requise pour un événement en présentiel' });

// created_by always comes from the JWT — never trusted from the client.
// Zod strips unknown keys, so created_by/registered_count can't sneak in.
// The organizer is automatically a member/attendee of their own event: a
// pre-used ticket is issued (no QR scan needed — they're already checked in).
// group_id is optional: without one, a group is created automatically for
// the event (same name/category/city, creator as owner) so "create a group
// first" is no longer a required step before publishing an event.
const createEvent = asyncHandler(async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' },
    });
    return;
  }

  let groupId = parsed.data.group_id;
  if (!groupId) {
    const group = await Group.create({
      name: parsed.data.title,
      description_fr: parsed.data.description_fr ?? '',
      category_id: parsed.data.category_id,
      ...(parsed.data.city_id != null ? { city_id: parsed.data.city_id } : {}),
      owner_id: req.adminId,
      members: [req.adminId],
      member_count: 1,
    });
    groupId = group.id;
  }

  const event = await Event.create({
    ...parsed.data,
    group_id: groupId,
    created_by: req.adminId,
    registered_count: 1,
  });
  await Ticket.create({
    event_id: event.id,
    user_id: req.adminId,
    qr_code: `LOKL-${uuidv4()}`,
    status: 'used',
    checked_in_at: new Date(),
    price_centimes: 0,
  });
  res.status(201).json(event);
});

// Organizers manage their own events; staff manage all
const loadEventAndCheckOwner = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }
  if (!isStaff(req) && String(event.created_by) !== String(req.adminId)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Seul le créateur peut modifier cet événement' } });
    return;
  }
  next();
});

const updateEvent = asyncHandler(async (req, res) => {
  // is_promoted only changes via PATCH /:id/promote (premium/staff gate)
  const { created_by: _cb, registered_count: _rc, _id: _id, __v: _v, is_promoted: _ip, promoted_at: _pa, ...rest } = req.body;
  if (rest.image_url !== undefined) {
    const parsed = IMAGE_URL.safeParse(rest.image_url === '' ? undefined : rest.image_url);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Image invalide' } });
      return;
    }
    rest.image_url = parsed.data ?? '';
  }
  const doc = await Event.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }
  res.json(doc);
});

const removeEvent = asyncHandler(async (req, res) => {
  const doc = await Event.findByIdAndDelete(req.params.id);
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }
  // Cascade: a deleted event leaves no orphans behind (tickets, chat,
  // reviews, notifications). Best-effort — the event itself is already gone.
  const { Notification } = await import('../models/notification.model.js');
  await Promise.allSettled([
    Ticket.deleteMany({ event_id: doc.id }),
    Message.deleteMany({ event_id: doc.id }),
    Review.deleteMany({ event_id: doc.id }),
    Notification.deleteMany({ event_id: doc.id }),
  ]);
  res.json(doc);
});

const registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }
  if (event.is_cancelled || !event.is_active) {
    res.status(409).json({ success: false, error: { code: 'EVENT_INACTIVE', message: 'Cet événement est annulé ou inactif' } });
    return;
  }

  const existing = await Ticket.findOne({
    event_id: event.id,
    user_id: req.adminId,
    status: { $ne: 'cancelled' },
  });
  if (existing) {
    res.status(409).json({ success: false, error: { code: 'ALREADY_REGISTERED', message: 'Vous êtes déjà inscrit à cet événement' } });
    return;
  }

  // Atomic capacity check + increment: capacity 0 means unlimited
  const updated = await Event.findOneAndUpdate(
    {
      _id: event.id,
      is_cancelled: false,
      $or: [{ capacity: 0 }, { $expr: { $lt: ['$registered_count', '$capacity'] } }],
    },
    { $inc: { registered_count: 1 } },
    { new: true }
  );
  if (!updated) {
    res.status(409).json({ success: false, error: { code: 'EVENT_FULL', message: 'Cet événement est complet' } });
    return;
  }

  try {
    // Free events are confirmed immediately; paid ones stay pending until payment
    const ticket = await Ticket.create({
      event_id: event.id,
      user_id: req.adminId,
      qr_code: `LOKL-${uuidv4()}`,
      status: event.is_free ? 'confirmed' : 'pending',
      price_centimes: 0,
    });

    if (String(event.created_by) !== String(req.adminId)) {
      const registrant = await User.findById(req.adminId).select('full_name');
      await notify([event.created_by], {
        type: 'event_registration',
        title: 'Nouvelle inscription',
        body: `${registrant?.full_name ?? 'Un membre'} s'est inscrit à « ${event.title} »`,
        event_id: event.id,
      });
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    await Event.updateOne({ _id: event.id }, { $inc: { registered_count: -1 } });
    throw err;
  }
});

const unregisterFromEvent = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({
    event_id: req.params.id,
    user_id: req.adminId,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (!ticket) {
    res.status(404).json({ success: false, error: { code: 'NOT_REGISTERED', message: "Vous n'êtes pas inscrit à cet événement" } });
    return;
  }

  ticket.status = 'cancelled';
  await ticket.save();
  await Event.updateOne(
    { _id: req.params.id, registered_count: { $gt: 0 } },
    { $inc: { registered_count: -1 } }
  );

  const event = await Event.findById(req.params.id).select('title created_by');
  if (event && String(event.created_by) !== String(req.adminId)) {
    const registrant = await User.findById(req.adminId).select('full_name');
    await notify([event.created_by], {
      type: 'event_unregistration',
      title: 'Désinscription',
      body: `${registrant?.full_name ?? 'Un membre'} s'est désinscrit de « ${event.title} »`,
      event_id: event.id,
    });
  }

  res.json({ success: true, data: ticket });
});

// ─── Post-event reviews ─────────────────────────────────────────────────────

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

// One review per attendee, only after the event has ended
const postReview = asyncHandler(async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' },
    });
    return;
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }
  if (event.end_at > new Date()) {
    res.status(409).json({ success: false, error: { code: 'EVENT_NOT_ENDED', message: "Vous pourrez noter cet événement après sa fin" } });
    return;
  }

  const attended = await Ticket.findOne({
    event_id: event.id,
    user_id: req.adminId,
    status: { $in: ['confirmed', 'used'] },
  });
  if (!attended) {
    res.status(403).json({ success: false, error: { code: 'NOT_ATTENDEE', message: 'Seuls les participants peuvent noter cet événement' } });
    return;
  }

  const existing = await Review.findOne({ event_id: event.id, reviewer_id: req.adminId });
  if (existing) {
    res.status(409).json({ success: false, error: { code: 'ALREADY_REVIEWED', message: 'Vous avez déjà noté cet événement' } });
    return;
  }

  const review = await Review.create({
    event_id: event.id,
    reviewer_id: req.adminId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? '',
  });
  res.status(201).json({ success: true, data: review });
});

// Public (authenticated) — flagged reviews are hidden pending moderation
const getEventReviews = asyncHandler(async (req, res) => {
  const [reviews, stats] = await Promise.all([
    Review.find({ event_id: req.params.id, is_flagged: false })
      .sort({ created_at: -1 })
      .limit(50)
      .populate('reviewer_id', 'full_name avatar_url'),
    Review.aggregate([
      { $match: { event_id: new mongoose.Types.ObjectId(String(req.params.id)), is_flagged: false } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      average: stats[0] ? Math.round(stats[0].avg * 10) / 10 : null,
      count: stats[0]?.count ?? 0,
      reviews,
    },
  });
});

// ─── Event chat ─────────────────────────────────────────────────────────────
// Registering IS joining: any ticket holder (not cancelled) or the organizer
// gets chat access automatically — no separate "join the chat" step.

const requireEventAccess = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }
  const isOrganizer = String(event.created_by) === String(req.adminId);
  if (isOrganizer || isStaff(req)) return next();

  const hasTicket = await Ticket.findOne({
    event_id: event.id,
    user_id: req.adminId,
    status: { $ne: 'cancelled' },
  });
  if (!hasTicket) {
    res.status(403).json({ success: false, error: { code: 'NOT_ATTENDEE', message: 'Inscrivez-vous à cet événement pour accéder à la discussion' } });
    return;
  }
  next();
});

const getEventMessages = asyncHandler(async (req, res) => {
  const skip = Math.max(0, parseInt(req.query._start ?? '0', 10) || 0);
  const end = parseInt(req.query._end ?? '50', 10) || 50;
  const limit = Math.min(Math.max(end - skip, 1), 100);

  const [messages, total] = await Promise.all([
    Message.find({ event_id: req.params.id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender_id', 'full_name avatar_url is_premium'),
    Message.countDocuments({ event_id: req.params.id }),
  ]);

  res.setHeader('X-Total-Count', total);
  res.json(messages);
});

const postEventMessage = asyncHandler(async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content || content.length > 1000) {
    res.status(400).json({ success: false, error: { code: 'INVALID_MESSAGE', message: 'Message vide ou trop long (1000 caractères max)' } });
    return;
  }

  const message = await Message.create({
    event_id: req.params.id,
    sender_id: req.adminId,
    content,
  });
  const populated = await message.populate('sender_id', 'full_name avatar_url is_premium');

  // Everyone in the event chat except the sender: ticket holders + organizer
  const [event, tickets] = await Promise.all([
    Event.findById(req.params.id).select('title created_by'),
    Ticket.find({ event_id: req.params.id, status: { $ne: 'cancelled' } }).select('user_id'),
  ]);
  if (event) {
    const recipients = [event.created_by, ...tickets.map((t) => t.user_id)]
      .filter((id) => String(id) !== String(req.adminId));
    const senderName = populated.sender_id?.full_name ?? 'Un membre';
    await notify(recipients, {
      type: 'event_message',
      title: `Message — ${event.title}`,
      body: `${senderName} : ${content.slice(0, 120)}`,
      event_id: event.id,
    });
  }

  res.status(201).json({ success: true, data: populated });
});

// ─── Attendees (premium feature) ────────────────────────────────────────────
// Everyone gets the count. Full identities (name/avatar/profile link) require
// premium, being the event's organizer, or staff — enforced HERE, not in the
// client: non-premium callers receive redacted entries with no ids, so the
// mobile "blur" can't be bypassed by calling the API directly.
const getEventAttendees = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).select('title created_by');
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }

  const [me, tickets] = await Promise.all([
    User.findById(req.adminId).select('is_premium'),
    Ticket.find({ event_id: event.id, status: { $ne: 'cancelled' } })
      .sort({ created_at: 1 })
      .limit(200)
      .populate('user_id', 'full_name avatar_url is_premium'),
  ]);

  const isOrganizer = String(event.created_by) === String(req.adminId);
  const canSee = Boolean(me?.is_premium) || isOrganizer || isStaff(req);

  const attendees = tickets
    .filter((t) => t.user_id) // deleted accounts
    .map((t) => canSee
      ? {
          _id: t.user_id.id,
          full_name: t.user_id.full_name,
          avatar_url: t.user_id.avatar_url,
          is_premium: t.user_id.is_premium ?? false,
        }
      : { _id: null, full_name: null, avatar_url: null, is_premium: false });

  res.json({ success: true, data: { count: attendees.length, unlocked: canSee, attendees } });
});

// ─── Promotion (premium feature) ────────────────────────────────────────────
const setPromoted = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'EVENT_NOT_FOUND', message: "L'événement demandé n'existe pas" } });
    return;
  }

  const isOwner = String(event.created_by) === String(req.adminId);
  if (!isStaff(req)) {
    if (!isOwner) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Seul le créateur peut promouvoir cet événement' } });
      return;
    }
    const me = await User.findById(req.adminId).select('is_premium');
    if (!me?.is_premium) {
      res.status(403).json({ success: false, error: { code: 'PREMIUM_REQUIRED', message: 'La promotion d\'événements est réservée aux comptes premium' } });
      return;
    }
  }

  event.is_promoted = Boolean(req.body?.is_promoted);
  event.promoted_at = event.is_promoted ? new Date() : undefined;
  await event.save();
  res.json({ success: true, data: event });
});

router.use(requireAuth);

router.get('/', getList);
router.get('/:id', getOne);
router.post('/', createEvent);
router.post('/:id/register', registerForEvent);
router.post('/:id/unregister', unregisterFromEvent);
router.post('/:id/review', postReview);
router.get('/:id/reviews', getEventReviews);
router.get('/:id/attendees', getEventAttendees);
router.patch('/:id/promote', setPromoted);
router.get('/:id/messages', requireEventAccess, getEventMessages);
router.post('/:id/messages', requireEventAccess, postEventMessage);
router.put('/:id', loadEventAndCheckOwner, updateEvent);
router.delete('/:id', loadEventAndCheckOwner, removeEvent);

export default router;
