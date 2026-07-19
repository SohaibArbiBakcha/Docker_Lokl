import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { logger } from './config/logger.js';
import { initSentry, captureException } from './config/sentry.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { auditTrail } from './middleware/audit.middleware.js';

import healthRoutes from './routes/health.routes.js';
import auditLogsRoutes from './routes/audit-logs.routes.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import usersRoutes from './routes/users.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import eventsRoutes from './routes/events.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import citiesRoutes from './routes/cities.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import metaRoutes from './routes/meta.routes.js';
import conversationsRoutes from './routes/conversations.routes.js';
import internalRoutes from './routes/internal.routes.js';

// Builds the Express app without starting a server — shared by the
// long-running entry point (index.js: local dev, Docker) and the serverless
// entry point (../api/index.js: Vercel). Callers decide how to run it.
export const createApp = async () => {
  await initSentry();

  const app = express();

  // Trust N reverse-proxy hops (nginx/ALB/Vercel's edge) so req.ip and
  // rate-limit see the real client IP.
  if (ENV.TRUST_PROXY > 0) app.set('trust proxy', ENV.TRUST_PROXY);

  app.use(helmet());
  const allowedOrigins = ENV.CORS_ORIGIN.split(',').map((o) => o.trim());
  // Browsers send an Origin header on every POST and on crossorigin
  // module/asset fetches — including SAME-origin ones. Those must never be
  // rejected: the admin SPA and the served static assets live on this very
  // host. Unknown cross-origin callers get no CORS headers (the browser then
  // blocks them itself) instead of a 500 — throwing here turned every
  // same-origin admin login into an 'Erreur interne du serveur'.
  app.use((req, res, next) => cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (origin === `${req.protocol}://${req.get('host')}`) return callback(null, true);
      callback(null, false);
    },
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
  })(req, res, next));
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  // Raised from the 100kb default to fit base64-encoded event/group photos
  // (stored inline in Mongo — see IMAGE_URL in events/groups routes).
  app.use(express.json({ limit: '1mb' }));
  app.use(auditTrail);

  // Every request waits for a DB connection first. Cheap once connected
  // (connectDB caches the promise) — required for serverless, where there's
  // no guaranteed "connect once at boot" moment before the first request.
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (err) {
      next(err);
    }
  });

  // Combined-container deploy: the Docker build stage copies the landing page
  // and the built admin panel into ./public (see root Dockerfile). Absent in
  // local dev and on Vercel (which serves those as static files directly,
  // bypassing this app entirely) — this simply no-ops then.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(__dirname, '../public');
  const hasPublicDir = fs.existsSync(publicDir);
  if (hasPublicDir) app.use(express.static(publicDir));

  app.use('/health', healthRoutes);

  // 5 attempts / 15 min on credential endpoints (login, register, refresh) — GET /me is not an attack surface
  // Note: on serverless (Vercel), this in-memory store isn't shared across
  // instances/cold starts, so the limit is best-effort there rather than a
  // hard global guarantee — acceptable for a pre-prod test environment.
  app.use('/api/v1/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skip: (req) => req.method !== 'POST',
  }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/groups', groupsRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/tickets', ticketsRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/reviews', reviewsRoutes);
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/cities', citiesRoutes);
  app.use('/api/v1/audit-logs', auditLogsRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/meta', metaRoutes);
  app.use('/api/v1/conversations', conversationsRoutes);
  app.use('/api/v1/internal', internalRoutes);

  // SPA fallback for the back-office's client-side routes (e.g. /admin/users/123) —
  // express.static above already handled real files (JS/CSS/images), so anything
  // reaching here under /admin is a react-router path, not a missing asset.
  if (hasPublicDir) {
    app.get('/admin/*', (_req, res) => {
      res.sendFile(path.join(publicDir, 'admin', 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  process.on('unhandledRejection', (err) => {
    logger.error({ err }, 'Unhandled promise rejection');
    captureException(err);
  });

  return app;
};
