import { Router } from 'express';
import { Notification } from '../models/notification.model.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Everything here is scoped to the authenticated user's own inbox —
// there is no cross-user or staff view of notifications.

const getMyNotifications = asyncHandler(async (req, res) => {
  const skip = Math.max(0, parseInt(req.query._start ?? '0', 10) || 0);
  const end = parseInt(req.query._end ?? '30', 10) || 30;
  const limit = Math.min(Math.max(end - skip, 1), 100);

  const [notifications, total] = await Promise.all([
    Notification.find({ user_id: req.adminId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ user_id: req.adminId }),
  ]);

  res.setHeader('X-Total-Count', total);
  res.json(notifications);
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user_id: req.adminId, is_read: false });
  res.json({ success: true, data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
  const doc = await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.adminId },
    { is_read: true },
    { new: true }
  );
  if (!doc) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification introuvable' } });
    return;
  }
  res.json({ success: true, data: doc });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user_id: req.adminId, is_read: false }, { is_read: true });
  res.json({ success: true, data: {} });
});

router.use(requireAuth);
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markRead);
router.post('/read-all', markAllRead);

export default router;
