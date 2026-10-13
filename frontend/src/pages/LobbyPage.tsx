import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Shield,
  Lock,
  ArrowRight,
  Clock,
  Sparkles,
  Volume2,
  Users,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Meeting } from '../types';

export const LobbyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Media states
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [guestName, setGuestName] = useState(user?.fullName || '');
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Device selectors
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Fetch meeting info
  useEffect(() => {
    if (!code) return;
    api.get(`/meetings/${code}`)
      .then((res) => {
        setMeeting(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Meeting not found');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  // 2. Initialize camera & mic preview
  useEffect(() => {
    let active = true;

    const startLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoInput ? { deviceId: { exact: selectedVideoInput } } : true,
          audio: selectedAudioInput ? { deviceId: { exact: selectedAudioInput } } : true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup audio visualizer meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!active) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
        } catch (audioErr) {
          console.warn('Audio meter initialization skipped:', audioErr);
        }

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter((d) => d.kind === 'audioinput'));
        setVideoInputDevices(devices.filter((d) => d.kind === 'videoinput'));
      } catch (err) {
        console.warn('Camera/Mic permission error in green room:', err);
      }
    };

    startLocalStream();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedAudioInput, selectedVideoInput]);

  // Toggle video track
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    } else {
      setIsCameraOn(!isCameraOn);
    }
  };

  // Toggle audio track
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  // Join Action
  const handleJoin = async () => {
    if (meeting?.hasPasscode) {
      try {
        const verifyRes = await api.post(`/meetings/${code}/verify-passcode`, { passcode });
        if (!verifyRes.data.valid) {
          setPasscodeError('Incorrect meeting passcode');
          return;
        }
      } catch (err: any) {
        setPasscodeError(err.response?.data?.message || 'Invalid passcode');
        return;
      }
    }

    // Save preferences in session storage to carry into the meeting room
    sessionStorage.setItem('pulsemeet_guest_name', guestName.trim() || user?.fullName || 'Guest Participant');
    sessionStorage.setItem('pulsemeet_initial_camera', String(isCameraOn));
    sessionStorage.setItem('pulsemeet_initial_mic', String(isMicOn));
    sessionStorage.setItem('pulsemeet_passcode', passcode);

    navigate(`/meet/${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center space-y-4">
          <Shield className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Unable to Join Meeting</h2>
          <p className="text-sm text-slate-400">{error || 'This meeting code is invalid or has expired.'}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Video Preview Tile & Controls */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          <div className="relative w-full aspect-video rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
            
            {/* Live Camera Preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${!isCameraOn ? 'hidden' : 'block'}`}
            />

            {/* Camera Off Avatar Fallback */}
            {!isCameraOn && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-bold shadow-lg">
                  {(guestName || user?.fullName || 'G').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-slate-400 font-medium">Camera is turned off</span>
              </div>
            )}

            {/* Audio level meter indicator */}
            {isMicOn && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* Device Settings Gear */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur border border-white/10 text-slate-300 hover:text-white hover:bg-black/80 transition-colors"
              title="Audio & Video Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Bottom floating toggle bar */}
            <div className="absolute bottom-4 flex items-center gap-4">
              <button
                onClick={toggleMic}
                className={`p-3.5 rounded-full shadow-lg transition-all ${
                  isMicOn
                    ? 'bg-slate-800/90 text-white hover:bg-slate-700 border border-white/10'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-full shadow-lg transition-all ${
                  isCameraOn
                    ? 'bg-slate-800/90 text-white hover:bg-slate-700 border border-white/10'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
                title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>

          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            Review your audio and video before entering the room.
          </p>

        </div>

        {/* Right: Meeting Details & Join Card */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
                {meeting.status === 'LIVE' ? 'Meeting in Progress' : 'Ready to Connect'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">{meeting.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Hosted by <span className="text-slate-200 font-semibold">{meeting.host?.fullName || 'Organizer'}</span>
            </p>
          </div>

          {/* Meeting badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {meeting.isWaitingRoom && (
              <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80">
                Waiting Room Active
              </span>
            )}
            {meeting.hasPasscode && (
              <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Passcode Protected
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Code: {meeting.code}
            </span>
          </div>

          {/* Input fields */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Name</label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {meeting.hasPasscode && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Meeting Passcode</label>
                <input
                  type="password"
                  required
                  placeholder="Enter passcode provided by host"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {passcodeError && (
                  <p className="text-xs text-rose-500 mt-1">{passcodeError}</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleJoin}
            disabled={!guestName.trim()}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          >
            <span>{meeting.isWaitingRoom && meeting.hostId !== user?.id ? 'Ask to Join' : 'Join Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Settings Modal (Audio/Video Device Selector) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-4">
            <h3 className="text-lg font-bold">Audio & Video Settings</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Microphone</label>
              <select
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white"
              >
                {audioInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Camera</label>
              <select
                value={selectedVideoInput}
                onChange={(e) => setSelectedVideoInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800 text-white"
              >
                {videoInputDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-semibold hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
