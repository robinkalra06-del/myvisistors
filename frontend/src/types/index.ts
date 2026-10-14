export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  personalMeetingCode: string;
  plan?: SubscriptionPlan;
  status?: string;
  createdAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  maxDurationMinutes: number;
  maxParticipants: number;
  cloudRecording: boolean;
  maxStorageMB: number;
  features: string[];
}

export interface Meeting {
  id: string;
  code: string;
  title: string;
  description?: string;
  hostId: string;
  host?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  scheduledAt?: string;
  durationMinutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  isLocked: boolean;
  isWaitingRoom: boolean;
  isScreenShareRestricted: boolean;
  isChatRestricted: boolean;
  hasPasscode: boolean;
  participantCount?: number;
}

export interface Peer {
  socketId: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  role: 'HOST' | 'CO_HOST' | 'PARTICIPANT';
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  stream?: MediaStream;
  isLocal?: boolean;
}

export interface ChatMessage {
  id: string;
  senderSocketId: string;
  senderId?: string | null;
  senderName: string;
  senderAvatar?: string;
  content: string;
  isPrivate: boolean;
  recipientSocketId?: string;
  createdAt: string;
}

export interface LiveCaption {
  id: string;
  senderName: string;
  text: string;
  isFinal: boolean;
}

export interface Recording {
  id: string;
  meetingId: string;
  title: string;
  fileUrl: string;
  fileSize: string;
  durationSeconds: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: string;
  meeting?: {
    code: string;
    title: string;
  };
}
