import { AuditLog } from '../models/audit-log.model.js';
import { logger } from '../config/logger.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const STAFF_ROLES = new Set(['admin', 'moderator']);
const SENSITIVE_KEYS = new Set(['password', 'password_hash', 'current_password', 'new_password', 'refresh_token', 'id_token']);
const MAX_BODY_LENGTH = 2000;

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return '';
  const clean = {};
  for (const [key, value] of Object.entries(body)) {
    clean[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return JSON.stringify(clean).slice(0, MAX_BODY_LENGTH);
};

// Records every successful staff write. Registered globally BEFORE the routers:
// the 'finish' listener fires after the handlers ran, so req.adminId/adminRole
// (set by requireAuth inside each router) are populated by then.
export const auditTrail = (req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    if (!STAFF_ROLES.has(req.adminRole ?? '')) return;
    if (res.statusCode >= 400) return;
    if (req.originalUrl.startsWith('/api/v1/auth')) return;

    // Fire and forget — an audit failure must never break the actual request
    AuditLog.create({
      actor_id: req.adminId,
      actor_role: req.adminRole,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      body: sanitizeBody(req.body),
    }).catch((err) => logger.warn({ err }, 'Audit log write failed'));
  });

  next();
};
