"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const meeting_routes_1 = __importDefault(require("./routes/meeting.routes"));
const recording_routes_1 = __importDefault(require("./routes/recording.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const meeting_socket_1 = require("./sockets/meeting.socket");
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
const HOST = '0.0.0.0';
const rawClientUrl = process.env.CLIENT_URL || 'https://pulsemeet-frontend-lj4y.onrender.com';
const normalizedClientUrl = rawClientUrl.startsWith('http') ? rawClientUrl : `https://${rawClientUrl}`;
const isAllowedOrigin = (origin) => {
    if (!origin)
        return true;
    if (origin === rawClientUrl ||
        origin === normalizedClientUrl ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')) {
        return true;
    }
    return true; // Permissive for video room attendees across domains
};
// Socket.io configuration
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (origin, callback) => {
            callback(null, isAllowedOrigin(origin));
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 1e8, // 100MB
});
exports.io = io;
// Setup WebRTC and meeting sockets
(0, meeting_socket_1.setupMeetingSockets)(io);
// Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
// Static uploads folder for recordings and avatars
const uploadsPath = path_1.default.join(__dirname, '../uploads');
app.use('/uploads', express_1.default.static(uploadsPath));
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/meetings', meeting_routes_1.default);
app.use('/api/recordings', recording_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/subscriptions', subscription_routes_1.default);
// Error Handling
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Process-level safety logging
process.on('unhandledRejection', (reason) => {
    console.error('[Process] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
});
// Start Server
server.listen(PORT, HOST, () => {
    console.log(`
  🚀 =============================================== 🚀
     PulseMeet Real-time Video Conferencing Server
     Host:            ${HOST}
     Backend Port:    ${PORT}
     Client Origin:   ${rawClientUrl}
     Health Check:    http://${HOST}:${PORT}/api/health
  🚀 =============================================== 🚀
  `);
});
