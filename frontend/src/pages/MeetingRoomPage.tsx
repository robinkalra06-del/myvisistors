import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  PhoneOff,
  MessageSquare,
  Users,
  Info,
  Shield,
  Smile,
  Subtitles,
  Disc,
  Hand,
  Maximize,
  Minimize,
  Pin,
  Lock,
  Unlock,
  Volume2,
  X,
  Send,
  Check,
  Copy,
  UserCheck,
  UserX,
  AlertCircle,
  Sparkles,
  Palette,
  AlertTriangle,
  StopCircle,
  SwitchCamera,
  MoreHorizontal,
  FileText,
  Image as ImageIcon,
  Camera,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSocket, disconnectSocket } from '../services/socket';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Peer, ChatMessage, LiveCaption } from '../types';

// Standard public STUN servers for WebRTC
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.relay.metered.ca:80' },
  ],
  iceCandidatePoolSize: 10,
};

export const MeetingRoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Basic meeting state
  const [meetingTitle, setMeetingTitle] = useState('PulseMeet Conference');
  const [isHost, setIsHost] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isWaitingApproval, setIsWaitingApproval] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [meetingTimeSeconds, setMeetingTimeSeconds] = useState(0);

  // Local media state
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [isVirtualBgOn, setIsVirtualBgOn] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [showMobileMoreSheet, setShowMobileMoreSheet] = useState(false);
  const isMobileDevice = useMemo(() => {
    return typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Remote peers & waiting room
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [waitingUsers, setWaitingUsers] = useState<any[]>([]);

  // Drawers and Modals
  const [activeDrawer, setActiveDrawer] = useState<'chat' | 'participants' | 'info' | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Mobile Presentation & Slide Sharing State
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [presentationSlides, setPresentationSlides] = useState<string[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCanvasPresenting, setIsCanvasPresenting] = useState(false);
  const presentationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const presentationFileInputRef = useRef<HTMLInputElement | null>(null);

  // Chat & Captions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [privateRecipient, setPrivateRecipient] = useState<string | null>(null);
  const [captions, setCaptions] = useState<LiveCaption[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; name: string }[]>([]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidatesQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const canvasAnimationIntervalRef = useRef<any>(null);

  const socket = getSocket();

  // Elapsed timer
  const formattedTime = useMemo(() => {
    const mins = Math.floor(meetingTimeSeconds / 60);
    const secs = meetingTimeSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [meetingTimeSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingTimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync local screen video element
  useEffect(() => {
    if (localScreenVideoRef.current && localScreenStream) {
      localScreenVideoRef.current.srcObject = localScreenStream;
    }
  }, [localScreenStream]);

  // Sync local camera video element
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  });

  // Check which peer is currently presenting (screen sharing)
  const remotePresenter = useMemo(() => {
    for (const peer of peers.values()) {
      if (peer.isScreenSharing && peer.stream) {
        return peer;
      }
    }
    return null;
  }, [peers]);

  // Progressive mobile & Android friendly media acquisition helper
  const acquireMediaStream = async (facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream | null> => {
    // Strategy 1: HD mobile front camera + audio
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e1) {
      console.warn('[Android Media] HD constraints failed, trying relaxed facingMode:', e1);
    }

    // Strategy 2: Relaxed facingMode + basic audio
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: true,
      });
    } catch (e2) {
      console.warn('[Android Media] Relaxed facingMode failed, trying generic video+audio:', e2);
    }

    // Strategy 3: Generic boolean video + audio
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e3) {
      console.warn('[Android Media] Combined acquisition failed, trying sequential Android HAL acquisition:', e3);
    }

    // Strategy 4: Android HAL Sequential Acquisition (Separate Audio then Video)
    let aTrack: MediaStreamTrack | null = null;
    let vTrack: MediaStreamTrack | null = null;

    try {
      const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      aTrack = aStream.getAudioTracks()[0] || null;
    } catch (errA) {
      console.warn('[Android Media] Separate audio failed:', errA);
    }

    try {
      const vStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } } });
      vTrack = vStream.getVideoTracks()[0] || null;
    } catch (errV1) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
        vTrack = vStream.getVideoTracks()[0] || null;
      } catch (errV2) {
        console.warn('[Android Media] Separate video failed:', errV2);
      }
    }

    const activeTracks: MediaStreamTrack[] = [];
    if (aTrack) activeTracks.push(aTrack);
    if (vTrack) activeTracks.push(vTrack);

    if (activeTracks.length > 0) {
      return new MediaStream(activeTracks);
    }

    return null;
  };

  // 1. Initialize Local Media and Join Socket Room
  useEffect(() => {
    if (!code) return;

    let mounted = true;
    const guestName = sessionStorage.getItem('pulsemeet_guest_name') || user?.fullName || 'Guest Participant';
    const initCam = sessionStorage.getItem('pulsemeet_initial_camera') !== 'false';
    const initMic = sessionStorage.getItem('pulsemeet_initial_mic') !== 'false';

    const setupCall = async () => {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError('Camera/Microphone API is not supported in this browser or over insecure HTTP. Please use HTTPS or the PulseMeet Android App.');
        socket.emit('join-room', {
          roomCode: code,
          guestName,
          userId: user?.id,
          avatarUrl: user?.avatarUrl,
        });
        return;
      }

      // Brief delay (100ms) to allow previous hardware camera sessions (e.g. from Lobby) to cleanly release
      await new Promise((res) => setTimeout(res, 100));

      let stream: MediaStream | null = await acquireMediaStream('user');
      if (!stream) {
        setPermissionError('Camera or Microphone was blocked. Tap "Grant / Retry Access" above or check your Android app / browser permissions.');
      }

      // Keep mobile/Android screen awake during call
      if ('wakeLock' in navigator) {
        try {
          (navigator as any).wakeLock.request('screen').catch(() => {});
        } catch (e) {}
      }

      if (!mounted) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;

        // Apply initial toggle preferences
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
          videoTrack.enabled = initCam;
          setIsVideoOff(!initCam);
        } else {
          setIsVideoOff(true);
        }

        if (audioTrack) {
          audioTrack.enabled = initMic;
          setIsAudioMuted(!initMic);
        } else {
          setIsAudioMuted(true);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        setIsVideoOff(true);
        setIsAudioMuted(true);
      }

      // Join room via socket
      socket.emit('join-room', {
        roomCode: code,
        guestName,
        userId: user?.id,
        avatarUrl: user?.avatarUrl,
      });
    };

    setupCall();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      disconnectSocket();
    };
  }, [code, user]);

  // 2. Setup Socket.IO Event Listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('room:joined', (data: any) => {
      setIsWaitingApproval(false);
      setMeetingTitle(data.title || 'PulseMeet Conference');
      setIsHost(data.isHost);
      setIsLocked(data.isLocked);
      setIsRecording(data.isRecording);

      if (data.peers && Array.isArray(data.peers)) {
        data.peers.forEach((peer: Peer) => {
          createPeerConnection(peer.socketId, peer, true);
        });
      }
    });

    socket.on('room:waiting', () => {
      setIsWaitingApproval(true);
    });

    socket.on('room:admitted', (data: any) => {
      setIsWaitingApproval(false);
      if (data.peers && Array.isArray(data.peers)) {
        data.peers.forEach((peer: Peer) => {
          createPeerConnection(peer.socketId, peer, true);
        });
      }
    });

    socket.on('room:rejected', (data: any) => {
      alert(data.message || 'The host declined your entry request.');
      navigate('/');
    });

    socket.on('host:user-waiting', (data: any) => {
      setWaitingUsers((prev) => [...prev, data]);
    });

    socket.on('peer:joined', (newPeer: Peer) => {
      createPeerConnection(newPeer.socketId, newPeer, false);
    });

    socket.on('signal:offer', async ({ senderSocketId, sdp }) => {
      let pc = peerConnections.current.get(senderSocketId);
      if (!pc) {
        pc = createPeerConnection(senderSocketId, { socketId: senderSocketId } as Peer, false);
      }
      try {
        // Handle glare/collision if offer is received in non-stable state
        if (pc.signalingState !== 'stable') {
          try {
            await pc.setLocalDescription({ type: 'rollback' } as any);
          } catch (e) {}
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Drain any queued ICE candidates that arrived before setRemoteDescription
        const queued = iceCandidatesQueue.current.get(senderSocketId) || [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn('Error applying queued ICE candidate:', e);
          }
        }
        iceCandidatesQueue.current.delete(senderSocketId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal:answer', { targetSocketId: senderSocketId, sdp: answer });
      } catch (e) {
        console.error('Error handling signal:offer:', e);
      }
    });

    socket.on('signal:answer', async ({ senderSocketId, sdp }) => {
      const pc = peerConnections.current.get(senderSocketId);
      if (pc) {
        try {
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(`[WebRTC] Ignoring signal:answer for ${senderSocketId} because signalingState is '${pc.signalingState}' (expected 'have-local-offer')`);
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Drain any queued ICE candidates that arrived before setRemoteDescription
          const queued = iceCandidatesQueue.current.get(senderSocketId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn('Error applying queued ICE candidate:', e);
            }
          }
          iceCandidatesQueue.current.delete(senderSocketId);
        } catch (e) {
          console.error('Error handling signal:answer:', e);
        }
      }
    });

    socket.on('signal:ice-candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnections.current.get(senderSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else {
        const queue = iceCandidatesQueue.current.get(senderSocketId) || [];
        queue.push(candidate);
        iceCandidatesQueue.current.set(senderSocketId, queue);
      }
    });

    socket.on('peer:audio-changed', ({ socketId, isMuted }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const p = next.get(socketId);
        if (p) next.set(socketId, { ...p, isAudioMuted: isMuted });
        return next;
      });
    });

    socket.on('peer:video-changed', ({ socketId, isVideoOff }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const p = next.get(socketId);
        if (p) next.set(socketId, { ...p, isVideoOff });
        return next;
      });
    });

    socket.on('peer:screen-changed', ({ socketId, isScreenSharing }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const p = next.get(socketId);
        if (p) next.set(socketId, { ...p, isScreenSharing });
        return next;
      });
    });

    socket.on('peer:hand-raised', ({ socketId, isHandRaised }) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const p = next.get(socketId);
        if (p) next.set(socketId, { ...p, isHandRaised });
        return next;
      });
    });

    socket.on('peer:reaction', ({ emoji, name }) => {
      const id = Math.random().toString();
      setFloatingReactions((prev) => [...prev, { id, emoji, name }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    });

    socket.on('peer:caption', ({ name, text, isFinal }) => {
      const id = Math.random().toString();
      setCaptions((prev) => [...prev.slice(-3), { id, senderName: name, text, isFinal }]);
      setTimeout(() => {
        setCaptions((prev) => prev.filter((c) => c.id !== id));
      }, 5000);
    });

    socket.on('chat:new-message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      if (activeDrawer !== 'chat') {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    socket.on('host:force-mute', () => {
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
        }
      }
      setIsAudioMuted(true);
      socket.emit('user:toggle-audio', { isMuted: true });
      alert('You have been muted by the meeting host.');
    });

    socket.on('host:removed-from-meeting', () => {
      alert('You have been removed from this meeting by the host.');
      navigate('/');
    });

    socket.on('room:lock-changed', ({ isLocked }) => {
      setIsLocked(isLocked);
    });

    socket.on('meeting:ended-by-host', () => {
      setMeetingEnded(true);
    });

    socket.on('recording:status-changed', ({ isRecording }) => {
      setIsRecording(isRecording);
    });

    socket.on('peer:left', ({ socketId }) => {
      const pc = peerConnections.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(socketId);
      }
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:waiting');
      socket.off('room:admitted');
      socket.off('room:rejected');
      socket.off('host:user-waiting');
      socket.off('peer:joined');
      socket.off('signal:offer');
      socket.off('signal:answer');
      socket.off('signal:ice-candidate');
      socket.off('peer:audio-changed');
      socket.off('peer:video-changed');
      socket.off('peer:screen-changed');
      socket.off('peer:hand-raised');
      socket.off('peer:reaction');
      socket.off('peer:caption');
      socket.off('chat:new-message');
      socket.off('host:force-mute');
      socket.off('host:removed-from-meeting');
      socket.off('room:lock-changed');
      socket.off('meeting:ended-by-host');
      socket.off('recording:status-changed');
      socket.off('peer:left');
    };
  }, [socket, activeDrawer]);

  // WebRTC Peer Connection Factory with Deterministic Transceivers
  const createPeerConnection = (targetSocketId: string, peerInfo: Peer, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetSocketId, pc);

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Connection state logging & auto ICE restart
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`[WebRTC] ICE state with ${targetSocketId}: ${pc.iceConnectionState}`);
        try {
          if ((pc as any).restartIce) (pc as any).restartIce();
        } catch (e) {}
      }
    };

    // Remote Track handler: safely accumulates both video and audio tracks with fresh MediaStream instance
    pc.ontrack = (event) => {
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId) || peerInfo;
        const currentTracks = existing.stream ? existing.stream.getTracks() : [];
        const newTrack = event.track;

        // Keep all existing tracks except any previous track of the same kind/ID
        const remainingTracks = currentTracks.filter((t) => t.id !== newTrack.id && t.kind !== newTrack.kind);
        const allTracks = [...remainingTracks, newTrack];

        // Fresh MediaStream instance ensures React useEffect([peer.stream]) triggers on all devices
        const updatedStream = new MediaStream(allTracks);

        next.set(targetSocketId, {
          ...existing,
          stream: updatedStream,
        });
        return next;
      });
    };

    // Deterministic Transceiver setup:
    // ALWAYS create audio transceiver at index 0 and video transceiver at index 1.
    // This strictly adheres to RFC 8829 (JSEP) so SDP m-lines are identical across all peers.
    const audioTrack = localStreamRef.current?.getAudioTracks()[0] || null;
    const videoTrack = (isScreenSharing && screenStreamRef.current?.getVideoTracks()[0]) || localStreamRef.current?.getVideoTracks()[0] || null;

    try {
      pc.addTransceiver(audioTrack || 'audio', {
        direction: 'sendrecv',
        streams: localStreamRef.current ? [localStreamRef.current] : [],
      });
    } catch (e) {
      console.warn('Error adding audio transceiver:', e);
    }

    try {
      pc.addTransceiver(videoTrack || 'video', {
        direction: 'sendrecv',
        streams: localStreamRef.current ? [localStreamRef.current] : [],
      });
    } catch (e) {
      console.warn('Error adding video transceiver:', e);
    }

    // Only the designated initiator creates the offer.
    // The answering peer must NEVER create an offer, which prevents symmetric offer collisions
    // ("Failed to set SSL role for the transport" and m-line order mismatch).
    if (isInitiator) {
      setTimeout(async () => {
        if (pc.signalingState !== 'stable') return;
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          socket.emit('signal:offer', { targetSocketId, sdp: offer });
        } catch (err) {
          console.error('[WebRTC] Initial offer generation error:', err);
        }
      }, 50);
    }

    setPeers((prev) => {
      const next = new Map(prev);
      next.set(targetSocketId, peerInfo);
      return next;
    });

    return pc;
  };

  // Helper to broadcast new/replaced video track to all active peer connections
  const broadcastVideoTrack = async (track: MediaStreamTrack | null) => {
    for (const [targetSocketId, pc] of peerConnections.current.entries()) {
      try {
        const videoTransceiver = pc.getTransceivers().find(
          (t) => t.receiver.track?.kind === 'video' || t.sender.track?.kind === 'video'
        );
        const sender = videoTransceiver?.sender;

        if (sender) {
          await sender.replaceTrack(track);
        }
      } catch (e) {
        console.warn(`Error broadcasting video track to ${targetSocketId}:`, e);
      }
    }
  };

  // Helper to broadcast audio track to all active peer connections
  const broadcastAudioTrack = async (track: MediaStreamTrack | null) => {
    for (const [targetSocketId, pc] of peerConnections.current.entries()) {
      try {
        const audioTransceiver = pc.getTransceivers().find(
          (t) => t.receiver.track?.kind === 'audio' || t.sender.track?.kind === 'audio'
        );
        const sender = audioTransceiver?.sender;

        if (sender) {
          await sender.replaceTrack(track);
        }
      } catch (e) {
        console.warn(`Error broadcasting audio track to ${targetSocketId}:`, e);
      }
    }
  };

  // Toggle Microphone (Turns On/Off or requests permission if missing)
  const handleToggleMic = async () => {
    setPermissionError(null);
    let audioTrack = localStreamRef.current?.getAudioTracks()[0];

    if (isAudioMuted || !audioTrack) {
      // Turn ON mic
      try {
        if (!audioTrack || audioTrack.readyState === 'ended') {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioTrack = micStream.getAudioTracks()[0];

          if (localStreamRef.current) {
            localStreamRef.current.addTrack(audioTrack);
          } else {
            localStreamRef.current = micStream;
          }
          await broadcastAudioTrack(audioTrack);
        }

        audioTrack.enabled = true;
        setIsAudioMuted(false);
        socket.emit('user:toggle-audio', { isMuted: false });
      } catch (err: any) {
        console.error('Microphone toggle error:', err);
        setPermissionError('Could not access microphone. Please check your browser microphone permission.');
      }
    } else {
      // Turn OFF mic
      audioTrack.enabled = false;
      setIsAudioMuted(true);
      socket.emit('user:toggle-audio', { isMuted: true });
    }
  };

  // Toggle Camera (Turns On/Off or requests permission if missing)
  const handleToggleCamera = async () => {
    setPermissionError(null);
    let videoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (isVideoOff || !videoTrack || videoTrack.readyState === 'ended') {
      // Turn ON camera
      try {
        if (!videoTrack || videoTrack.readyState === 'ended') {
          const camStream = await acquireMediaStream(cameraFacingMode);
          videoTrack = camStream?.getVideoTracks()[0] || undefined;

          if (!videoTrack) {
            throw new Error('Camera device is unavailable or blocked');
          }

          if (localStreamRef.current) {
            localStreamRef.current.addTrack(videoTrack);
          } else {
            localStreamRef.current = camStream;
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }

          await broadcastVideoTrack(videoTrack);
        }

        videoTrack.enabled = true;
        setIsVideoOff(false);
        socket.emit('user:toggle-video', { isVideoOff: false });
      } catch (err: any) {
        console.error('Camera toggle error:', err);
        setPermissionError('Could not access camera. Please check your Android or browser permissions.');
      }
    } else {
      // Turn OFF camera
      videoTrack.enabled = false;
      setIsVideoOff(true);
      socket.emit('user:toggle-video', { isVideoOff: true });
    }
  };

  // Request or Retry Camera and Microphone Permissions dynamically
  const handleRequestPermissions = async () => {
    try {
      setPermissionError(null);
      const stream = await acquireMediaStream(cameraFacingMode);
      if (!stream) {
        setPermissionError('Camera and Microphone access was denied. Please check your browser or Android system app permissions.');
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      const audioTrack = stream.getAudioTracks()[0] || null;
      const videoTrack = stream.getVideoTracks()[0] || null;

      if (audioTrack) {
        audioTrack.enabled = true;
        setIsAudioMuted(false);
        await broadcastAudioTrack(audioTrack);
        socket.emit('user:toggle-audio', { isMuted: false });
      }
      if (videoTrack) {
        videoTrack.enabled = true;
        setIsVideoOff(false);
        await broadcastVideoTrack(videoTrack);
        socket.emit('user:toggle-video', { isVideoOff: false });
      }
    } catch (err: any) {
      console.warn('Permission request error:', err);
      setPermissionError('Permission still denied: ' + (err.message || 'Please enable Camera & Microphone in your browser or device settings.'));
    }
  };

  // Flip Camera (Front vs Rear Camera on Android and mobile devices)
  const handleFlipCamera = async () => {
    setPermissionError(null);
    const nextFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';

    try {
      const camStream = await acquireMediaStream(nextFacingMode);
      const newVideoTrack = camStream?.getVideoTracks()[0];

      if (!newVideoTrack) {
        throw new Error('Unable to switch camera device');
      }

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          localStreamRef.current.removeTrack(oldTrack);
        }
        localStreamRef.current.addTrack(newVideoTrack);
      } else {
        localStreamRef.current = camStream;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }

      await broadcastVideoTrack(newVideoTrack);
      setCameraFacingMode(nextFacingMode);
      setIsVideoOff(false);
      socket.emit('user:toggle-video', { isVideoOff: false });
    } catch (err: any) {
      console.warn('Failed to switch camera:', err);
      setPermissionError('Could not flip camera: ' + (err.message || 'Device camera switch failed'));
    }
  };

  // Stop any active presentation (Screen share, Document/Slides, or Document Cam)
  const handleStopPresentation = async () => {
    if (canvasAnimationIntervalRef.current) {
      clearInterval(canvasAnimationIntervalRef.current);
      canvasAnimationIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setLocalScreenStream(null);
    setIsScreenSharing(false);
    setIsCanvasPresenting(false);
    setPresentationSlides([]);
    setCurrentSlideIndex(0);

    // Revert video track to local webcam in peer connections
    const webcamTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    await broadcastVideoTrack(webcamTrack);

    socket.emit('user:toggle-screen', { isScreenSharing: false });
  };

  // Start Device Screen Share (Desktop or supported browser environment)
  const handleStartDeviceScreenShare = async () => {
    setShowPresentationModal(false);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setShowPresentationModal(true);
      setPermissionError('Mobile web browsers restrict OS-level screen capture. Use the PulseMeet Android App (APK) or choose "Present Document & Slides" below to present any file or photo live!');
      return;
    }
    try {
      let screenStream: MediaStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true,
        } as any);
      } catch (audioFallbackErr) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
        } as any);
      }

      screenStreamRef.current = screenStream;
      setLocalScreenStream(screenStream);
      setIsScreenSharing(true);

      const screenTrack = screenStream.getVideoTracks()[0];
      await broadcastVideoTrack(screenTrack);

      screenTrack.onended = () => {
        handleStopPresentation();
      };

      socket.emit('user:toggle-screen', { isScreenSharing: true });
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.warn('Screen sharing error:', err);
        setPermissionError('Screen sharing error: ' + (err.message || 'Permission denied'));
      }
    }
  };

  // Start Document / Slide Presentation via HTML5 Canvas WebRTC Stream (100% Android & Mobile Supported)
  const handleSelectPresentationFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const urls = files.map((f) => URL.createObjectURL(f));
    setPresentationSlides(urls);
    setCurrentSlideIndex(0);
    setShowPresentationModal(false);

    let canvas = presentationCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      presentationCanvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paintSlideToCanvas = (img: HTMLImageElement) => {
      const cvs = presentationCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      const scale = Math.min((cvs.width - 80) / img.width, (cvs.height - 80) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (cvs.width - w) / 2;
      const y = (cvs.height - h) / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.drawImage(img, x, y, w, h);
      ctx.shadowColor = 'transparent';

      if (canvasAnimationIntervalRef.current) clearInterval(canvasAnimationIntervalRef.current);
      canvasAnimationIntervalRef.current = setInterval(() => {
        const c = cvs.getContext('2d');
        if (c && img.complete) {
          c.drawImage(img, x, y, w, h);
        }
      }, 100);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = urls[0];
    img.onload = async () => {
      paintSlideToCanvas(img);

      try {
        const stream = (canvas as any).captureStream(25);
        screenStreamRef.current = stream;
        setLocalScreenStream(stream);
        setIsScreenSharing(true);
        setIsCanvasPresenting(true);

        const track = stream.getVideoTracks()[0];
        await broadcastVideoTrack(track);

        socket.emit('user:toggle-screen', { isScreenSharing: true });
      } catch (err: any) {
        console.error('Canvas captureStream error:', err);
        setPermissionError('Could not start slide presentation: ' + err.message);
      }
    };
  };

  // Change active slide in Canvas Presentation
  const handleSlideChange = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= presentationSlides.length) return;
    setCurrentSlideIndex(newIndex);
    const canvas = presentationCanvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = presentationSlides[newIndex];
    img.onload = () => {
      const cvs = presentationCanvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      const scale = Math.min((cvs.width - 80) / img.width, (cvs.height - 80) / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (cvs.width - w) / 2;
      const y = (cvs.height - h) / 2;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 20;
      ctx.drawImage(img, x, y, w, h);
      ctx.shadowColor = 'transparent';

      if (canvasAnimationIntervalRef.current) clearInterval(canvasAnimationIntervalRef.current);
      canvasAnimationIntervalRef.current = setInterval(() => {
        const c = cvs.getContext('2d');
        if (c && img.complete) {
          c.drawImage(img, x, y, w, h);
        }
      }, 100);
    };
  };

  // Present via Rear Document Camera
  const handleStartCameraPresentation = async () => {
    setShowPresentationModal(false);
    try {
      let camStream: MediaStream;
      try {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: { exact: 'environment' } },
        });
      } catch (exactErr) {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: 'environment' },
        });
      }

      screenStreamRef.current = camStream;
      setLocalScreenStream(camStream);
      setIsScreenSharing(true);

      const track = camStream.getVideoTracks()[0];
      await broadcastVideoTrack(track);

      track.onended = () => {
        handleStopPresentation();
      };

      socket.emit('user:toggle-screen', { isScreenSharing: true });
    } catch (err: any) {
      console.warn('Document camera presentation error:', err);
      setPermissionError('Could not start camera presentation: ' + err.message);
    }
  };

  // Main Toggle Present Handler
  const handleToggleScreenShare = async () => {
    setPermissionError(null);

    if (isScreenSharing) {
      await handleStopPresentation();
    } else {
      if (isMobileDevice || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setShowPresentationModal(true);
      } else {
        await handleStartDeviceScreenShare();
      }
    }
  };

  // Toggle Raise Hand
  const handleToggleRaiseHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    socket.emit('user:raise-hand', { isHandRaised: nextState });
  };

  // Send Floating Emoji Reaction
  const handleSendReaction = (emoji: string) => {
    socket.emit('room:reaction', { emoji });
    setShowEmojiPicker(false);
    if (emoji === '🎉') {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    }
  };

  // Live Speech Captions
  const handleToggleCaptions = () => {
    if (isCaptionsOn) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      setIsCaptionsOn(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Live speech captions are supported on modern Chrome, Edge, and Safari browsers.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalText = event.results[i][0].transcript;
            socket.emit('room:caption', { text: finalText, isFinal: true });
          } else {
            interimText += event.results[i][0].transcript;
          }
        }
        if (interimText) {
          socket.emit('room:caption', { text: interimText, isFinal: false });
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
      setIsCaptionsOn(true);
    }
  };

  // Cloud Recording
  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      socket.emit('recording:stop');
      setIsRecording(false);
    } else {
      try {
        if (!localStreamRef.current && !screenStreamRef.current) {
          alert('Local audio/video stream is required to start recording.');
          return;
        }

        const streamToRecord = screenStreamRef.current || localStreamRef.current!;
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamToRecord, {
          mimeType: 'video/webm;codecs=vp9,opus',
        });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const formData = new FormData();
          formData.append('video', blob, `meeting-${code}-${Date.now()}.webm`);
          formData.append('meetingCode', code || '');
          formData.append('durationSeconds', String(meetingTimeSeconds));
          formData.append('title', `${meetingTitle} - Cloud Recording`);

          try {
            await api.post('/recordings/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert('Cloud recording uploaded and saved to your dashboard successfully!');
          } catch (uploadErr) {
            console.error('Recording upload error:', uploadErr);
          }
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        socket.emit('recording:start');
        setIsRecording(true);
      } catch (recErr) {
        console.error('Recording error:', recErr);
        alert('Could not start recording: ' + recErr);
      }
    }
  };

  // Send Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    socket.emit('chat:message', {
      content: chatInput.trim(),
      isPrivate: !!privateRecipient,
      recipientSocketId: privateRecipient || undefined,
    });

    setChatInput('');
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleAdmitUser = (targetSocketId: string) => {
    socket.emit('host:admit-user', { targetSocketId });
    setWaitingUsers((prev) => prev.filter((u) => u.socketId !== targetSocketId));
  };

  const handleRejectUser = (targetSocketId: string) => {
    socket.emit('host:reject-user', { targetSocketId });
    setWaitingUsers((prev) => prev.filter((u) => u.socketId !== targetSocketId));
  };

  const handleMutePeer = (targetSocketId: string) => {
    socket.emit('host:mute-user', { targetSocketId });
  };

  const handleRemovePeer = (targetSocketId: string) => {
    if (window.confirm('Remove this participant from the conference?')) {
      socket.emit('host:remove-user', { targetSocketId });
    }
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    socket.emit('host:lock-room', { isLocked: nextLocked });
    setIsLocked(nextLocked);
  };

  const handleLeaveMeeting = () => {
    navigate('/dashboard');
  };

  const handleEndMeetingForAll = () => {
    if (window.confirm('Are you sure you want to end this meeting for all participants?')) {
      socket.emit('host:end-meeting');
      navigate('/dashboard');
    }
  };

  // Waiting Room Screen
  if (isWaitingApproval) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 border border-slate-800 text-center space-y-5 shadow-2xl">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold">Waiting Room</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Please wait. The meeting host will admit you to the room shortly.
          </p>
          <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-300">
            Meeting Code: <span className="font-mono text-blue-400">{code}</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
          >
            Cancel & Exit
          </button>
        </div>
      </div>
    );
  }

  // Meeting Ended Screen
  if (meetingEnded) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 border border-slate-800 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-blue-500 mx-auto" />
          <h2 className="text-2xl font-bold">This meeting has ended</h2>
          <p className="text-sm text-slate-400">The organizer has closed this call for all participants.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const allPeersArray = Array.from(peers.values());
  const hasActivePresentation = isScreenSharing || !!remotePresenter;

  return (
    <div className="h-screen h-[100dvh] w-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      
      {/* Top Header Bar */}
      <header className="h-14 px-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur flex items-center justify-between z-20 shrink-0">
        
        {/* Left: Meeting Details */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-200 tracking-tight truncate max-w-[200px] sm:max-w-md">
              {meetingTitle}
            </h2>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
              {code}
            </span>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>REC</span>
            </div>
          )}

          {/* Lock status */}
          {isLocked && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[11px] font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
        </div>

        {/* Right: Timer & Drawers toggles */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 font-mono text-xs">
            {formattedTime}
          </div>

          {/* Waiting room badge for host */}
          {isHost && waitingUsers.length > 0 && (
            <button
              onClick={() => setActiveDrawer('participants')}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-1.5 animate-bounce"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{waitingUsers.length} waiting</span>
            </button>
          )}
        </div>

      </header>

      {/* Permission Warning Banner if device blocked */}
      {permissionError && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{permissionError}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRequestPermissions}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-colors"
            >
              Grant / Retry Access
            </button>
            <button
              onClick={() => setPermissionError(null)}
              className="text-amber-400 hover:text-white underline text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Conference Content & Drawers Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Stage */}
        <main className="flex-1 p-3 sm:p-4 flex flex-col justify-center items-center overflow-y-auto relative">
          
          {/* Floating Reactions Overlay */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-float-up flex flex-col items-center gap-1"
                style={{
                  left: `${45 + (Math.random() * 10)}%`,
                }}
              >
                <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
                <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-full text-slate-200">
                  {r.name}
                </span>
              </div>
            ))}
          </div>

          {/* Live Captions Subtitles Overlay */}
          {isCaptionsOn && captions.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-xl w-full px-4 text-center pointer-events-none">
              <div className="inline-block p-3 rounded-2xl bg-black/85 backdrop-blur border border-white/10 text-white text-sm shadow-2xl">
                {captions.map((c) => (
                  <p key={c.id} className="leading-snug">
                    <span className="text-blue-400 font-semibold">{c.senderName}: </span>
                    <span className={c.isFinal ? 'text-white' : 'text-slate-300 italic'}>{c.text}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN SHARING PRESENTATION LAYOUT */}
          {hasActivePresentation ? (
            <div className="w-full h-full flex flex-col lg:flex-row gap-3">
              
              {/* Large Presentation Stage */}
              <div className="flex-1 rounded-2xl bg-black border border-slate-800 overflow-hidden relative flex flex-col items-center justify-center shadow-2xl">
                
                {/* Header bar on presentation */}
                <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur border border-white/10 text-xs font-semibold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span>
                    {isScreenSharing
                      ? 'You are presenting to everyone'
                      : `${remotePresenter?.name || 'Someone'} is presenting`}
                  </span>
                  {isScreenSharing && (
                    <button
                      onClick={handleToggleScreenShare}
                      className="ml-2 px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <StopCircle className="w-3 h-3" /> Stop
                    </button>
                  )}
                </div>

                {isScreenSharing ? (
                  <video
                    ref={localScreenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <RemoteScreenShareView stream={remotePresenter?.stream} />
                )}

                {/* Floating slide navigation bar for presenter */}
                {isCanvasPresenting && presentationSlides.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl flex items-center gap-2.5 text-xs">
                    <button
                      onClick={() => handleSlideChange(currentSlideIndex - 1)}
                      disabled={currentSlideIndex === 0}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-medium"
                    >
                      ← Prev
                    </button>
                    <span className="font-mono text-slate-300 font-semibold text-[11px]">
                      Slide {currentSlideIndex + 1} of {presentationSlides.length}
                    </span>
                    <button
                      onClick={() => handleSlideChange(currentSlideIndex + 1)}
                      disabled={currentSlideIndex === presentationSlides.length - 1}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-medium"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>

              {/* Side Strip of Participant Video Tiles */}
              <div className="lg:w-64 flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto shrink-0">
                
                {/* Local Webcam Tile */}
                <div className="w-44 lg:w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative shrink-0">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`}
                  />
                  {isVideoOff && (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                        {(user?.fullName || 'Y').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-[10px]">
                    You {isAudioMuted ? '🔇' : ''}
                  </div>
                </div>

                {/* Peer Tiles */}
                {allPeersArray.map((peer) => (
                  <div key={peer.socketId} className="w-44 lg:w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative shrink-0">
                    <RemoteVideoTile
                      peer={peer}
                      isHost={isHost}
                      onMute={() => handleMutePeer(peer.socketId)}
                      onRemove={() => handleRemovePeer(peer.socketId)}
                    />
                  </div>
                ))}

              </div>

            </div>
          ) : (
            /* STANDARD RESPONSIVE VIDEO GRID */
            <div
              className={`w-full h-full max-w-6xl max-h-full grid gap-3 sm:gap-4 items-center justify-center ${
                allPeersArray.length === 0
                  ? 'grid-cols-1 max-w-2xl'
                  : allPeersArray.length === 1
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : allPeersArray.length <= 3
                  ? 'grid-cols-2'
                  : allPeersArray.length <= 5
                  ? 'grid-cols-2 sm:grid-cols-3'
                  : 'grid-cols-3 sm:grid-cols-4'
              }`}
            >
              
              {/* 1. Self Video Tile */}
              <div
                className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group shadow-md transition-all ${
                  isHandRaised ? 'ring-2 ring-amber-500' : ''
                }`}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    isVideoOff ? 'hidden' : 'block'
                  } ${isVirtualBgOn ? 'filter blur-sm brightness-110' : ''}`}
                />

                {isVideoOff && (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold shadow-lg">
                    {(user?.fullName || 'Y').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Status Tags */}
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-xs font-medium flex items-center gap-1.5">
                  <span>{user?.fullName || 'You'} (You)</span>
                  {isAudioMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                {isHandRaised && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold flex items-center gap-1 animate-bounce">
                    <Hand className="w-3.5 h-3.5" />
                    <span>Hand Raised</span>
                  </div>
                )}
              </div>

              {/* 2. Remote Peer Video Tiles */}
              {allPeersArray.map((peer) => (
                <RemoteVideoTile
                  key={peer.socketId}
                  peer={peer}
                  isHost={isHost}
                  onMute={() => handleMutePeer(peer.socketId)}
                  onRemove={() => handleRemovePeer(peer.socketId)}
                />
              ))}

            </div>
          )}

        </main>

        {/* Collapsible Drawers (Chat, Participants, Info) */}
        {activeDrawer === 'chat' && (
          <aside className="fixed md:relative inset-y-0 right-0 w-full sm:w-96 border-l border-slate-800 bg-slate-900 flex flex-col z-50 animate-in slide-in-from-right duration-200 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>In-Call Messages</span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No messages yet. Send a message to participants in this meeting.
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-200">{msg.senderName}</span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.isPrivate && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 text-[10px]">Private</span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-800 text-xs text-slate-100 break-words">
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder={privateRecipient ? 'Private message...' : 'Send a message to everyone...'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}

        {activeDrawer === 'participants' && (
          <aside className="fixed md:relative inset-y-0 right-0 w-full sm:w-96 border-l border-slate-800 bg-slate-900 flex flex-col z-50 animate-in slide-in-from-right duration-200 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>People ({allPeersArray.length + 1})</span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              
              {isHost && waitingUsers.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-900/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span>Waiting Room ({waitingUsers.length})</span>
                  </div>
                  {waitingUsers.map((u) => (
                    <div key={u.socketId} className="flex items-center justify-between py-1.5">
                      <span className="text-xs font-medium text-slate-200 truncate">{u.name}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdmitUser(u.socketId)}
                          className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold"
                        >
                          Admit
                        </button>
                        <button
                          onClick={() => handleRejectUser(u.socketId)}
                          className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                      {(user?.fullName || 'Y').charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold">{user?.fullName || 'You'} (You)</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    {isAudioMuted ? <MicOff className="w-3.5 h-3.5 text-rose-500" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>

                {allPeersArray.map((peer) => (
                  <div key={peer.socketId} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-xs transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                        {(peer.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-200">{peer.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {peer.isAudioMuted ? (
                        <MicOff className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      )}

                      {isHost && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleMutePeer(peer.socketId)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                            title="Mute Participant"
                          >
                            <MicOff className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRemovePeer(peer.socketId)}
                            className="p-1 hover:bg-rose-900/60 rounded text-rose-400"
                            title="Remove from meeting"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </aside>
        )}

        {activeDrawer === 'info' && (
          <aside className="fixed md:relative inset-y-0 right-0 w-full sm:w-96 border-l border-slate-800 bg-slate-900 flex flex-col z-50 animate-in slide-in-from-right duration-200 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Meeting Details</span>
              </h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Meeting Code</span>
                <span className="font-mono text-sm font-bold text-blue-400">{code}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Joining Link</span>
                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-xl">
                  <span className="truncate text-slate-300 font-mono text-[11px]">{window.location.href}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Meeting link copied to clipboard!');
                    }}
                    className="p-1 text-blue-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-slate-400 leading-relaxed">
                  People who join with this link can speak, view shared presentations, and chat with all participants.
                </p>
              </div>
            </div>
          </aside>
        )}

      </div>

      {/* Bottom Meeting Controls Bar (Responsive: Mobile Row & Desktop Row) */}
      <footer className="h-20 px-3 sm:px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-30 shrink-0">
        
        {/* DESKTOP LAYOUT (>= md screens) */}
        <div className="hidden md:flex items-center justify-between w-full">
          {/* Left info pill */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono font-medium">{formattedTime}</span>
            <span>|</span>
            <span className="font-mono">{code}</span>
          </div>

          {/* Desktop Center Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 mx-auto">
            {/* Mic toggle */}
            <button
              onClick={handleToggleMic}
              className={`p-3.5 rounded-full transition-all shadow-md ${
                isAudioMuted
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isAudioMuted ? 'Turn on microphone' : 'Turn off microphone'}
            >
              {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Camera toggle */}
            <button
              onClick={handleToggleCamera}
              className={`p-3.5 rounded-full transition-all shadow-md ${
                isVideoOff
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={handleToggleScreenShare}
              className={`p-3.5 rounded-full transition-all shadow-md ${
                isScreenSharing
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isScreenSharing ? 'Stop presenting' : 'Present now'}
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Raise Hand */}
            <button
              onClick={handleToggleRaiseHand}
              className={`p-3.5 rounded-full transition-all shadow-md ${
                isHandRaised
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            >
              <Hand className="w-5 h-5" />
            </button>

            {/* Reactions Picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all shadow-md"
                title="Send a reaction"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex items-center gap-2 z-50 animate-in fade-in zoom-in-95">
                  {['❤️', '👏', '👍', '🎉', '🔥', '😂'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="p-2 text-2xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Live Captions */}
            <button
              onClick={handleToggleCaptions}
              className={`p-3.5 rounded-full transition-all shadow-md ${
                isCaptionsOn
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title={isCaptionsOn ? 'Turn off captions' : 'Turn on captions'}
            >
              <Subtitles className="w-5 h-5" />
            </button>

            {/* Background Blur */}
            <button
              onClick={() => setIsVirtualBgOn(!isVirtualBgOn)}
              className={`p-3.5 rounded-full transition-all shadow-md ${
                isVirtualBgOn
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
              title="Toggle background blur"
            >
              <Palette className="w-5 h-5" />
            </button>

            {/* Cloud Recording (Host) */}
            {isHost && (
              <button
                onClick={handleToggleRecording}
                className={`p-3.5 rounded-full transition-all shadow-md ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
                title={isRecording ? 'Stop Cloud Recording' : 'Start Cloud Recording'}
              >
                <Disc className="w-5 h-5" />
              </button>
            )}

            {/* Leave / End Call */}
            <button
              onClick={isHost ? handleEndMeetingForAll : handleLeaveMeeting}
              className="px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
              title="Leave call"
            >
              <PhoneOff className="w-4 h-4" />
              <span>{isHost ? 'End for All' : 'Leave'}</span>
            </button>
          </div>

          {/* Desktop Right Drawer Action Triggers */}
          <div className="flex items-center gap-2">
            {isHost && (
              <button
                onClick={() => setShowSecurityModal(true)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Host Safety Controls"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setActiveDrawer(activeDrawer === 'info' ? null : 'info')}
              className={`p-3 rounded-xl border border-slate-700 transition-colors ${
                activeDrawer === 'info' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Meeting details"
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
              className={`p-3 rounded-xl border border-slate-700 transition-colors relative ${
                activeDrawer === 'participants' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="People"
            >
              <Users className="w-4 h-4" />
              {waitingUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveDrawer(activeDrawer === 'chat' ? null : 'chat');
                setUnreadChatCount(0);
              }}
              className={`p-3 rounded-xl border border-slate-700 transition-colors relative ${
                activeDrawer === 'chat' ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Chat with everyone"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                  {unreadChatCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MOBILE LAYOUT (< md screens: Android & iPhone) */}
        <div className="flex md:hidden items-center justify-between w-full px-1">
          {/* Mobile Mic */}
          <button
            onClick={handleToggleMic}
            className={`p-3 rounded-full transition-all shadow-md ${
              isAudioMuted
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-white border border-slate-700'
            }`}
            title="Toggle Mic"
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Mobile Camera */}
          <button
            onClick={handleToggleCamera}
            className={`p-3 rounded-full transition-all shadow-md ${
              isVideoOff
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-white border border-slate-700'
            }`}
            title="Toggle Camera"
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Mobile Screen / Presentation Share Button */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-full transition-all shadow-md ${
              isScreenSharing
                ? 'bg-blue-600 text-white shadow-blue-500/30'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
            title="Share Screen or Document"
          >
            <Share2 className="w-5 h-5 text-blue-400" />
          </button>

          {/* Mobile Flip Camera (Front/Rear switch) */}
          {!isVideoOff && (
            <button
              onClick={handleFlipCamera}
              className="p-3 rounded-full bg-slate-800 text-slate-200 border border-slate-700 transition-all shadow-md active:rotate-180 duration-200"
              title="Flip Front/Rear Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}

          {/* Mobile In-Call Chat */}
          <button
            onClick={() => {
              setActiveDrawer(activeDrawer === 'chat' ? null : 'chat');
              setUnreadChatCount(0);
            }}
            className={`p-3 rounded-full border border-slate-700 transition-colors relative ${
              activeDrawer === 'chat' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-500 text-white">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Mobile More Options (...) */}
          <button
            onClick={() => setShowMobileMoreSheet(!showMobileMoreSheet)}
            className={`p-3 rounded-full border border-slate-700 transition-all ${
              showMobileMoreSheet ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
            title="More Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Mobile Leave Button */}
          <button
            onClick={isHost ? handleEndMeetingForAll : handleLeaveMeeting}
            className="p-3 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 transition-all"
            title="Leave call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

      </footer>

      {/* MOBILE MORE OPTIONS BOTTOM SHEET */}
      {showMobileMoreSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-150">
          <div
            className="absolute inset-0"
            onClick={() => setShowMobileMoreSheet(false)}
          />
          <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            
            {/* Handle drag bar */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-slate-200">More Activities</span>
              <button onClick={() => setShowMobileMoreSheet(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reaction Emoji Strip */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-800/80">
              {['❤️', '👏', '👍', '🎉', '🔥', '😂'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleSendReaction(emoji);
                    setShowMobileMoreSheet(false);
                  }}
                  className="p-2 text-2xl active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Grid of Action Cards */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-medium">
              
              <button
                onClick={() => {
                  handleToggleScreenShare();
                  setShowMobileMoreSheet(false);
                }}
                className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-all ${
                  isScreenSharing ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
                }`}
              >
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>{isScreenSharing ? 'Stop Presenting' : 'Share Screen'}</span>
              </button>

              <button
                onClick={() => {
                  handleToggleRaiseHand();
                  setShowMobileMoreSheet(false);
                }}
                className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-all ${
                  isHandRaised ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
                }`}
              >
                <Hand className="w-4 h-4 text-amber-400" />
                <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveDrawer('participants');
                  setShowMobileMoreSheet(false);
                }}
                className="p-3 rounded-2xl flex items-center gap-2.5 bg-slate-800/70 border border-slate-700/60 text-slate-200"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>People ({allPeersArray.length + 1})</span>
              </button>

              <button
                onClick={() => {
                  handleToggleCaptions();
                  setShowMobileMoreSheet(false);
                }}
                className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-all ${
                  isCaptionsOn ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
                }`}
              >
                <Subtitles className="w-4 h-4 text-purple-400" />
                <span>{isCaptionsOn ? 'Captions On' : 'Live Captions'}</span>
              </button>

              <button
                onClick={() => {
                  setIsVirtualBgOn(!isVirtualBgOn);
                  setShowMobileMoreSheet(false);
                }}
                className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-all ${
                  isVirtualBgOn ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
                }`}
              >
                <Palette className="w-4 h-4 text-purple-400" />
                <span>Blur Background</span>
              </button>

              <button
                onClick={() => {
                  setActiveDrawer('info');
                  setShowMobileMoreSheet(false);
                }}
                className="p-3 rounded-2xl flex items-center gap-2.5 bg-slate-800/70 border border-slate-700/60 text-slate-200"
              >
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Meeting Info</span>
              </button>

              {isHost && (
                <>
                  <button
                    onClick={() => {
                      setShowSecurityModal(true);
                      setShowMobileMoreSheet(false);
                    }}
                    className="p-3 rounded-2xl flex items-center gap-2.5 bg-slate-800/70 border border-slate-700/60 text-slate-200"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Host Safety</span>
                  </button>

                  <button
                    onClick={() => {
                      handleToggleRecording();
                      setShowMobileMoreSheet(false);
                    }}
                    className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-all ${
                      isRecording ? 'bg-rose-600/20 border-rose-500 text-rose-400 animate-pulse' : 'bg-slate-800/70 border-slate-700/60 text-slate-200'
                    }`}
                  >
                    <Disc className="w-4 h-4 text-rose-400" />
                    <span>{isRecording ? 'Stop Recording' : 'Record Call'}</span>
                  </button>
                </>
              )}

            </div>

          </div>
        </div>
      )}

      {/* File input for mobile slides / documents / photos */}
      <input
        id="mobile-presentation-file-input"
        ref={presentationFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleSelectPresentationFiles}
      />

      {/* Presentation Mode Selection Modal (Full Android & Mobile Support) */}
      {showPresentationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Choose What to Present</h3>
              </div>
              <button
                onClick={() => setShowPresentationModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Select how you'd like to share your content with the meeting participants:
            </p>

            <div className="space-y-3">
              {/* Option 1: Present Documents, Slides & Photos (Direct native Android file picker) */}
              <label
                htmlFor="mobile-presentation-file-input"
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/30 hover:from-blue-900/60 hover:to-indigo-900/50 border border-blue-500/40 text-left flex items-start gap-3.5 transition-all group cursor-pointer block"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white group-hover:text-blue-300">
                      Present Photos, Slides & Files
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Works on Android
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Tap to select presentation slides, PDF pages, photos, or screenshots from your phone to stream live.
                  </p>
                </div>
              </label>

              {/* Option 2: Present via Rear Camera (Document Cam) */}
              <button
                onClick={handleStartCameraPresentation}
                className="w-full p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left flex items-start gap-3.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white group-hover:text-purple-300">
                      Present via Document Camera
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Stream your phone's rear camera as the main presentation screen to show physical notes, products, or paper documents.
                  </p>
                </div>
              </button>

              {/* Option 3: Entire Device Screen */}
              <button
                onClick={handleStartDeviceScreenShare}
                className="w-full p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-left flex items-start gap-3.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700/40 border border-slate-600/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Share2 className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-white">
                      Entire Device Screen
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Desktop / PWA
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Cast your entire system display or application window (Supported on desktop & native wrappers).
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowPresentationModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Safety Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Meeting Safety Controls</span>
              </h3>
              <button onClick={() => setShowSecurityModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800">
                <div>
                  <span className="font-semibold block">Lock Meeting</span>
                  <span className="text-[11px] text-slate-400">Prevent new participants from joining</span>
                </div>
                <button
                  onClick={handleToggleLock}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                    isLocked ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isLocked ? 'Locked' : 'Unlock'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800">
                <div>
                  <span className="font-semibold block">Mute All Participants</span>
                  <span className="text-[11px] text-slate-400">Force mute everyone except yourself</span>
                </div>
                <button
                  onClick={() => socket.emit('host:mute-all')}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-xs"
                >
                  Mute All
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSecurityModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-xs font-semibold hover:bg-blue-700 mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component: Remote Video Tile with dedicated continuous audio playback
const RemoteVideoTile: React.FC<{
  peer: Peer;
  isHost: boolean;
  onMute: () => void;
  onRemove: () => void;
}> = ({ peer, isHost, onMute, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (peer.stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = peer.stream;
        videoRef.current.play().catch((e) => console.warn('[Video] Remote play catch:', e));
      }
      if (audioRef.current) {
        audioRef.current.srcObject = peer.stream;
        audioRef.current.play().catch((e) => console.warn('[Audio] Remote play catch:', e));
      }
    }
  }, [peer.stream]);

  return (
    <div
      className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center group shadow-md transition-all ${
        peer.isHandRaised ? 'ring-2 ring-amber-500' : ''
      }`}
    >
      {/* Dedicated audio element handles unmuted audio playback cleanly */}
      <audio ref={audioRef} autoPlay playsInline />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${peer.isVideoOff ? 'opacity-0 pointer-events-none absolute' : 'block'}`}
      />

      {peer.isVideoOff && (
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg">
          {(peer.name || 'P').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name tag and mic indicator */}
      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur text-xs font-medium flex items-center gap-1.5">
        <span>{peer.name}</span>
        {peer.isAudioMuted ? (
          <MicOff className="w-3.5 h-3.5 text-rose-500" />
        ) : (
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
        )}
      </div>

      {peer.isHandRaised && (
        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold flex items-center gap-1 animate-bounce">
          <Hand className="w-3.5 h-3.5" />
          <span>Hand Raised</span>
        </div>
      )}
    </div>
  );
};

// Sub-component: Remote Screen Share Presentation Player
const RemoteScreenShareView: React.FC<{ stream?: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn('Screen share autoplay catch:', e));
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain bg-black"
    />
  );
};
