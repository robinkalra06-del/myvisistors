import { Server, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { PeerInfo, RoomState } from '../types';
import { MeetingStatus, ParticipantRole, ParticipantStatus } from '@prisma/client';

// In-memory room state mapping: roomCode -> RoomState
const rooms = new Map<string, RoomState>();
// Waiting rooms: roomCode -> Map<socketId, PeerInfo>
const waitingRooms = new Map<string, Map<string, PeerInfo>>();

export const setupMeetingSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let peerId = socket.id;

    // 1. Join Room Handler
    socket.on('join-room', async (data: {
      roomCode: string;
      guestName: string;
      userId?: string;
      avatarUrl?: string;
      passcode?: string;
    }) => {
      try {
        const { roomCode, guestName, userId, avatarUrl } = data;
        currentRoomCode = roomCode;

        // Fetch meeting from database
        const meeting = await prisma.meeting.findUnique({
          where: { code: roomCode },
          include: { host: true },
        });

        if (!meeting) {
          socket.emit('error:room', { message: 'Meeting room does not exist' });
          return;
        }

        if (meeting.status === MeetingStatus.ENDED) {
          socket.emit('error:room', { message: 'This meeting has already ended' });
          return;
        }

        const isHost = meeting.hostId === userId;
        const role: ParticipantRole = isHost ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT;

        // Initialize room state if not already in memory
        if (!rooms.has(roomCode)) {
          rooms.set(roomCode, {
            meetingId: meeting.id,
            meetingCode: roomCode,
            hostId: meeting.hostId,
            isLocked: meeting.isLocked,
            isWaitingRoom: meeting.isWaitingRoom,
            isScreenShareRestricted: meeting.isScreenShareRestricted,
            isChatRestricted: meeting.isChatRestricted,
            isRecording: false,
            peers: new Map<string, PeerInfo>(),
          });
        }

        const room = rooms.get(roomCode)!;

        // Check if meeting is locked
        if (room.isLocked && !isHost) {
          socket.emit('error:room', { message: 'This meeting is locked by the host.' });
          return;
        }

        const peerInfo: PeerInfo = {
          socketId: socket.id,
          userId,
          name: guestName || 'Guest Participant',
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(guestName || 'G')}`,
          role: role as any,
          status: 'ADMITTED',
          isAudioMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isHandRaised: false,
          joinedAt: new Date(),
        };

        // Check waiting room policy
        if (room.isWaitingRoom && !isHost) {
          peerInfo.status = 'WAITING';

          if (!waitingRooms.has(roomCode)) {
            waitingRooms.set(roomCode, new Map());
          }
          waitingRooms.get(roomCode)!.set(socket.id, peerInfo);

          // Tell the joining client to wait
          socket.emit('room:waiting', {
            message: 'Waiting for the meeting host to admit you into the call...',
          });

          // Notify host(s) in the room
          io.to(roomCode).emit('host:user-waiting', {
            socketId: socket.id,
            name: peerInfo.name,
            avatarUrl: peerInfo.avatarUrl,
            joinedAt: peerInfo.joinedAt,
          });

          return;
        }

        // Add to active room
        room.peers.set(socket.id, peerInfo);
        socket.join(roomCode);

        // Record participant in database
        try {
          await prisma.meetingParticipant.create({
            data: {
              meetingId: meeting.id,
              userId: userId || null,
              guestName: peerInfo.name,
              role,
              status: ParticipantStatus.ADMITTED,
              joinedAt: new Date(),
            },
          });
        } catch (dbErr) {
          console.warn('Could not record participant in DB:', dbErr);
        }

        // Send room details and existing peers list to the newly joined peer
        const existingPeers = Array.from(room.peers.values()).filter((p) => p.socketId !== socket.id);
        socket.emit('room:joined', {
          roomCode,
          meetingId: meeting.id,
          title: meeting.title,
          isHost,
          myPeerInfo: peerInfo,
          peers: existingPeers,
          isLocked: room.isLocked,
          isRecording: room.isRecording,
          isScreenShareRestricted: room.isScreenShareRestricted,
          isChatRestricted: room.isChatRestricted,
        });

        // Broadcast to all other peers in the room that a new participant arrived
        socket.to(roomCode).emit('peer:joined', peerInfo);

      } catch (err: any) {
        console.error('join-room error:', err);
        socket.emit('error:room', { message: 'Failed to join meeting room' });
      }
    });

    // 2. Host Admits User from Waiting Room
    socket.on('host:admit-user', async (data: { targetSocketId: string }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const waitingMap = waitingRooms.get(currentRoomCode);

      if (!room || !waitingMap) return;

      const targetPeer = waitingMap.get(data.targetSocketId);
      if (!targetPeer) return;

      waitingMap.delete(data.targetSocketId);
      targetPeer.status = 'ADMITTED';
      room.peers.set(data.targetSocketId, targetPeer);

      const targetSocket = io.sockets.sockets.get(data.targetSocketId);
      if (targetSocket) {
        targetSocket.join(currentRoomCode);

        const existingPeers = Array.from(room.peers.values()).filter((p) => p.socketId !== data.targetSocketId);
        targetSocket.emit('room:admitted', {
          roomCode: currentRoomCode,
          myPeerInfo: targetPeer,
          peers: existingPeers,
          isRecording: room.isRecording,
        });

        // Notify other room participants
        targetSocket.to(currentRoomCode).emit('peer:joined', targetPeer);
      }
    });

    // 3. Host Rejects User from Waiting Room
    socket.on('host:reject-user', (data: { targetSocketId: string }) => {
      if (!currentRoomCode) return;
      const waitingMap = waitingRooms.get(currentRoomCode);
      if (waitingMap) {
        waitingMap.delete(data.targetSocketId);
      }
      io.to(data.targetSocketId).emit('room:rejected', {
        message: 'The meeting host declined your request to join.',
      });
    });

    // 4. WebRTC Signaling: Offer, Answer, ICE Candidate
    socket.on('signal:offer', (data: { targetSocketId: string; sdp: any }) => {
      io.to(data.targetSocketId).emit('signal:offer', {
        senderSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on('signal:answer', (data: { targetSocketId: string; sdp: any }) => {
      io.to(data.targetSocketId).emit('signal:answer', {
        senderSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on('signal:ice-candidate', (data: { targetSocketId: string; candidate: any }) => {
      io.to(data.targetSocketId).emit('signal:ice-candidate', {
        senderSocketId: socket.id,
        candidate: data.candidate,
      });
    });

    // 5. Track & Media Toggles
    socket.on('user:toggle-audio', (data: { isMuted: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);
      if (peer) {
        peer.isAudioMuted = data.isMuted;
        socket.to(currentRoomCode).emit('peer:audio-changed', {
          socketId: socket.id,
          isMuted: data.isMuted,
        });
      }
    });

    socket.on('user:toggle-video', (data: { isVideoOff: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);
      if (peer) {
        peer.isVideoOff = data.isVideoOff;
        socket.to(currentRoomCode).emit('peer:video-changed', {
          socketId: socket.id,
          isVideoOff: data.isVideoOff,
        });
      }
    });

    socket.on('user:toggle-screen', (data: { isScreenSharing: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);
      if (peer) {
        peer.isScreenSharing = data.isScreenSharing;
        socket.to(currentRoomCode).emit('peer:screen-changed', {
          socketId: socket.id,
          isScreenSharing: data.isScreenSharing,
        });
      }
    });

    socket.on('user:raise-hand', (data: { isHandRaised: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);
      if (peer) {
        peer.isHandRaised = data.isHandRaised;
        io.to(currentRoomCode).emit('peer:hand-raised', {
          socketId: socket.id,
          name: peer.name,
          isHandRaised: data.isHandRaised,
        });
      }
    });

    // 6. Real-Time Reactions & Emojis
    socket.on('room:reaction', (data: { emoji: string }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);
      io.to(currentRoomCode).emit('peer:reaction', {
        socketId: socket.id,
        name: peer?.name || 'Participant',
        emoji: data.emoji,
      });
    });

    // 7. Live Captions / Speech-to-Text
    socket.on('room:caption', (data: { text: string; isFinal: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);
      socket.to(currentRoomCode).emit('peer:caption', {
        socketId: socket.id,
        name: peer?.name || 'Speaker',
        text: data.text,
        isFinal: data.isFinal,
      });
    });

    // 8. Meeting Chat
    socket.on('chat:message', async (data: {
      content: string;
      isPrivate?: boolean;
      recipientSocketId?: string;
    }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      const peer = room?.peers.get(socket.id);

      if (room?.isChatRestricted && peer?.role !== 'HOST' && peer?.role !== 'CO_HOST') {
        socket.emit('chat:error', { message: 'Chat is restricted to hosts only.' });
        return;
      }

      const messagePayload = {
        id: 'msg-' + Math.random().toString(36).substring(2, 10),
        senderSocketId: socket.id,
        senderId: peer?.userId || null,
        senderName: peer?.name || 'Participant',
        senderAvatar: peer?.avatarUrl,
        content: data.content,
        isPrivate: !!data.isPrivate,
        recipientSocketId: data.recipientSocketId,
        createdAt: new Date().toISOString(),
      };

      if (data.isPrivate && data.recipientSocketId) {
        // Send to recipient and sender only
        io.to(data.recipientSocketId).emit('chat:new-message', messagePayload);
        socket.emit('chat:new-message', messagePayload);
      } else {
        // Broadcast to whole room
        io.to(currentRoomCode).emit('chat:new-message', messagePayload);
      }

      // Persist to database asynchronously
      try {
        if (room?.meetingId) {
          await prisma.chatMessage.create({
            data: {
              meetingId: room.meetingId,
              senderId: peer?.userId || null,
              senderName: peer?.name || 'Participant',
              senderAvatar: peer?.avatarUrl,
              content: data.content,
              isPrivate: !!data.isPrivate,
              recipientId: data.recipientSocketId || null,
            },
          });
        }
      } catch (e) {
        // Non-blocking
      }
    });

    // 9. Host Moderation Actions
    socket.on('host:mute-user', (data: { targetSocketId: string }) => {
      if (!currentRoomCode) return;
      io.to(data.targetSocketId).emit('host:force-mute');
    });

    socket.on('host:mute-all', () => {
      if (!currentRoomCode) return;
      socket.to(currentRoomCode).emit('host:force-mute');
    });

    socket.on('host:remove-user', (data: { targetSocketId: string }) => {
      if (!currentRoomCode) return;
      io.to(data.targetSocketId).emit('host:removed-from-meeting');
      const targetSocket = io.sockets.sockets.get(data.targetSocketId);
      if (targetSocket) {
        targetSocket.leave(currentRoomCode);
      }
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.peers.delete(data.targetSocketId);
        io.to(currentRoomCode).emit('peer:left', { socketId: data.targetSocketId });
      }
    });

    socket.on('host:lock-room', (data: { isLocked: boolean }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.isLocked = data.isLocked;
        io.to(currentRoomCode).emit('room:lock-changed', { isLocked: data.isLocked });
      }
    });

    socket.on('host:end-meeting', async () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);

      io.to(currentRoomCode).emit('meeting:ended-by-host');

      if (room?.meetingId) {
        try {
          await prisma.meeting.update({
            where: { id: room.meetingId },
            data: { status: MeetingStatus.ENDED, endedAt: new Date() },
          });
        } catch (e) {
          console.warn('Error updating meeting status to ENDED in DB:', e);
        }
      }

      rooms.delete(currentRoomCode);
      waitingRooms.delete(currentRoomCode);
    });

    // 10. Recording Status Broadcasts
    socket.on('recording:start', () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.isRecording = true;
        room.recordingStartedAt = new Date();
        io.to(currentRoomCode).emit('recording:status-changed', {
          isRecording: true,
          startedAt: room.recordingStartedAt,
        });
      }
    });

    socket.on('recording:stop', () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.isRecording = false;
        io.to(currentRoomCode).emit('recording:status-changed', {
          isRecording: false,
        });
      }
    });

    // 11. Disconnect Cleanup
    socket.on('disconnect', () => {
      if (currentRoomCode) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.peers.delete(socket.id);
          socket.to(currentRoomCode).emit('peer:left', { socketId: socket.id });

          // If room empty, clean up
          if (room.peers.size === 0) {
            rooms.delete(currentRoomCode);
          }
        }

        const waitingMap = waitingRooms.get(currentRoomCode);
        if (waitingMap) {
          waitingMap.delete(socket.id);
        }
      }
    });
  });
};
