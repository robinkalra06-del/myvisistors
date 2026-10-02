import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { db } from './config/database.js';
import { initSocketServer } from './sockets/socketServer.js';
import { presenceManager } from './sockets/visitorPresence.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    // 1. Initialize Database
    await db.init();

    // 2. Create Express app and HTTP server
    const app = createApp();
    const httpServer = http.createServer(app);

    // 3. Initialize Socket.IO
    initSocketServer(httpServer);

    // 4. Start Background Visitor Presence Engine
    presenceManager.start();

    // 5. Start Listening
    httpServer.listen(config.port, config.host, () => {
      logger.info(`=======================================================`);
      logger.info(`  LiveTrack API & Real-Time Engine Active`);
      logger.info(`  URL: http://${config.host}:${config.port}`);
      logger.info(`  Tracking script: http://localhost:${config.port}/tracker.js`);
      logger.info(`  Test site: http://localhost:${config.port}/test-site.html`);
      logger.info(`  Environment: ${config.env}`);
      logger.info(`=======================================================`);
    });

    // 6. Graceful Shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      presenceManager.stop();
      httpServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forceful shutdown due to timeout.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Fatal initialization error: ' + err.message, { stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
