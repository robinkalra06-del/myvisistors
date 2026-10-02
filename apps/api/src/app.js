import express from './utils/expressAdapter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import websiteRoutes from './routes/website.routes.js';
import trackRoutes from './routes/track.routes.js';
import visitorRoutes from './routes/visitor.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Basic CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Body parsers: JSON, URL-encoded, and text/plain for sendBeacon
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: 'text/plain', limit: '1mb' }));

  // Middleware to parse text/plain beacon payloads as JSON if needed
  app.use((req, res, next) => {
    if (typeof req.body === 'string' && req.body.startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
      } catch {}
    }
    next();
  });

  // Static Assets (tracker.js, test-site.html)
  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'LiveTrack API',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/websites', websiteRoutes);
  app.use('/api/track', trackRoutes);
  app.use('/api/visitors', visitorRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 handler for undefined API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: { message: `Route ${req.method} ${req.originalUrl} not found`, code: 'NOT_FOUND' }
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
