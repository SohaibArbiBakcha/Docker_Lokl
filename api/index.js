import { createApp } from '../backend/src/app.js';

// Vercel serverless entry point. Builds the Express app once per warm
// container (cached at module scope) and delegates each request to it —
// same app.js used by the standalone server (backend/src/index.js) and the
// combined Docker image, so behavior is identical across all three deploys.
let appPromise;

export default async function handler(req, res) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  return app(req, res);
}
