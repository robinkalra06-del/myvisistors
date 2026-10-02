import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env files safely using built-in Node.js feature or fallback
const rootEnv = path.resolve(__dirname, '../../../../.env');
const apiEnv = path.resolve(__dirname, '../../.env');

[rootEnv, apiEnv].forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      if (process.loadEnvFile) {
        process.loadEnvFile(filePath);
      }
    } catch {}
  }
});

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '10000', 10),
  host: process.env.HOST || '0.0.0.0',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:10000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/livetrack?schema=public',
  redisUrl: process.env.REDIS_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'livetrack_super_secret_jwt_key_2026_change_in_production!',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  sessionSecret: process.env.SESSION_SECRET || 'livetrack_session_secret_2026',
  corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()),
  geoipApiKey: process.env.GEOIP_API_KEY || '',
  
  // SMTP Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'LiveTrack Alerts <alerts@livetrack.io>'
  },

  // Limits
  rateLimits: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '600', 10)
  },

  // Privacy defaults
  privacy: {
    anonymizeIpDefault: true,
    respectDnt: true
  }
};
