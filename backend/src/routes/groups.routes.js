import { Router } from 'express';
import { z } from 'zod';
import { Group } from '../models/group.model.js';
import { Message } from '../models/message.model.js';
import { makeCrudController } from '../controllers/crud.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { notify } from '../services/notify.js';

const router = Router();
const { getList, getOne } = makeCrudController(Group);

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

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description_fr: z.string().trim().max(2000).optional(),
  description_ar: z.string().trim().max(2000).optional(),
  cover_url: IMAGE_URL,
  category_id: z.string().regex(OBJECT_ID),
  city_id: z.string().regex(OBJECT_ID),
  is_private: z.boolean().optional(),
  admission_questions: z.array(z.string().trim().max(300)).max(10).optional(),
});

// owner_id always comes from the JWT — never trusted from the client.
// Zod strips unknown keys, so owner_id/members/member_count can't sneak in.
const createGroup = asyncHandler(async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' },
    });
    return;
  }
  const group = await Group.create({
    ...parsed.data,
    owner_id: req.adminId,
    members: [req.adminId],
    member_count: 1,
  });
  res.status(201).json(group);
});

// Groups the current user belongs to — powers the mobile Messages tab
const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.adminId, is_active: true })
    .sort({ updated_at: -1 });
  res.setHeader('X-Total-Count', groups.length);
  res.json(groups);
});

// Owners manage their own groups; staff manage all
const loadGroupAndCheckOwner = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: "Le groupe demandé n'existe pas" } });
    return;
  }
  if (!isStaff(req) && String(group.owner_id) !== String(req.adminId)) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Seul le propriétaire peut modifier ce groupe' } });
    return;
  }
  next();
});

const updateGroup = asyncHandler(async (req, res) => {
  const { owner_id: _oid, members: _m, member_count: _mc, _id: _id, __v: _v, ...rest } = req.body;
  if (rest.cover_url !== undefined) {
    const parsed = IMAGE_URL.safeParse(rest.cover_url === '' ? undefined : rest.cover_url);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Image invalide' } });
      return;
    }
    rest.cover_url = parsed.data ?? '';
  }
  const doc = await Group.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true });
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: "Le groupe demandé n'existe pas" } });
    return;
  }
  res.json(doc);
});

const removeGroup = asyncHandler(async (req, res) => {
  const doc = await Group.findByIdAndDelete(req.params.id);
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: "Le groupe demandé n'existe pas" } });
    return;
  }
  res.json(doc);
});

const joinGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group || !group.is_active) {
    res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: "Le groupe demandé n'existe pas" } });
    return;
  }

  // Atomic: only adds if not already a member
  const updated = await Group.findOneAndUpdate(
    { _id: group.id, members: { $ne: req.adminId } },
    { $addToSet: { members: req.adminId }, $inc: { member_count: 1 } },
    { new: true }
  );
  if (!updated) {
    res.status(409).json({ success: false, error: { code: 'ALREADY_MEMBER', message: 'Vous êtes déjà membre de ce groupe' } });
    return;
  }

  res.json({ success: true, data: updated });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: "Le groupe demandé n'existe pas" } });
    return;
  }
  if (String(group.owner_id) === String(req.adminId)) {
    res.status(409).json({ success: false, error: { code: 'OWNER_CANNOT_LEAVE', message: 'Le propriétaire ne peut pas quitter son propre groupe' } });
    return;
  }

  const updated = await Group.findOneAndUpdate(
    { _id: group.id, members: req.adminId },
    { $pull: { members: req.adminId }, $inc: { member_count: -1 } },
    { new: true }
  );
  if (!updated) {
    res.status(409).json({ success: false, error: { code: 'NOT_MEMBER', message: "Vous n'êtes pas membre de ce groupe" } });
    return;
  }

  res.json({ success: true, data: updated });
});

// ─── Group chat ─────────────────────────────────────────────────────────────

// Chat is members-only (staff can read for moderation)
const requireMembership = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.id);
  if (!group || !group.is_active) {
    res.status(404).json({ success: false, error: { code: 'GROUP_NOT_FOUND', message: "Le groupe demandé n'existe pas" } });
    return;
  }
  const isMember = group.members.some((m) => String(m) === String(req.adminId));
  if (!isMember && !isStaff(req)) {
    res.status(403).json({ success: false, error: { code: 'NOT_MEMBER', message: 'Rejoignez le groupe pour accéder à la discussion' } });
    return;
  }
  next();
});

const getMessages = asyncHandler(async (req, res) => {
  const skip = Math.max(0, parseInt(req.query._start ?? '0', 10) || 0);
  const end = parseInt(req.query._end ?? '50', 10) || 50;
  const limit = Math.min(Math.max(end - skip, 1), 100);

  const [messages, total] = await Promise.all([
    Message.find({ group_id: req.params.id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender_id', 'full_name avatar_url is_premium'),
    Message.countDocuments({ group_id: req.params.id }),
  ]);

  res.setHeader('X-Total-Count', total);
  res.json(messages);
});

const postMessage = asyncHandler(async (req, res) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!content || content.length > 1000) {
    res.status(400).json({ success: false, error: { code: 'INVALID_MESSAGE', message: 'Message vide ou trop long (1000 caractères max)' } });
    return;
  }

  const message = await Message.create({
    group_id: req.params.id,
    sender_id: req.adminId,
    content,
  });
  const populated = await message.populate('sender_id', 'full_name avatar_url is_premium');

  // Every group member except the sender
  const group = await Group.findById(req.params.id).select('name members');
  if (group) {
    const recipients = group.members.filter((id) => String(id) !== String(req.adminId));
    const senderName = populated.sender_id?.full_name ?? 'Un membre';
    await notify(recipients, {
      type: 'group_message',
      title: `Message — ${group.name}`,
      body: `${senderName} : ${content.slice(0, 120)}`,
      group_id: group.id,
    });
  }

  res.status(201).json({ success: true, data: populated });
});

router.use(requireAuth);

router.get('/', getList);
router.get('/mine', getMyGroups);
router.get('/:id', getOne);
router.post('/', createGroup);
router.post('/:id/join', joinGroup);
router.post('/:id/leave', leaveGroup);
router.get('/:id/messages', requireMembership, getMessages);
router.post('/:id/messages', requireMembership, postMessage);
router.put('/:id', loadGroupAndCheckOwner, updateGroup);
router.delete('/:id', loadGroupAndCheckOwner, removeGroup);

export default router;
