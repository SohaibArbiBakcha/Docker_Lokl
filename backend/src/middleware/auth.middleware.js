import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token manquant' } });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET);
    req.adminId = payload.id;
    req.adminRole = payload.role;
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' } });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.adminRole ?? '')) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Accès refusé' } });
    return;
  }
  next();
};

// Full admins only — moderators can moderate content but must not be able to
// escalate roles or delete accounts.
export const requireSuperAdmin = (req, res, next) => {
  if (req.adminRole !== 'admin') {
    res.status(403).json({ success: false, error: { code: 'ADMIN_ONLY', message: 'Réservé aux administrateurs' } });
    return;
  }
  next();
};
