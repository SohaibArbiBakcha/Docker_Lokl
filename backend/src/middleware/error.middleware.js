import { logger } from '../config/logger.js';
import { captureException } from '../config/sentry.js';

export const errorHandler = (err, req, res, _next) => {
  logger.error({ err, path: req.path, method: req.method }, err.message);
  captureException(err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
  });
};

export const notFound = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route introuvable' },
  });
};
