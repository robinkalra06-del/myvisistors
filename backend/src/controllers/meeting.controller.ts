import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { generateMeetingCode } from '../utils/token';
import { generateLiveKitToken } from '../services/livekit.service';
import { MeetingStatus, ParticipantRole, ParticipantStatus } from '@prisma/client';

export const createInstantMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let hostId = req.user?.userId;

    // If anonymous, assign to default demo host or create anonymous record
    if (!hostId) {
      const demoHost = await prisma.user.findFirst({ where: { role: 'USER' } });
      if (!demoHost) {
        res.status(500).json({ message: 'No host user configured' });
        return;
      }
      hostId = demoHost.id;
    }

    const { title, isWaitingRoom, passcode } = req.body;
    let code = generateMeetingCode();

    // Ensure uniqueness
    let exists = await prisma.meeting.findUnique({ where: { code } });
    while (exists) {
      code = generateMeetingCode();
      exists = await prisma.meeting.findUnique({ where: { code } });
    }

    const meeting = await prisma.meeting.create({
      data: {
        code,
        title: title || 'Instant Video Meeting',
        hostId,
        status: MeetingStatus.LIVE,
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
  } catch (error: any) {
    console.error('Create instant meeting error:', error);
    res.status(500).json({ message: 'Error starting instant meeting', error: error.message });
  }
};

export const scheduleMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required to schedule meetings' });
      return;
    }

    const {
      title,
      description,
      scheduledAt,
      durationMinutes,
      passcode,
      isWaitingRoom,
      isScreenShareRestricted,
      isChatRestricted,
      inviteeEmails,
    } = req.body;

    if (!title || !scheduledAt) {
      res.status(400).json({ message: 'Meeting title and scheduled time are required' });
      return;
    }

    let code = generateMeetingCode();
    let exists = await prisma.meeting.findUnique({ where: { code } });
    while (exists) {
      code = generateMeetingCode();
      exists = await prisma.meeting.findUnique({ where: { code } });
    }

    const meeting = await prisma.meeting.create({
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
        status: MeetingStatus.SCHEDULED,
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
          await prisma.meetingInvitation.create({
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
  } catch (error: any) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({ message: 'Error scheduling meeting', error: error.message });
  }
};

export const getMeetingByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { code },
      include: {
        host: {
          select: { id: true, fullName: true, avatarUrl: true, email: true },
        },
        participants: {
          where: { status: ParticipantStatus.ADMITTED, leftAt: null },
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching meeting', error: error.message });
  }
};

export const verifyPasscode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { passcode } = req.body;

    const meeting = await prisma.meeting.findUnique({ where: { code } });
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
    } else {
      res.status(400).json({ valid: false, message: 'Incorrect passcode' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error verifying passcode', error: error.message });
  }
};

export const getMyMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = req.user.userId;
    const now = new Date();

    const upcoming = await prisma.meeting.findMany({
      where: {
        hostId: userId,
        status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.LIVE] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        invitations: true,
        participants: {
          select: { id: true, guestName: true, role: true },
        },
      },
    });

    const past = await prisma.meeting.findMany({
      where: {
        hostId: userId,
        status: MeetingStatus.ENDED,
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching meetings', error: error.message });
  }
};

export const updateMeetingSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { code } = req.params;
    const { isLocked, isWaitingRoom, isScreenShareRestricted, isChatRestricted } = req.body;

    const meeting = await prisma.meeting.findUnique({ where: { code } });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    if (meeting.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only the meeting host can change these settings' });
      return;
    }

    const updated = await prisma.meeting.update({
      where: { code },
      data: {
        ...(isLocked !== undefined ? { isLocked } : {}),
        ...(isWaitingRoom !== undefined ? { isWaitingRoom } : {}),
        ...(isScreenShareRestricted !== undefined ? { isScreenShareRestricted } : {}),
        ...(isChatRestricted !== undefined ? { isChatRestricted } : {}),
      },
    });

    res.status(200).json({ message: 'Settings updated successfully', meeting: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating meeting settings', error: error.message });
  }
};

export const endMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { code } = req.params;
    const meeting = await prisma.meeting.findUnique({ where: { code } });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    if (meeting.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Only the host or administrator can end the meeting' });
      return;
    }

    const updated = await prisma.meeting.update({
      where: { code },
      data: {
        status: MeetingStatus.ENDED,
        endedAt: new Date(),
      },
    });

    res.status(200).json({ message: 'Meeting ended successfully', meeting: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error ending meeting', error: error.message });
  }
};

export const deleteScheduledMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    if (meeting.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.meeting.delete({ where: { id } });
    res.status(200).json({ message: 'Scheduled meeting canceled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting meeting', error: error.message });
  }
};

export const getLiveKitTokenForMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const { participantName } = req.query;

    const meeting = await prisma.meeting.findUnique({ where: { code } });
    if (!meeting) {
      res.status(404).json({ message: 'Meeting not found' });
      return;
    }

    const isHost = req.user?.userId === meeting.hostId;
    const identity = req.user?.userId || `guest-${Math.random().toString(36).substring(2, 9)}`;
    const name = (participantName as string) || req.user?.email || 'Guest Participant';

    const token = await generateLiveKitToken({
      roomName: code,
      participantIdentity: identity,
      participantName: name,
      isHost,
    });

    res.status(200).json({ token, isHost });
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating livekit token', error: error.message });
  }
};
