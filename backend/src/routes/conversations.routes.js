import { Router } from 'express';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { User } from '../models/user.model.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { notify } from '../services/notify.js';
import { OBJECT_ID } from '../utils/validators.js';

const router = Router();

const isStaff = (req) => ['admin', 'moderator'].includes(req.adminRole ?? '');

// My conversations, most recent first, with the other participant populated
// (hidden ones — "deleted" by me — are excluded until a new message revives them)
const getMyConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ participants: req.adminId, hidden_by: { $ne: req.adminId } })
    .sort({ last_message_at: -1 })
    .limit(100)
    .populate('participants', 'full_name avatar_url is_premium');

  res.setHeader('X-Total-Count', conversations.length);
  res.json(conversations);
});

// "Delete" a chat for myself only — the other participant's copy is untouched.
const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation introuvable' } });
    return;
  }
  const isParticipant = conversation.participants.some((p) => String(p) === String(req.adminId));
  if (!isParticipant) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Vous ne participez pas à cette conversation' } });
    return;
  }
  await Conversation.updateOne({ _id: req.params.id }, { $addToSet: { hidden_by: req.adminId } });
  res.json({ success: true, data: { message: 'Conversation supprimée' } });
});

// Start (or reopen) a private conversation. Premium-only to INITIATE —
// replying inside an existing conversation is free for both sides.
const createConversation = asyncHandler(async (req, res) => {
  const recipientId = req.body?.recipient_id;
  if (typeof recipientId !== 'string' || !OBJECT_ID.test(recipientId)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Destinataire invalide' } });
    return;
  }
  if (recipientId === String(req.adminId)) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Impossible de discuter avec soi-même' } });
    return;
  }

  const [me, recipient] = await Promise.all([
    User.findById(req.adminId).select('is_premium full_name'),
    User.findById(recipientId).select('full_name is_banned'),
  ]);
  if (!recipient || recipient.is_banned || recipient.full_name === 'Compte supprimé') {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }

  // Idempotent: reuse the existing conversation between these two users
  const existing = await Conversation.findOne({
    participants: { $all: [req.adminId, recipientId] },
  }).populate('participants', 'full_name avatar_url is_premium');
  if (existing) {
    // Reopening a chat I'd deleted un-hides it for me again
    if (existing.hidden_by.some((id) => String(id) === String(req.adminId))) {
      await Conversation.updateOne({ _id: existing.id }, { $pull: { hidden_by: req.adminId } });
    }
    res.json({ success: true, data: existing });
    return;
  }

  if (!me?.is_premium && !isStaff(req)) {
    res.status(403).json({
      success: false,
      error: { code: 'PREMIUM_REQUIRED', message: 'Les messages privés sont réservés aux comptes premium' },
    });
    return;
  }

  const conversation = await Conversation.create({
    participants: [req.adminId, recipientId],
    created_by: req.adminId,
  });
  const populated = await conversation.populate('participants', 'full_name avatar_url is_premium');
  res.status(201).json({ success: true, data: populated });
});

// Participants only — staff excluded on purpose: private means private
const requireParticipant = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation introuvable' } });
    return;
  }
  const isParticipant = conversation.participants.some((p) => String(p) === String(req.adminId));
  if (!isParticipant) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Vous ne participez pas à cette conversation' } });
    return;
  }
  req.conversation = conversation;
  next();
});

const getMessages = asyncHandler(async (req, res) => {
  const skip = Math.max(0, parseInt(req.query._start ?? '0', 10) || 0);
  const end = parseInt(req.query._end ?? '50', 10) || 50;
  const limit = Math.min(Math.max(end - skip, 1), 100);

  const [messages, total] = await Promise.all([
    Message.find({ conversation_id: req.params.id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender_id', 'full_name avatar_url is_premium'),
    Message.countDocuments({ conversation_id: req.params.id }),
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
    conversation_id: req.params.id,
    sender_id: req.adminId,
    content,
  });
  const populated = await message.populate('sender_id', 'full_name avatar_url is_premium');

  const other = req.conversation.participants.find((p) => String(p) !== String(req.adminId));

  req.conversation.last_message_at = new Date();
  req.conversation.last_message_preview = content.slice(0, 140);
  // A new message resurfaces the conversation for anyone who'd hidden it
  req.conversation.hidden_by = req.conversation.hidden_by.filter(
    (id) => ![req.adminId, other].map(String).includes(String(id))
  );
  await req.conversation.save();

  const senderName = populated.sender_id?.full_name ?? 'Un membre';
  await notify([other], {
    type: 'direct_message',
    title: `Message privé — ${senderName}`,
    body: content.slice(0, 120),
    conversation_id: req.conversation.id,
  });

  res.status(201).json({ success: true, data: populated });
});

router.use(requireAuth);
router.get('/', getMyConversations);
router.post('/', createConversation);
router.delete('/:id', deleteConversation);
router.get('/:id/messages', requireParticipant, getMessages);
router.post('/:id/messages', requireParticipant, postMessage);

export default router;
