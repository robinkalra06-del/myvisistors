import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocketServerUrl = (): string => {
  const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('pulsemeet_custom_server_url') : null;
  if (custom) return custom.replace(/\/+$/, '');

  let serverUrl = import.meta.env.VITE_SERVER_URL;
  if (!serverUrl) {
    return 'https://pulsemeet-backend-tjv7.onrender.com';
  }
  if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://') && !serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
    serverUrl = `https://${serverUrl}`;
  }
  return serverUrl.replace(/\/+$/, '');
};

export const getSocket = (): Socket => {
  if (!socket) {
    const serverUrl = getSocketServerUrl();
    socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['polling', 'websocket'],
      upgrade: true,
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
