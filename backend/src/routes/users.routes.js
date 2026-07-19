import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/user.model.js';
import { Group } from '../models/group.model.js';
import { Event } from '../models/event.model.js';
import { Ticket } from '../models/ticket.model.js';
import { Payment } from '../models/payment.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { IMAGE_URL } from '../utils/validators.js';
import { notify } from '../services/notify.js';
import bcrypt from 'bcryptjs';

const PREMIUM_REQUEST_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const router = Router();
const { getList, getOne, remove } = makeCrudController(User);

// Custom create: hash password, block privileged field injection
const createUser = asyncHandler(async (req, res) => {
  const { password, role: _role, is_banned: _ib, is_verified: _iv, is_organizer_verified: _iov, password_hash: _ph, ...rest } = req.body;

  if (!password) {
    res.status(400).json({ success: false, error: { code: 'MISSING_PASSWORD', message: 'Mot de passe requis' } });
    return;
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ ...rest, password_hash: hashed });
  res.status(201).json(user);
});

// Custom update: strip sensitive/privileged fields — use dedicated endpoints
// for role/ban/premium
const updateUser = asyncHandler(async (req, res) => {
  const { password_hash: _ph, password: _pw, __v: _v, _id: _id, role: _role, is_banned: _ib, is_premium: _ip, ...rest } = req.body;

  const doc = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  res.json(doc);
});

// Dedicated endpoint: change any user's role (admin only, explicit intent)
const changeRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const allowed = ['member', 'organizer', 'moderator', 'admin'];
  if (!allowed.includes(role)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Rôle invalide' } });
    return;
  }
  const doc = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  res.json(doc);
});

// Dedicated endpoint: ban/unban
const setBan = asyncHandler(async (req, res) => {
  const { is_banned } = req.body;
  const doc = await User.findByIdAndUpdate(req.params.id, { is_banned: Boolean(is_banned) }, { new: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  res.json(doc);
});

// Dedicated endpoint: grant/revoke premium (staff — there's no payment
// gateway yet, so this is the only way accounts become premium)
const setPremium = asyncHandler(async (req, res) => {
  const { is_premium } = req.body;
  const doc = await User.findByIdAndUpdate(req.params.id, { is_premium: Boolean(is_premium) }, { new: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  // Promotion is a premium perk: revoking premium also ends any active
  // promotions, otherwise a promoted event would keep its top-of-feed spot
  // forever after the perk that paid for it is gone.
  if (!doc.is_premium) {
    await Event.updateMany(
      { created_by: doc.id, is_promoted: true },
      { is_promoted: false, $unset: { promoted_at: 1 } },
    );
  }
  res.json(doc);
});

// Self-service premium request (no payment gateway): notifies staff instead
// of charging a card. Cooldown prevents a user from spamming admins with
// repeat requests while a prior one is still pending review.
const requestPremium = asyncHandler(async (req, res) => {
  const user = await User.findById(req.adminId).select('full_name is_premium premium_requested_at');
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  if (user.is_premium) {
    res.status(409).json({ success: false, error: { code: 'ALREADY_PREMIUM', message: 'Vous êtes déjà premium' } });
    return;
  }
  if (user.premium_requested_at && Date.now() - user.premium_requested_at.getTime() < PREMIUM_REQUEST_COOLDOWN_MS) {
    res.status(409).json({ success: false, error: { code: 'REQUEST_PENDING', message: 'Votre demande est déjà en cours d\'examen' } });
    return;
  }

  user.premium_requested_at = new Date();
  await user.save();

  const staff = await User.find({ role: { $in: ['admin', 'moderator'] } }).select('_id');
  await notify(staff.map((s) => s.id), {
    type: 'premium_request',
    title: 'Demande de statut Premium',
    body: `${user.full_name} souhaite passer premium`,
  });

  res.json({ success: true, data: { premium_requested_at: user.premium_requested_at } });
});

// ─── Public profile (any authenticated user) ────────────────────────────────
// Safe subset only — never email/phone/lang/role internals.
const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('full_name avatar_url bio_fr bio_ar is_premium created_at is_pending_deletion');
  if (!user || user.full_name === 'Compte supprimé' || user.is_pending_deletion) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  const [eventsCreated, groupsOwned] = await Promise.all([
    Event.countDocuments({ created_by: user.id }),
    Group.countDocuments({ owner_id: user.id }),
  ]);
  res.json({
    success: true,
    data: {
      _id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      bio_fr: user.bio_fr,
      bio_ar: user.bio_ar,
      is_premium: user.is_premium,
      member_since: user.created_at,
      events_created: eventsCreated,
      groups_owned: groupsOwned,
    },
  });
});

// ─── Self-service profile (any authenticated user) ─────────────────────────

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  // Accepts base64 data URIs (device photo, inline in Mongo) or plain URLs
  avatar_url: IMAGE_URL.or(z.literal('')),
  bio_fr: z.string().trim().max(1000).optional(),
  bio_ar: z.string().trim().max(1000).optional(),
  city_id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  lang: z.enum(['fr', 'ar', 'en']).optional(),
  interests: z.array(z.string().trim().max(50)).max(20).optional(),
});

// Zod strips unknown keys, so role/is_banned/email/password can't sneak through
const updateMyProfile = asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' },
    });
    return;
  }
  const doc = await User.findByIdAndUpdate(req.adminId, parsed.data, { new: true, runValidators: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  res.json({ success: true, data: doc });
});

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

// Self-service password change — requires the current password since a valid
// JWT alone isn't proof the holder knows the password (e.g. a leaked token).
const changeMyPassword = asyncHandler(async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' },
    });
    return;
  }

  const user = await User.findById(req.adminId).select('+password_hash');
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }

  const isMatch = await bcrypt.compare(parsed.data.current_password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Mot de passe actuel incorrect' } });
    return;
  }

  user.password_hash = await bcrypt.hash(parsed.data.new_password, 12);
  await user.save();
  res.json({ success: true, data: { message: 'Mot de passe mis à jour' } });
});

// ─── CNDP compliance (any authenticated user, self only) ───────────────────

// Right of access: full export of the user's personal data
const exportMyData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.adminId);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }

  const [groups, events, tickets, payments, memberships] = await Promise.all([
    Group.find({ owner_id: req.adminId }),
    Event.find({ created_by: req.adminId }),
    Ticket.find({ user_id: req.adminId }),
    Payment.find({ user_id: req.adminId }),
    Group.find({ members: req.adminId }).select('name city_id'),
  ]);

  res.json({
    success: true,
    data: {
      exported_at: new Date().toISOString(),
      user,
      owned_groups: groups,
      created_events: events,
      tickets,
      payments,
      group_memberships: memberships,
    },
  });
});

const DELETION_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const DELETION_REASON_CODES = [
  'not_useful',
  'privacy',
  'too_many_notifications',
  'found_alternative',
  'bug_issues',
  'temporary_break',
  'other',
];

const deleteAccountSchema = z.object({
  reason_code: z.enum(DELETION_REASON_CODES),
  reason_details: z.string().trim().max(500).optional(),
});

// Right to erasure, with a 30-day grace period: the account is suspended
// immediately (hidden/blocked like a ban, but login still works) and the
// reason is recorded for product feedback. Logging back in during the
// window cancels the deletion (see reactivateIfPending in auth.controller).
// The actual anonymization only happens once scheduled_purge_at passes with
// no reconnection — handled by the daily purge job (routes/internal.routes.js).
const deleteMyAccount = asyncHandler(async (req, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Veuillez indiquer la raison de la suppression' },
    });
    return;
  }

  const user = await User.findById(req.adminId);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }

  const now = new Date();
  const purgeAt = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS);
  user.is_pending_deletion = true;
  user.deletion_reason = parsed.data.reason_details
    ? `${parsed.data.reason_code}: ${parsed.data.reason_details}`
    : parsed.data.reason_code;
  user.deletion_requested_at = now;
  user.scheduled_purge_at = purgeAt;
  await user.save();

  // Suspended accounts shouldn't hold event slots while in limbo — same
  // as before, just no longer tied to an irreversible deletion.
  await Ticket.updateMany(
    { user_id: req.adminId, status: { $in: ['pending', 'confirmed'] } },
    { status: 'cancelled' }
  );

  res.json({
    success: true,
    data: {
      message: 'Compte suspendu. Reconnectez-vous avant la date indiquée pour annuler la suppression.',
      scheduled_purge_at: purgeAt.toISOString(),
    },
  });
});

router.use(requireAuth);

router.get('/me/export', exportMyData);
router.put('/me', updateMyProfile);
router.patch('/me/password', changeMyPassword);
router.post('/me/request-premium', requestPremium);
router.delete('/me', deleteMyAccount);
router.get('/:id/profile', getPublicProfile);

router.use(requireAdmin);

router.get('/', getList);
router.get('/:id', getOne);
router.post('/', createUser);
router.put('/:id', updateUser);
// Role escalation and account deletion are admin-only; moderators keep ban/unban
router.patch('/:id/role', requireSuperAdmin, changeRole);
router.patch('/:id/ban', setBan);
router.patch('/:id/premium', setPremium);
router.delete('/:id', requireSuperAdmin, remove);

export default router;
