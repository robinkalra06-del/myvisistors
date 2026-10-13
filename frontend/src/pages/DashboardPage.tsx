import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Calendar,
  Clock,
  Copy,
  Check,
  Disc,
  Play,
  Download,
  Trash2,
  Lock,
  Plus,
  Share2,
  Users,
  Settings,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Meeting, Recording, SubscriptionPlan } from '../types';

export const DashboardPage: React.FC = () => {
  const { user, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'recordings' | 'settings'>('upcoming');
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Action states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedItemCode, setCopiedItemCode] = useState<string | null>(null);
  const [activePlayback, setActivePlayback] = useState<Recording | null>(null);

  // Settings form states
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch Dashboard Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [meetingsRes, recordingsRes, plansRes] = await Promise.all([
        api.get('/meetings/my-meetings'),
        api.get('/recordings'),
        api.get('/subscriptions/plans'),
      ]);

      setUpcomingMeetings(meetingsRes.data.upcoming || []);
      setPastMeetings(meetingsRes.data.past || []);
      setRecordings(recordingsRes.data.recordings || []);
      setPlans(plansRes.data.plans || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Instant Meeting Action
  const handleStartInstant = async () => {
    try {
      const res = await api.post('/meetings/instant', {
        title: `${user?.fullName || 'Personal'}'s Instant Meeting`,
      });
      navigate(`/meet/${res.data.meeting.code}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start instant meeting');
    }
  };

  // Join by code
  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    let code = joinCodeInput.trim();
    if (code.includes('/meet/')) code = code.split('/meet/')[1].split('?')[0];
    if (code.includes('/lobby/')) code = code.split('/lobby/')[1].split('?')[0];
    navigate(`/lobby/${code.replace(/^\/+|\/+$/g, '')}`);
  };

  // Copy personal meeting link
  const copyPersonalRoom = () => {
    if (!user) return;
    const url = `${window.location.origin}/meet/${user.personalMeetingCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Copy meeting link
  const copyMeetingLink = (code: string) => {
    const url = `${window.location.origin}/meet/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedItemCode(code);
    setTimeout(() => setCopiedItemCode(null), 2000);
  };

  // Delete Recording
  const handleDeleteRecording = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this cloud recording?')) return;
    try {
      await api.delete(`/recordings/${id}`);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert('Failed to delete recording');
    }
  };

  // Cancel Scheduled Meeting
  const handleCancelMeeting = async (id: string) => {
    if (!window.confirm('Cancel this scheduled meeting?')) return;
    try {
      await api.delete(`/meetings/${id}`);
      setUpcomingMeetings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      alert('Failed to cancel meeting');
    }
  };

  // Upgrade Plan
  const handleUpgradePlan = async (planCode: string) => {
    try {
      const res = await api.post('/subscriptions/upgrade', { planCode });
      alert(res.data.message);
      await refreshUser();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upgrade plan');
    }
  };

  // Update Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsMsg(null);
      await updateProfile(profileName, avatarUrl);
      setSettingsMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setSettingsMsg({ text: err.response?.data?.message || 'Error updating profile', type: 'error' });
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsMsg(null);
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setSettingsMsg({ text: 'Password changed successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setSettingsMsg({ text: err.response?.data?.message || 'Error changing password', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-16">
      
      {/* Top Banner / User Hero */}
      <section className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* User Greeting */}
            <div className="flex items-center gap-4">
              <img
                src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName || 'User'}`}
                alt={user?.fullName}
                className="w-16 h-16 rounded-2xl border-2 border-blue-500/30 object-cover shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Hello, {user?.fullName || 'User'}
                  </h1>
                  {user?.plan && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {user.plan.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Personal Meeting Room:{' '}
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {user?.personalMeetingCode}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Meeting Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleStartInstant}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 shadow-sm shadow-blue-500/20 transition-all"
              >
                <Video className="w-4 h-4" />
                <span>Instant Meeting</span>
              </button>

              <button
                onClick={() => setScheduleModalOpen(true)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-sm flex items-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Schedule</span>
              </button>

              <button
                onClick={copyPersonalRoom}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Personal Link'}</span>
              </button>
            </div>

          </div>

          {/* Quick Join Bar */}
          <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
            <form onSubmit={handleJoinWithCode} className="max-w-md flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter a meeting code to join (e.g. prd-sprt-rev)"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl disabled:opacity-40 transition-colors"
              >
                Join
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* Main Tabbed Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Upcoming Meetings ({upcomingMeetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Meeting History ({pastMeetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'recordings'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Cloud Recordings ({recordings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Account & Plan</span>
          </button>
        </div>

        {/* Tab 1: Upcoming Meetings */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No upcoming meetings</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  You don't have any sessions scheduled. Start an instant meeting or schedule one for later.
                </p>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Meeting</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {m.status}
                        </span>
                        {m.hasPasscode && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <Lock className="w-3 h-3" /> Passcode
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">{m.title}</h3>
                      {m.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{m.description}</p>
                      )}

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Instant Meeting'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Duration: {m.durationMinutes} mins</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigate(`/meet/${m.code}`)}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold text-center transition-colors"
                      >
                        Start / Join
                      </button>
                      <button
                        onClick={() => copyMeetingLink(m.code)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Copy Invitation Link"
                      >
                        {copiedItemCode === m.code ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleCancelMeeting(m.id)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-colors"
                        title="Cancel Meeting"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Meeting History */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {pastMeetings.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                No past meeting history recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3.5">Meeting Title</th>
                      <th className="px-6 py-3.5">Code</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Duration</th>
                      <th className="px-6 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pastMeetings.map((pm) => (
                      <tr key={pm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{pm.title}</td>
                        <td className="px-6 py-4 font-mono text-xs text-blue-600 dark:text-blue-400">{pm.code}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {pm.scheduledAt ? new Date(pm.scheduledAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{pm.durationMinutes} mins</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Ended
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Cloud Recordings */}
        {activeTab === 'recordings' && (
          <div className="space-y-4">
            {recordings.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                <Disc className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No cloud recordings yet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  When you record meetings as a host, your video files and session playback will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="relative aspect-video rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden group">
                      <video src={rec.fileUrl} className="w-full h-full object-cover opacity-60" />
                      <button
                        onClick={() => setActivePlayback(rec)}
                        className="absolute w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                      >
                        <Play className="w-5 h-5 ml-0.5 fill-white" />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{rec.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{Math.round(Number(rec.fileSize) / (1024 * 1024))} MB</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <a
                        href={rec.fileUrl}
                        download
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download MP4</span>
                      </a>
                      <button
                        onClick={() => handleDeleteRecording(rec.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Account & Plan Settings */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Profile & Password Form */}
            <div className="lg:col-span-6 space-y-6">
              
              {settingsMsg && (
                <div
                  className={`p-3.5 rounded-xl text-sm ${
                    settingsMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {settingsMsg.text}
                </div>
              )}

              {/* Edit Profile */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Details</h3>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Avatar Image URL</label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Change Password */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Security & Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              </div>

            </div>

            {/* Right: Plan Comparison and Upgrade */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Manage Subscription Plan</h3>
              <div className="space-y-4">
                {plans.map((p) => {
                  const isCurrent = user?.plan?.code === p.code;
                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">{p.name}</h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-600 text-white">
                                Active Plan
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            ${p.priceMonthly / 100}/mo • Max {p.maxParticipants} participants • {p.maxDurationMinutes} min limit
                          </p>
                        </div>
                        <div>
                          {isCurrent ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Current</span>
                          ) : (
                            <button
                              onClick={() => handleUpgradePlan(p.code)}
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                            >
                              Switch to {p.name}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Schedule Meeting Modal */}
      {scheduleModalOpen && (
        <ScheduleMeetingModal
          onClose={() => setScheduleModalOpen(false)}
          onSuccess={() => {
            setScheduleModalOpen(false);
            fetchData();
          }}
        />
      )}

      {/* Video Recording Playback Modal */}
      {activePlayback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-800 text-white relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <h3 className="text-base font-bold truncate">{activePlayback.title}</h3>
              <button
                onClick={() => setActivePlayback(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <video
              src={activePlayback.fileUrl}
              controls
              autoPlay
              className="w-full aspect-video rounded-xl bg-black"
            />
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component: Schedule Meeting Modal
const ScheduleMeetingModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passcode, setPasscode] = useState('');
  const [isWaitingRoom, setIsWaitingRoom] = useState(true);
  const [isScreenShareRestricted, setIsScreenShareRestricted] = useState(false);
  const [inviteeInput, setInviteeInput] = useState('');
  const [inviteeEmails, setInviteeEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addInvitee = () => {
    if (inviteeInput.trim() && inviteeInput.includes('@')) {
      if (!inviteeEmails.includes(inviteeInput.trim())) {
        setInviteeEmails([...inviteeEmails, inviteeInput.trim()]);
      }
      setInviteeInput('');
    }
  };

  const removeInvitee = (email: string) => {
    setInviteeEmails(inviteeEmails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await api.post('/meetings/schedule', {
        title,
        description,
        scheduledAt: new Date(scheduledDate).toISOString(),
        durationMinutes,
        passcode,
        isWaitingRoom,
        isScreenShareRestricted,
        inviteeEmails,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error scheduling meeting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Schedule a Meeting</h2>

        {error && (
          <div className="p-3 mb-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Title</label>
            <input
              type="text"
              required
              placeholder="Weekly Sprint Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Agenda, sprint goals, and discussion points..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date & Start Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Meeting Passcode (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 123456 (Leave blank for open access)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Security Toggles */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isWaitingRoom}
                onChange={(e) => setIsWaitingRoom(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Enable Waiting Room (Host admits participants)</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isScreenShareRestricted}
                onChange={(e) => setIsScreenShareRestricted(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span>Restrict Screen Sharing to Host Only</span>
            </label>
          </div>

          {/* Invite emails */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Invite Participants by Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteeInput}
                onChange={(e) => setInviteeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addInvitee();
                  }
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addInvitee}
                className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Add
              </button>
            </div>
            {inviteeEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {inviteeEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  >
                    <span>{email}</span>
                    <button type="button" onClick={() => removeInvitee(email)}>
                      <X className="w-3 h-3 hover:text-rose-500" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Save & Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
