const requireEnv = (key, fallback) => {
  const value = process.env[key] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const ENV = {
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  MONGODB_URI: requireEnv('MONGODB_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  // Google OAuth web client ID — optional; POST /auth/google returns 503 until set
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  // Facebook Login app credentials — optional; POST /auth/facebook returns 503 until set
  FB_APP_ID: process.env.FB_APP_ID ?? '',
  FB_APP_SECRET: process.env.FB_APP_SECRET ?? '',
  // GitHub OAuth App credentials — optional; POST /auth/github returns 503 until set
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? '',
  // Shared secret Vercel Cron sends as a Bearer token — see internal.routes.js.
  // Vercel sets this automatically once the env var exists; nothing to wire
  // up manually beyond adding CRON_SECRET in the project's env vars.
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  // Optional error tracking — leave unset to disable (see backend/src/config/sentry.js)
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',
  // Set to the number of reverse-proxy hops (1 for a single nginx/ALB in front) so
  // express-rate-limit and req.ip see the real client IP instead of the proxy's.
  TRUST_PROXY: parseInt(process.env.TRUST_PROXY ?? '0', 10),
};
