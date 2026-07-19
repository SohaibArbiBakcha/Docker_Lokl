import { Notification } from '../models/notification.model.js';
import { logger } from '../config/logger.js';

// Notifications are best-effort side effects: a fanout failure must never
// fail the request that triggered it (a registration or a chat message).
const MAX_FANOUT = 200;

export const notify = async (recipients, payload) => {
  try {
    const unique = [...new Set(recipients.map(String))].slice(0, MAX_FANOUT);
    if (unique.length === 0) return;
    await Notification.insertMany(
      unique.map((user_id) => ({ user_id, ...payload })),
      { ordered: false }
    );
  } catch (err) {
    logger.warn({ err }, 'notification fanout failed');
  }
};
