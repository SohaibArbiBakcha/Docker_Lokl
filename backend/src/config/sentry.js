import { ENV } from './env.js';
import { logger } from './logger.js';

// Sentry is entirely optional — leave SENTRY_DSN unset and this is a no-op.
// Kept isolated here so index.js/error.middleware never need to know whether
// it's actually configured.
let Sentry = null;

export const initSentry = async () => {
  if (!ENV.SENTRY_DSN) return;
  try {
    Sentry = await import('@sentry/node');
    Sentry.init({ dsn: ENV.SENTRY_DSN, environment: ENV.NODE_ENV, tracesSampleRate: 0.1 });
    logger.info('Sentry initialized');
  } catch (err) {
    logger.warn({ err }, 'SENTRY_DSN is set but @sentry/node failed to load — run `npm install @sentry/node`');
  }
};

export const captureException = (err) => {
  Sentry?.captureException(err);
};
