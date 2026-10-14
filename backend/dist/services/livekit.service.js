"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiveKitServerUrl = exports.generateLiveKitToken = void 0;
const livekit_server_sdk_1 = require("livekit-server-sdk");
const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secretkeypulsemeet1234567890abcdef';
const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const generateLiveKitToken = async (params) => {
    const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
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
exports.generateLiveKitToken = generateLiveKitToken;
const getLiveKitServerUrl = () => {
    return livekitUrl;
};
exports.getLiveKitServerUrl = getLiveKitServerUrl;
