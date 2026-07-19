import mongoose from 'mongoose';
import { ENV } from './env.js';

// Cached at module scope: a warm serverless invocation (Vercel) reuses this
// same module instance, so we only pay the connection cost once per warm
// container instead of once per request. A plain long-running process
// (local dev, Docker) just calls this once at boot either way.
let connectionPromise = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(ENV.MONGODB_URI).catch(async (err) => {
      connectionPromise = null; // let the next call retry instead of caching a rejection forever
      // One immediate retry: on Vercel a cold container's first connection
      // attempt occasionally fails transiently (DNS/TLS warmup) even though
      // Atlas itself is fine — this turns that into extra latency instead of
      // a user-visible 500 on the unlucky first request.
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mongoose.connect(ENV.MONGODB_URI);
    });
  }
  await connectionPromise;
  return mongoose.connection;
};
