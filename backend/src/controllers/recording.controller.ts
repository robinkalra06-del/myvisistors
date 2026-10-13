import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { RecordingStatus } from '@prisma/client';

export const uploadRecording = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No recording video file provided' });
      return;
    }

    const { meetingCode, durationSeconds, title } = req.body;
    let hostId = req.user?.userId;

    let meeting = null;
    if (meetingCode) {
      meeting = await prisma.meeting.findUnique({ where: { code: meetingCode } });
    }

    if (!hostId && meeting) {
      hostId = meeting.hostId;
    }

    if (!hostId) {
      const demoUser = await prisma.user.findFirst();
      hostId = demoUser?.id || '';
    }

    const fileUrl = `/uploads/recordings/${req.file.filename}`;
    const fileSize = BigInt(req.file.size);
    const parsedDuration = durationSeconds ? parseInt(durationSeconds, 10) : 0;

    const recording = await prisma.recording.create({
      data: {
        meetingId: meeting?.id || '',
        hostId,
        title: title || `${meeting?.title || 'Video Meeting'} - Recording`,
        fileUrl,
        storageKey: req.file.filename,
        fileSize,
        durationSeconds: parsedDuration,
        status: RecordingStatus.READY,
      },
    });

    res.status(201).json({
      message: 'Recording saved successfully',
      recording: {
        ...recording,
        fileSize: recording.fileSize.toString(),
      },
    });
  } catch (error: any) {
    console.error('Upload recording error:', error);
    res.status(500).json({ message: 'Error uploading recording', error: error.message });
  }
};

export const getRecordings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const recordings = await prisma.recording.findMany({
      where: req.user?.role === 'ADMIN' ? {} : userId ? { hostId: userId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        meeting: {
          select: { code: true, title: true, startedAt: true, endedAt: true },
        },
        host: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    const serialized = recordings.map((rec) => ({
      ...rec,
      fileSize: rec.fileSize.toString(),
    }));

    res.status(200).json({ recordings: serialized });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving recordings', error: error.message });
  }
};

export const getRecordingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        meeting: { select: { code: true, title: true } },
        host: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    if (!recording) {
      res.status(404).json({ message: 'Recording not found' });
      return;
    }

    res.status(200).json({
      recording: {
        ...recording,
        fileSize: recording.fileSize.toString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving recording', error: error.message });
  }
};

export const deleteRecording = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const recording = await prisma.recording.findUnique({ where: { id } });

    if (!recording) {
      res.status(404).json({ message: 'Recording not found' });
      return;
    }

    if (recording.hostId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Try deleting file from disk
    if (recording.storageKey) {
      const filePath = path.join(__dirname, '../../uploads/recordings', recording.storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.recording.delete({ where: { id } });
    res.status(200).json({ message: 'Recording deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting recording', error: error.message });
  }
};
