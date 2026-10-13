import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import meetingRoutes from './routes/meeting.routes';
import recordingRoutes from './routes/recording.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { setupMeetingSockets } from './sockets/meeting.socket';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100MB
});

// Setup WebRTC and meeting sockets
setupMeetingSockets(io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Static uploads folder for recordings and avatars
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PulseMeet API & Real-time Signaling Engine',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
server.listen(PORT, () => {
  console.log(`
  🚀 =============================================== 🚀
     PulseMeet Real-time Video Conferencing Server
     Backend Port:    ${PORT}
     Client Origin:   ${CLIENT_URL}
     Health Check:    http://localhost:${PORT}/api/health
     Database:        MySQL (meet_db)
  🚀 =============================================== 🚀
  `);
});

export { app, server, io };
