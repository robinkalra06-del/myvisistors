"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.updateSubscriptionPlan = exports.terminateMeeting = exports.getLiveMeetings = exports.deleteUser = exports.updateUserStatus = exports.getAdminUsers = exports.getAdminStats = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await prisma_1.prisma.user.count();
        const activeUsers = await prisma_1.prisma.user.count({ where: { status: client_1.UserStatus.ACTIVE } });
        const totalMeetings = await prisma_1.prisma.meeting.count();
        const liveMeetings = await prisma_1.prisma.meeting.count({ where: { status: client_1.MeetingStatus.LIVE } });
        const totalRecordings = await prisma_1.prisma.recording.count();
        // Calculate total storage
        const recordings = await prisma_1.prisma.recording.findMany({ select: { fileSize: true } });
        const totalStorageBytes = recordings.reduce((acc, r) => acc + BigInt(r.fileSize), BigInt(0));
        // Subscription counts
        const planCounts = await prisma_1.prisma.userSubscription.groupBy({
            by: ['planId'],
            _count: { userId: true },
        });
        const plans = await prisma_1.prisma.subscriptionPlan.findMany();
        const planDistribution = plans.map((p) => {
            const match = planCounts.find((pc) => pc.planId === p.id);
            return {
                name: p.name,
                code: p.code,
                userCount: match?._count.userId || 0,
            };
        });
        res.status(200).json({
            totalUsers,
            activeUsers,
            totalMeetings,
            liveMeetings,
            totalRecordings,
            totalStorageBytes: totalStorageBytes.toString(),
            totalStorageMB: Math.round(Number(totalStorageBytes) / (1024 * 1024)),
            planDistribution,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving admin stats', error: error.message });
    }
};
exports.getAdminStats = getAdminStats;
const getAdminUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        const users = await prisma_1.prisma.user.findMany({
            where: {
                AND: [
                    search
                        ? {
                            OR: [
                                { fullName: { contains: String(search) } },
                                { email: { contains: String(search) } },
                            ],
                        }
                        : {},
                    role ? { role: role } : {},
                    status ? { status: status } : {},
                ],
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                avatarUrl: true,
                role: true,
                status: true,
                personalMeetingCode: true,
                createdAt: true,
                _count: {
                    select: { meetings: true, recordings: true },
                },
                subscriptions: {
                    where: { status: 'ACTIVE' },
                    include: { plan: true },
                },
            },
        });
        res.status(200).json({ users });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};
exports.getAdminUsers = getAdminUsers;
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, role } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data: {
                ...(status ? { status } : {}),
                ...(role ? { role } : {}),
            },
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE_USER_ACCOUNT',
                resourceType: 'USER',
                resourceId: id,
                detailsJson: JSON.stringify({ updatedTo: { status, role } }),
            },
        });
        res.status(200).json({ message: 'User updated successfully', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user?.userId) {
            res.status(400).json({ message: 'Cannot delete your own administrative account' });
            return;
        }
        await prisma_1.prisma.user.delete({ where: { id } });
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'DELETE_USER',
                resourceType: 'USER',
                resourceId: id,
            },
        });
        res.status(200).json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};
exports.deleteUser = deleteUser;
const getLiveMeetings = async (req, res) => {
    try {
        const meetings = await prisma_1.prisma.meeting.findMany({
            where: { status: client_1.MeetingStatus.LIVE },
            include: {
                host: { select: { id: true, fullName: true, email: true } },
                participants: { where: { leftAt: null } },
            },
            orderBy: { startedAt: 'desc' },
        });
        res.status(200).json({ meetings });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching live meetings', error: error.message });
    }
};
exports.getLiveMeetings = getLiveMeetings;
const terminateMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await prisma_1.prisma.meeting.update({
            where: { id },
            data: {
                status: client_1.MeetingStatus.ENDED,
                endedAt: new Date(),
            },
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'ADMIN_TERMINATE_MEETING',
                resourceType: 'MEETING',
                resourceId: id,
                detailsJson: JSON.stringify({ code: meeting.code }),
            },
        });
        res.status(200).json({ message: 'Meeting terminated by administrator' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error terminating meeting', error: error.message });
    }
};
exports.terminateMeeting = terminateMeeting;
const updateSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, priceMonthly, maxDurationMinutes, maxParticipants, cloudRecording, maxStorageMB, isActive, featuresJson, } = req.body;
        const plan = await prisma_1.prisma.subscriptionPlan.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(priceMonthly !== undefined ? { priceMonthly: Number(priceMonthly) } : {}),
                ...(maxDurationMinutes !== undefined ? { maxDurationMinutes: Number(maxDurationMinutes) } : {}),
                ...(maxParticipants !== undefined ? { maxParticipants: Number(maxParticipants) } : {}),
                ...(cloudRecording !== undefined ? { cloudRecording: Boolean(cloudRecording) } : {}),
                ...(maxStorageMB !== undefined ? { maxStorageMB: Number(maxStorageMB) } : {}),
                ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
                ...(featuresJson !== undefined ? { featuresJson: typeof featuresJson === 'string' ? featuresJson : JSON.stringify(featuresJson) } : {}),
            },
        });
        await prisma_1.prisma.auditLog.create({
            data: {
                userId: req.user?.userId,
                action: 'UPDATE_PLAN_SETTINGS',
                resourceType: 'SUBSCRIPTION_PLAN',
                resourceId: id,
            },
        });
        res.status(200).json({ message: 'Subscription plan updated successfully', plan });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating plan', error: error.message });
    }
};
exports.updateSubscriptionPlan = updateSubscriptionPlan;
const getAuditLogs = async (req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                user: { select: { fullName: true, email: true } },
            },
        });
        res.status(200).json({ logs });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
    }
};
exports.getAuditLogs = getAuditLogs;
