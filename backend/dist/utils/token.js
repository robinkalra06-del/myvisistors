"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMeetingCode = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokens = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'pulsemeet-access-secret-super-secure-key-2025';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pulsemeet-refresh-secret-super-secure-key-2025';
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const generateTokens = (payload) => {
    const accessToken = jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
    const refreshToken = jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Generate a random Google Meet-style meeting code: abc-defg-hij
 */
const generateMeetingCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const getRand = (len) => {
        let res = '';
        for (let i = 0; i < len; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    };
    return `${getRand(3)}-${getRand(4)}-${getRand(3)}`;
};
exports.generateMeetingCode = generateMeetingCode;
