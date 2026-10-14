"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled server error:', err);
    const status = err.statusCode || err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
};
exports.notFoundHandler = notFoundHandler;
