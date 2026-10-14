import { AccessToken } from 'livekit-server-sdk';

const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretkeypulsemeet1234567890abcdef';
const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

export interface GenerateLiveKitTokenParams {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  isHost?: boolean;
}

export const generateLiveKitToken = async (params: GenerateLiveKitTokenParams): Promise<string> => {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.participantIdentity,
    name: params.participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: !!params.isHost,
  });

  return await at.toJwt();
};

export const getLiveKitServerUrl = () => {
  return livekitUrl;
};
