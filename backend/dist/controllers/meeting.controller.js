"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveKitTokenForMeeting = exports.deleteScheduledMeeting = exports.endMeeting = exports.updateMeetingSettings = exports.getMyMeetings = exports.verifyPasscode = exports.getMeetingByCode = exports.scheduleMeeting = exports.createInstantMeeting = void 0;
const prisma_1 = require("../config/prisma");
const token_1 = require("../utils/token");
const livekit_service_1 = require("../services/livekit.service");
const client_1 = require("@prisma/client");
const createInstantMeeting = async (req, res) => {
    try {
        let hostId = req.user?.userId;
        // If anonymous, assign to default demo host or create anonymous record
        if (!hostId) {
            const demoHost = await prisma_1.prisma.user.findFirst({ where: { role: 'USER' } });
            if (!demoHost) {
                res.status(500).json({ message: 'No host user configured' });
                return;
            }
            hostId = demoHost.id;
        }
        const { title, isWaitingRoom, passcode } = req.body;
        let code = (0, token_1.generateMeetingCode)();
        // Ensure uniqueness
        let exists = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        while (exists) {
            code = (0, token_1.generateMeetingCode)();
            exists = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        }
        const meeting = await prisma_1.prisma.meeting.create({
            data: {
                code,
                title: title || 'Instant Video Meeting',
                hostId,
                status: client_1.MeetingStatus.LIVE,
                startedAt: new Date(),
                isWaitingRoom: !!isWaitingRoom,
                passcode: passcode || null,
            },
            include: {
                host: {
                    select: { id: true, fullName: true, avatarUrl: true },
                },
            },
        });
        res.status(201).json({
            message: 'Instant meeting started',
            meeting: {
                id: meeting.id,
                code: meeting.code,
                title: meeting.title,
                status: meeting.status,
                hostId: meeting.hostId,
                host: meeting.host,
                isWaitingRoom: meeting.isWaitingRoom,
                hasPasscode: !!meeting.passcode,
            },
        });
    }
    catch (error) {
        console.error('Create instant meeting error:', error);
        res.status(500).json({ message: 'Error starting instant meeting', error: error.message });
    }
};
exports.createInstantMeeting = createInstantMeeting;
const scheduleMeeting = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required to schedule meetings' });
            return;
        }
        const { title, description, scheduledAt, durationMinutes, passcode, isWaitingRoom, isScreenShareRestricted, isChatRestricted, inviteeEmails, } = req.body;
        if (!title || !scheduledAt) {
            res.status(400).json({ message: 'Meeting title and scheduled time are required' });
            return;
        }
        let code = (0, token_1.generateMeetingCode)();
        let exists = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        while (exists) {
            code = (0, token_1.generateMeetingCode)();
            exists = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        }
        const meeting = await prisma_1.prisma.meeting.create({
            data: {
                code,
                title,
                description,
                hostId: req.user.userId,
                scheduledAt: new Date(scheduledAt),
                durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
                passcode: passcode || null,
                isWaitingRoom: !!isWaitingRoom,
                isScreenShareRestricted: !!isScreenShareRestricted,
                isChatRestricted: !!isChatRestricted,
                status: client_1.MeetingStatus.SCHEDULED,
            },
            include: {
                host: {
                    select: { id: true, fullName: true, avatarUrl: true },
                },
            },
        });
        // Create invitations if provided
        if (inviteeEmails && Array.isArray(inviteeEmails)) {
            for (const email of inviteeEmails) {
                if (email && typeof email === 'string') {
                    await prisma_1.prisma.meetingInvitation.create({
                        data: {
                            meetingId: meeting.id,
                            email: email.trim().toLowerCase(),
                        },
                    });
                }
            }
        }
        res.status(201).json({
            message: 'Meeting scheduled successfully',
            meeting,
        });
    }
    catch (error) {
        console.error('Schedule meeting error:', error);
        res.status(500).json({ message: 'Error scheduling meeting', error: error.message });
    }
};
exports.scheduleMeeting = scheduleMeeting;
const getMeetingByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const meeting = await prisma_1.prisma.meeting.findUnique({
            where: { code },
            include: {
                host: {
                    select: { id: true, fullName: true, avatarUrl: true, email: true },
                },
                participants: {
                    where: { status: client_1.ParticipantStatus.ADMITTED, leftAt: null },
                    select: {
                        id: true,
                        guestName: true,
                        role: true,
                        isMuted: true,
                        isVideoOff: true,
                    },
                },
            },
        });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found. Please check the meeting code.' });
            return;
        }
        res.status(200).json({
            id: meeting.id,
            code: meeting.code,
            title: meeting.title,
            description: meeting.description,
            hostId: meeting.hostId,
            host: meeting.host,
            scheduledAt: meeting.scheduledAt,
            durationMinutes: meeting.durationMinutes,
            status: meeting.status,
            isLocked: meeting.isLocked,
            isWaitingRoom: meeting.isWaitingRoom,
            isScreenShareRestricted: meeting.isScreenShareRestricted,
            isChatRestricted: meeting.isChatRestricted,
            hasPasscode: !!meeting.passcode,
            participantCount: meeting.participants.length,
            activeParticipants: meeting.participants,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching meeting', error: error.message });
    }
};
exports.getMeetingByCode = getMeetingByCode;
const verifyPasscode = async (req, res) => {
    try {
        const { code } = req.params;
        const { passcode } = req.body;
        const meeting = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        if (!meeting.passcode) {
            res.status(200).json({ valid: true, message: 'No passcode required' });
            return;
        }
        if (meeting.passcode === passcode) {
            res.status(200).json({ valid: true, message: 'Passcode verified' });
        }
        else {
            res.status(400).json({ valid: false, message: 'Incorrect passcode' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error verifying passcode', error: error.message });
    }
};
exports.verifyPasscode = verifyPasscode;
const getMyMeetings = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const userId = req.user.userId;
        const now = new Date();
        const upcoming = await prisma_1.prisma.meeting.findMany({
            where: {
                hostId: userId,
                status: { in: [client_1.MeetingStatus.SCHEDULED, client_1.MeetingStatus.LIVE] },
            },
            orderBy: { scheduledAt: 'asc' },
            include: {
                invitations: true,
                participants: {
                    select: { id: true, guestName: true, role: true },
                },
            },
        });
        const past = await prisma_1.prisma.meeting.findMany({
            where: {
                hostId: userId,
                status: client_1.MeetingStatus.ENDED,
            },
            orderBy: { endedAt: 'desc' },
            take: 20,
            include: {
                recordings: true,
                participants: {
                    select: { id: true, guestName: true },
                },
            },
        });
        res.status(200).json({ upcoming, past });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching meetings', error: error.message });
    }
};
exports.getMyMeetings = getMyMeetings;
const updateMeetingSettings = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { code } = req.params;
        const { isLocked, isWaitingRoom, isScreenShareRestricted, isChatRestricted } = req.body;
        const meeting = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        if (meeting.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only the meeting host can change these settings' });
            return;
        }
        const updated = await prisma_1.prisma.meeting.update({
            where: { code },
            data: {
                ...(isLocked !== undefined ? { isLocked } : {}),
                ...(isWaitingRoom !== undefined ? { isWaitingRoom } : {}),
                ...(isScreenShareRestricted !== undefined ? { isScreenShareRestricted } : {}),
                ...(isChatRestricted !== undefined ? { isChatRestricted } : {}),
            },
        });
        res.status(200).json({ message: 'Settings updated successfully', meeting: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating meeting settings', error: error.message });
    }
};
exports.updateMeetingSettings = updateMeetingSettings;
const endMeeting = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { code } = req.params;
        const meeting = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        if (meeting.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Only the host or administrator can end the meeting' });
            return;
        }
        const updated = await prisma_1.prisma.meeting.update({
            where: { code },
            data: {
                status: client_1.MeetingStatus.ENDED,
                endedAt: new Date(),
            },
        });
        res.status(200).json({ message: 'Meeting ended successfully', meeting: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error ending meeting', error: error.message });
    }
};
exports.endMeeting = endMeeting;
const deleteScheduledMeeting = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { id } = req.params;
        const meeting = await prisma_1.prisma.meeting.findUnique({ where: { id } });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        if (meeting.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await prisma_1.prisma.meeting.delete({ where: { id } });
        res.status(200).json({ message: 'Scheduled meeting canceled successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting meeting', error: error.message });
    }
};
exports.deleteScheduledMeeting = deleteScheduledMeeting;
const getLiveKitTokenForMeeting = async (req, res) => {
    try {
        const { code } = req.params;
        const { participantName } = req.query;
        const meeting = await prisma_1.prisma.meeting.findUnique({ where: { code } });
        if (!meeting) {
            res.status(404).json({ message: 'Meeting not found' });
            return;
        }
        const isHost = req.user?.userId === meeting.hostId;
        const identity = req.user?.userId || `guest-${Math.random().toString(36).substring(2, 9)}`;
        const name = participantName || req.user?.email || 'Guest Participant';
        const token = await (0, livekit_service_1.generateLiveKitToken)({
            roomName: code,
            participantIdentity: identity,
            participantName: name,
            isHost,
        });
        res.status(200).json({ token, isHost });
    }
    catch (error) {
        res.status(500).json({ message: 'Error generating livekit token', error: error.message });
    }
};
exports.getLiveKitTokenForMeeting = getLiveKitTokenForMeeting;
