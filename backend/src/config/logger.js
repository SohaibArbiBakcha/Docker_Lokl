import pino from 'pino';
import { ENV } from './env.js';

// Pretty-print in dev only — prod containers should emit plain JSON for log
// aggregators (CloudWatch/Datadog/etc.) to parse.
export const logger = pino({
  level: ENV.LOG_LEVEL,
  transport: ENV.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
  redact: ['req.headers.authorization', 'req.body.password', 'req.body.password_hash', 'req.body.refresh_token'],
});
