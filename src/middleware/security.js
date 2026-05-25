import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, '');

const configuredOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS,
  'http://localhost:5173'
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(','))
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);

export const applySecurity = (app) => {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        const normalized = normalizeOrigin(origin);

        if (
          allowedOrigins.has(normalized) ||
          normalized.endsWith('.vercel.app') ||
          /^https?:\/\/localhost(:\d+)?$/.test(normalized)
        ) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  );

  app.use(mongoSanitize());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 250,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Too many requests. Please slow down.' }
    })
  );
};
