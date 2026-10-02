import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@livetrack/shared';

let socketInstance = null;
let currentWebsiteId = null;

export const socketService = {
  connect(token) {
    if (socketInstance && socketInstance.connected) {
      return socketInstance;
    }

    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;

    socketInstance = io(socketUrl, {
      auth: { token: token || localStorage.getItem('livetrack_token') },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log('[LiveTrack Socket] Connected with ID:', socketInstance.id);
      if (currentWebsiteId) {
        socketInstance.emit(SOCKET_EVENTS.JOIN_ROOM, { websiteId: currentWebsiteId });
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[LiveTrack Socket] Disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[LiveTrack Socket] Connection error:', err.message);
    });

    return socketInstance;
  },

  joinWebsite(websiteId) {
    currentWebsiteId = websiteId;
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(SOCKET_EVENTS.JOIN_ROOM, { websiteId });
    }
  },

  leaveWebsite(websiteId) {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(SOCKET_EVENTS.LEAVE_ROOM, { websiteId });
    }
    if (currentWebsiteId === websiteId) {
      currentWebsiteId = null;
    }
  },

  on(event, callback) {
    if (!socketInstance) this.connect();
    socketInstance.on(event, callback);
    return () => socketInstance.off(event, callback);
  },

  disconnect() {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  },

  getSocket() {
    return socketInstance;
  }
};
