"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuth = exports.requireAuth = void 0;
const token_1 = require("../utils/token");
const client_1 = require("@prisma/client");
const requireAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authentication token missing or invalid' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, token_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid or expired authentication token' });
    }
};
exports.requireAuth = requireAuth;
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = (0, token_1.verifyAccessToken)(token);
            req.user = decoded;
        }
    }
    catch (error) {
        // Ignore error for optional auth
    }
    next();
};
exports.optionalAuth = optionalAuth;
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (req.user.role !== role && req.user.role !== client_1.UserRole.ADMIN) {
            res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
