"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.updateProfile = exports.getMe = exports.refreshToken = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const token_1 = require("../utils/token");
const client_1 = require("@prisma/client");
const register = async (req, res) => {
    try {
        const { email, password, fullName, avatarUrl } = req.body;
        if (!email || !password || !fullName) {
            res.status(400).json({ message: 'Email, password, and full name are required' });
            return;
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ message: 'An account with this email already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const personalMeetingCode = `meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
        // Get default free plan
        const freePlan = await prisma_1.prisma.subscriptionPlan.findFirst({
            where: { code: 'FREE' },
        });
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
                role: client_1.UserRole.USER,
                status: client_1.UserStatus.ACTIVE,
                isVerified: true,
                personalMeetingCode,
            },
        });
        // Assign free subscription
        if (freePlan) {
            await prisma_1.prisma.userSubscription.create({
                data: {
                    userId: user.id,
                    planId: freePlan.id,
                    status: client_1.SubscriptionStatus.ACTIVE,
                },
            });
        }
        const tokens = (0, token_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                personalMeetingCode: user.personalMeetingCode,
            },
            ...tokens,
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering account', error: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
                subscriptions: {
                    where: { status: client_1.SubscriptionStatus.ACTIVE },
                    include: { plan: true },
                },
            },
        });
        if (!user) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        if (user.status === client_1.UserStatus.SUSPENDED) {
            res.status(403).json({ message: 'Your account has been suspended. Please contact administrator.' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }
        const tokens = (0, token_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        const activePlan = user.subscriptions[0]?.plan || null;
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                personalMeetingCode: user.personalMeetingCode,
                plan: activePlan,
            },
            ...tokens,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ message: 'Refresh token is required' });
            return;
        }
        const decoded = (0, token_1.verifyRefreshToken)(refreshToken);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || user.status === client_1.UserStatus.SUSPENDED) {
            res.status(403).json({ message: 'Invalid user or account suspended' });
            return;
        }
        const tokens = (0, token_1.generateTokens)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        res.status(200).json(tokens);
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
};
exports.refreshToken = refreshToken;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                status: true,
                personalMeetingCode: true,
                createdAt: true,
                subscriptions: {
                    where: { status: client_1.SubscriptionStatus.ACTIVE },
                    include: { plan: true },
                },
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const activePlan = user.subscriptions[0]?.plan || null;
        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                status: user.status,
                personalMeetingCode: user.personalMeetingCode,
                createdAt: user.createdAt,
                plan: activePlan,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving profile', error: error.message });
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { fullName, avatarUrl } = req.body;
        const updated = await prisma_1.prisma.user.update({
            where: { id: req.user.userId },
            data: {
                ...(fullName ? { fullName } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                personalMeetingCode: true,
            },
        });
        res.status(200).json({ message: 'Profile updated successfully', user: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Both current and new password are required' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Current password is incorrect' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        res.status(200).json({ message: 'Password changed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }
    // Safe mock reset token simulation
    res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been dispatched.',
        mockResetToken: 'reset-' + Math.random().toString(36).substring(2, 10),
    });
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
        res.status(400).json({ message: 'Email and new password are required' });
        return;
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
    await prisma_1.prisma.user.updateMany({
        where: { email },
        data: { password: hashedPassword },
    });
    res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
};
exports.resetPassword = resetPassword;
