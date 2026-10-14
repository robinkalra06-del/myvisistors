import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    let serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
    if (serverUrl && !serverUrl.startsWith('http://') && !serverUrl.startsWith('https://') && !serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
      serverUrl = `https://${serverUrl}`;
    }
    socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
