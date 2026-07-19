import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Unauthenticated on purpose — load balancers / uptime monitors hit this.
// Reports 503 if Mongo isn't connected so orchestrators stop routing traffic here.
router.get('/', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    data: {
      status: dbConnected ? 'ok' : 'degraded',
      db: mongoose.STATES[mongoose.connection.readyState],
      uptime_s: Math.round(process.uptime()),
    },
  });
});

export default router;
