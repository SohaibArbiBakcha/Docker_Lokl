import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { logger } from './config/logger.js';

// Long-running server entry point — local dev and the Docker deploy.
// Vercel uses ../api/index.js instead, which imports createApp() directly
// and never calls .listen() (the platform handles that).
const start = async () => {
  const app = await createApp();
  await connectDB();
  const server = app.listen(ENV.PORT, () => {
    logger.info(`Lokl API running on http://localhost:${ENV.PORT} (${ENV.NODE_ENV})`);
  });

  // Let in-flight requests finish before the process exits — orchestrators
  // (Docker/Kubernetes/systemd) send SIGTERM before killing the container.
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await import('mongoose').then((m) => m.default.disconnect());
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
