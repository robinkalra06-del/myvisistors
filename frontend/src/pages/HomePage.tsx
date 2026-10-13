import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Keyboard,
  Shield,
  Zap,
  Share2,
  Subtitles,
  Disc,
  Users,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Lock,
  Sparkles,
  Smile,
  Mic,
  Camera,
  MessageSquare,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SubscriptionPlan } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [isStartingInstant, setIsStartingInstant] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch subscription plans
  useEffect(() => {
    api.get('/subscriptions/plans')
      .then((res) => setPlans(res.data.plans))
      .catch((err) => console.warn('Could not fetch plans:', err));
  }, []);

  // Handle instant meeting start
  const handleStartInstant = async () => {
    try {
      setIsStartingInstant(true);
      setErrorMsg('');
      const res = await api.post('/meetings/instant', {
        title: `${user?.fullName || 'Instant'} Meeting`,
      });
      const { code } = res.data.meeting;
      navigate(`/meet/${code}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Could not start instant meeting');
    } finally {
      setIsStartingInstant(false);
    }
  };

  // Handle join with code or link
  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCodeInput.trim()) return;

    let code = meetingCodeInput.trim();
    // If full URL was pasted, extract the code portion
    if (code.includes('/meet/')) {
      code = code.split('/meet/')[1].split('?')[0];
    } else if (code.includes('/lobby/')) {
      code = code.split('/lobby/')[1].split('?')[0];
    }

    // Clean up trailing slashes
    code = code.replace(/^\/+|\/+$/g, '');
    navigate(`/lobby/${code}`);
  };

  const faqs = [
    {
      q: 'Do participants need an account to join a meeting?',
      a: 'No! Anyone with a meeting link or 9-character code can join directly from any modern web browser without creating an account or downloading an application.',
    },
    {
      q: 'How does PulseMeet protect our meeting privacy?',
      a: 'Every media stream is encrypted in transit using industry-standard WebRTC DTLS and SRTP. Additionally, hosts can lock meetings, require passcodes, and enforce waiting rooms.',
    },
    {
      q: 'Can I record meetings and share them with my team?',
      a: 'Yes! Pro and Business accounts include cloud recording capabilities. Hosts can record meetings with visible indicators to all attendees and download or share MP4 exports.',
    },
    {
      q: 'What are the limits on the Free Plan?',
      a: 'The Free Plan allows up to 100 participants per meeting with a generous 45-minute limit per group session, high-definition video, screen sharing, and interactive chat.',
    },
    {
      q: 'Does screen sharing work on mobile devices?',
      a: 'Participants on mobile devices can view shared screens in full clarity. Broadcasters can share their entire screen, application window, or specific browser tabs from desktop browsers.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500 selection:text-white">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Next-Gen WebRTC Video Conferencing</span>
                <span className="text-slate-400">|</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                Video Meetings <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                  Made Simple.
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Connect, collaborate, and celebrate from anywhere with secure, crystal-clear enterprise video conferencing. No downloads required.
              </p>

              {/* Call to Action Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-center lg:justify-start pt-2">
                <button
                  onClick={handleStartInstant}
                  disabled={isStartingInstant}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all disabled:opacity-50"
                >
                  <Video className="w-5 h-5" />
                  <span>{isStartingInstant ? 'Starting Call...' : 'New Meeting'}</span>
                </button>

                {/* Join code input form */}
                <form onSubmit={handleJoinMeeting} className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter a code or link"
                      value={meetingCodeInput}
                      onChange={(e) => setMeetingCodeInput(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!meetingCodeInput.trim()}
                    className="px-5 py-3.5 rounded-xl font-semibold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 disabled:opacity-40 transition-colors"
                  >
                    Join
                  </button>
                </form>
              </div>

              {errorMsg && (
                <p className="text-sm text-rose-500 font-medium">{errorMsg}</p>
              )}

              {/* Trust stats */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-8 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>100% Free Tier</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No App Installation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>End-to-End Encrypted</span>
                </div>
              </div>

            </div>

            {/* Right: Interactive Meeting UI Preview */}
            <div id="preview" className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Device container mockup */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-3 sm:p-4 text-white overflow-hidden">
                  
                  {/* Top Meeting Mock Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="font-semibold text-slate-200">Weekly Product Sync</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>00:24:18</span>
                    </div>
                  </div>

                  {/* Video Grid Mockup */}
                  <div className="grid grid-cols-2 gap-2.5 my-3 aspect-video">
                    
                    {/* Tile 1: Active Speaker */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-800 border-2 border-emerald-500 shadow-lg flex items-center justify-center group">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                        alt="Speaker"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full text-[10px]">
                        <Mic className="w-3 h-3" />
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[11px] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Alex Morgan (Host)</span>
                      </div>
                    </div>

                    {/* Tile 2 */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
                        alt="Participant"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[11px] font-medium">
                        John Doe
                      </div>
                    </div>

                    {/* Tile 3 */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"
                        alt="Participant"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[11px] font-medium">
                        Dr. Sarah Jenkins
                      </div>
                    </div>

                    {/* Tile 4: Presentation / Screen Share Tile */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-blue-500/50 flex flex-col items-center justify-center p-3 text-center">
                      <Share2 className="w-8 h-8 text-blue-400 mb-1 animate-bounce" />
                      <span className="text-xs font-semibold text-slate-200">Q3 Roadmap Presentation</span>
                      <span className="text-[10px] text-slate-400">Shared by Alex</span>
                    </div>

                  </div>

                  {/* Floating Reactions Preview */}
                  <div className="relative h-6 flex items-center justify-center gap-3 text-sm">
                    <span className="animate-bounce">❤️</span>
                    <span className="animate-bounce delay-100">👏</span>
                    <span className="animate-bounce delay-200">🔥</span>
                    <span className="animate-bounce delay-300">🎉</span>
                  </div>

                  {/* Bottom Controls Mockup Bar */}
                  <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-800">
                    <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <Share2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <Smile className="w-4 h-4" />
                    </div>
                    <div className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white cursor-pointer">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-semibold cursor-pointer">
                      Leave
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Everything You Need</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Built for Effortless Global Collaboration
            </p>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Discover powerful capabilities crafted to make your team discussions clearer, faster, and more productive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crystal-Clear HD Audio & Video</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Experience ultra-low latency WebRTC streaming with adaptive bitrate streaming that auto-tunes to fluctuating network conditions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seamless Screen Sharing</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Broadcast your entire desktop, a specific application window, or a browser tab with high FPS and crystal-clear presentation text.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Subtitles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Speech Captions</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Enable live automated subtitles in real-time powered by speech recognition. Keep everyone engaged and accessible.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Disc className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cloud Recording & Playback</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Record your meetings directly to cloud storage. View, download, or review meeting archives with complete participant logs.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Host Security & Waiting Rooms</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Take control with waiting rooms, meeting lock toggles, participant removal, host delegation, and screen sharing restrictions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reactions & Hand Raising</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Keep the conversation fluid with animated floating emoji reactions, hand raise notifications, and rich group and private chat.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Security & Privacy Section */}
      <section id="security" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white p-8 sm:p-12 lg:p-16 border border-slate-800 relative overflow-hidden">
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                <Shield className="w-4 h-4" />
                <span>Enterprise Security Standard</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Privacy First. No Ads. No Data Harvesting.
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                PulseMeet is built on a foundation of strict confidentiality. Your video and audio feeds are encrypted end-to-end, passcodes are verified server-side, and we never analyze or sell your meeting conversations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-sm text-slate-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Encrypted WebRTC Media Streams</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Host-Controlled Waiting Room</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Meeting Passcode Validation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Granular Admin Audit Logs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Predictable Plans</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Flexible Pricing for Every Scale
            </p>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Start with our full-featured Free tier, or upgrade to Pro or Business for extended limits, cloud recording, and enterprise team control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const isPro = plan.code === 'PRO';
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-8 rounded-3xl border transition-all ${
                    isPro
                      ? 'border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/10 ring-2 ring-blue-600 dark:ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                  }`}
                >
                  {isPro && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-600 text-white shadow-md">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        ${plan.priceMonthly / 100}
                      </span>
                      <span className="text-sm font-medium text-slate-500">/month</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Up to {plan.maxParticipants} participants & {plan.maxDurationMinutes} min duration.
                    </p>

                    <div className="my-6 border-t border-slate-100 dark:border-slate-800" />

                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={() => navigate(user ? '/dashboard' : '/register')}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                        isPro
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white'
                      }`}
                    >
                      {user ? 'Choose in Dashboard' : 'Get Started'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Answers & Help</h2>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 dark:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 bg-blue-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to upgrade your video meeting experience?
          </h2>
          <p className="text-blue-100 text-base max-w-xl mx-auto">
            Host high-definition conferences with your team today. Sign up in under 30 seconds.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="px-6 py-3.5 rounded-xl bg-white text-blue-600 font-bold shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <span>{user ? 'Go to Dashboard' : 'Create Free Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
