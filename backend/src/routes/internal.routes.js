import { Router } from 'express';
import crypto from 'node:crypto';
import { User } from '../models/user.model.js';
import { Ticket } from '../models/ticket.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ENV } from '../config/env.js';
import { logger } from '../config/logger.js';

const router = Router();

// Vercel Cron calls this daily with `Authorization: Bearer $CRON_SECRET`
// (Vercel adds that header automatically once CRON_SECRET is set — see
// vercel.json). Reject everything else, including when the secret isn't
// configured yet, rather than leaving this open.
const requireCronSecret = (req, res, next) => {
  const header = req.headers.authorization;
  if (!ENV.CRON_SECRET || header !== `Bearer ${ENV.CRON_SECRET}`) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    return;
  }
  next();
};

// Finishes what self-service deletion started: any account whose 30-day
// grace period (users.routes.js → deleteMyAccount) has passed with no
// reconnection gets permanently anonymized here. Runs once a day — see the
// "crons" entry in vercel.json.
const purgePendingDeletions = asyncHandler(async (_req, res) => {
  const due = await User.find({
    is_pending_deletion: true,
    scheduled_purge_at: { $lte: new Date() },
  }).select('_id');

  let purged = 0;
  for (const { _id } of due) {
    await User.updateOne(
      { _id },
      {
        email: `deleted-${_id}@deleted.lokl.ma`,
        full_name: 'Compte supprimé',
        phone: '',
        avatar_url: '',
        bio_fr: '',
        bio_ar: '',
        interests: [],
        is_banned: true, // blocks any further login, including reactivation
        is_pending_deletion: false,
        password_hash: crypto.randomBytes(32).toString('hex'), // never matches bcrypt.compare
      },
    );
    await Ticket.updateMany(
      { user_id: _id, status: { $in: ['pending', 'confirmed'] } },
      { status: 'cancelled' },
    );
    purged += 1;
  }

  if (purged > 0) logger.info(`Purged ${purged} account(s) past their deletion grace period`);
  res.json({ success: true, data: { purged } });
});

router.get('/purge-pending-deletions', requireCronSecret, purgePendingDeletions);

export default router;
