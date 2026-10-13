import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { UserStatus, UserRole, MeetingStatus, TicketStatus } from '@prisma/client';

export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: UserStatus.ACTIVE } });
    const totalMeetings = await prisma.meeting.count();
    const liveMeetings = await prisma.meeting.count({ where: { status: MeetingStatus.LIVE } });
    const totalRecordings = await prisma.recording.count();

    // Calculate total storage
    const recordings = await prisma.recording.findMany({ select: { fileSize: true } });
    const totalStorageBytes = recordings.reduce((acc, r) => acc + BigInt(r.fileSize), BigInt(0));

    // Subscription counts
    const planCounts = await prisma.userSubscription.groupBy({
      by: ['planId'],
      _count: { userId: true },
    });

    const plans = await prisma.subscriptionPlan.findMany();
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving admin stats', error: error.message });
  }
};

export const getAdminUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status } = req.query;

    const users = await prisma.user.findMany({
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
          role ? { role: role as UserRole } : {},
          status ? { status: status as UserStatus } : {},
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
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, role } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'UPDATE_USER_ACCOUNT',
        resourceType: 'USER',
        resourceId: id,
        detailsJson: JSON.stringify({ updatedTo: { status, role } }),
      },
    });

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === req.user?.userId) {
      res.status(400).json({ message: 'Cannot delete your own administrative account' });
      return;
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'DELETE_USER',
        resourceType: 'USER',
        resourceId: id,
      },
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const getLiveMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetings = await prisma.meeting.findMany({
      where: { status: MeetingStatus.LIVE },
      include: {
        host: { select: { id: true, fullName: true, email: true } },
        participants: { where: { leftAt: null } },
      },
      orderBy: { startedAt: 'desc' },
    });

    res.status(200).json({ meetings });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching live meetings', error: error.message });
  }
};

export const terminateMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.ENDED,
        endedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'ADMIN_TERMINATE_MEETING',
        resourceType: 'MEETING',
        resourceId: id,
        detailsJson: JSON.stringify({ code: meeting.code }),
      },
    });

    res.status(200).json({ message: 'Meeting terminated by administrator' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error terminating meeting', error: error.message });
  }
};

export const updateSubscriptionPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      priceMonthly,
      maxDurationMinutes,
      maxParticipants,
      cloudRecording,
      maxStorageMB,
      isActive,
      featuresJson,
    } = req.body;

    const plan = await prisma.subscriptionPlan.update({
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

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'UPDATE_PLAN_SETTINGS',
        resourceType: 'SUBSCRIPTION_PLAN',
        resourceId: id,
      },
    });

    res.status(200).json({ message: 'Subscription plan updated successfully', plan });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating plan', error: error.message });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });

    res.status(200).json({ logs });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
};
