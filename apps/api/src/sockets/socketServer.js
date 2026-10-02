import EventEmitter from 'node:events';
import { verifyJwt } from '../utils/crypto.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { SOCKET_EVENTS } from '../../../../packages/shared/index.js';

let ioInstance = null;

class FallbackSocketServer extends EventEmitter {
  constructor() {
    super();
    this.rooms = new Map();
    this.engine = { clientsCount: 0 };
  }

  use(fn) {
    this._mw = fn;
  }

  to(room) {
    return {
      emit: (event, data) => {
        this.emit(`room:${room}`, { event, data });
      }
    };
  }
}

export async function initSocketServer(httpServer) {
  try {
    const { Server } = await import('socket.io');
    ioInstance = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 25000
    });
  } catch (err) {
    logger.info('socket.io not yet installed, using fallback real-time event bus.');
    ioInstance = new FallbackSocketServer();
  }

  // Authentication Middleware for dashboard connections
  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // Allow unauthenticated visitors to connect if needed, but flag them
      socket.data = { isAnonymous: true };
      return next();
    }

    const decoded = verifyJwt(token, config.jwtSecret);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    socket.data = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      isAnonymous: false
    };
    next();
  });

  ioInstance.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`, { user: socket.data?.email || 'guest' });

    // Join website-specific room
    socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ websiteId }) => {
      if (websiteId) {
        const roomName = `website:${websiteId}`;
        socket.join(roomName);
        logger.debug(`Socket ${socket.id} joined room ${roomName}`);
      }
    });

    // Leave website-specific room
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, ({ websiteId }) => {
      if (websiteId) {
        const roomName = `website:${websiteId}`;
        socket.leave(roomName);
        logger.debug(`Socket ${socket.id} left room ${roomName}`);
      }
    });

    socket.on(SOCKET_EVENTS.PING, () => {
      socket.emit(SOCKET_EVENTS.PONG, { timestamp: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('Socket.IO real-time server initialized');
  return ioInstance;
}

/**
 * Get active io server instance
 */
export function getIo() {
  return ioInstance;
}

/**
 * Broadcast event to authorized website room
 */
export function emitToWebsite(websiteId, event, data) {
  if (!ioInstance) return;
  const room = `website:${websiteId}`;
  ioInstance.to(room).emit(event, {
    ...data,
    websiteId,
    _emittedAt: new Date().toISOString()
  });
}

/**
 * Broadcast global analytics/system update
 */
export function broadcastGlobal(event, data) {
  if (!ioInstance) return;
  ioInstance.emit(event, {
    ...data,
    _emittedAt: new Date().toISOString()
  });
}
