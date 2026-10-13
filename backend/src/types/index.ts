import { Request } from 'express';
import { UserRole, UserStatus } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export interface PeerInfo {
  socketId: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  role: 'HOST' | 'CO_HOST' | 'PARTICIPANT';
  status: 'WAITING' | 'ADMITTED' | 'REJECTED';
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: Date;
}

export interface RoomState {
  meetingId: string;
  meetingCode: string;
  hostId: string;
  isLocked: boolean;
  isWaitingRoom: boolean;
  isScreenShareRestricted: boolean;
  isChatRestricted: boolean;
  isRecording: boolean;
  recordingStartedAt?: Date;
  activeSpeakerSocketId?: string;
  peers: Map<string, PeerInfo>;
}
