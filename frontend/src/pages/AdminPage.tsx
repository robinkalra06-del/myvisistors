import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  Video,
  Disc,
  Database,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowLeft,
  Activity,
  CreditCard,
  FileText,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { SubscriptionPlan } from '../types';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'users' | 'meetings' | 'plans' | 'audit'>('users');
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [liveMeetings, setLiveMeetings] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Check admin authorization
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch Admin Stats and Data
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, meetingsRes, plansRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/meetings/live'),
        api.get('/subscriptions/plans'),
        api.get('/admin/audit-logs'),
      ]);

      setStats(statsRes.data);
      setUsersList(usersRes.data.users || []);
      setLiveMeetings(meetingsRes.data.meetings || []);
      setPlans(plansRes.data.plans || []);
      setAuditLogs(logsRes.data.logs || []);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setMsg({ text: err.response?.data?.message || 'Error loading admin data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Update User Status (Suspend/Activate)
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.put(`/admin/users/${userId}`, { status: nextStatus });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
      );
      setMsg({ text: `User account has been ${nextStatus.toLowerCase()}.`, type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to update user', type: 'error' });
    }
  };

  // Update User Role (Admin/User)
  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change this user's role to ${nextRole}?`)) return;
    try {
      await api.put(`/admin/users/${userId}`, { role: nextRole });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      );
      setMsg({ text: `User role updated to ${nextRole}.`, type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to update role', type: 'error' });
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      setMsg({ text: 'User deleted permanently.', type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to delete user', type: 'error' });
    }
  };

  // Terminate Live Meeting
  const handleTerminateMeeting = async (meetingId: string) => {
    if (!window.confirm('Force terminate this live meeting? All participants will be disconnected.')) return;
    try {
      await api.post(`/admin/meetings/${meetingId}/terminate`);
      setLiveMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      setMsg({ text: 'Meeting terminated by administrator.', type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to terminate meeting', type: 'error' });
    }
  };

  // Save Plan Settings
  const handleSavePlan = async (plan: SubscriptionPlan) => {
    try {
      await api.put(`/admin/plans/${plan.id}`, {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        maxDurationMinutes: plan.maxDurationMinutes,
        maxParticipants: plan.maxParticipants,
        cloudRecording: plan.cloudRecording,
        maxStorageMB: plan.maxStorageMB,
      });
      setMsg({ text: `Plan ${plan.name} updated successfully!`, type: 'success' });
    } catch (err: any) {
      setMsg({ text: err.response?.data?.message || 'Failed to update plan', type: 'error' });
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.personalMeetingCode.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Return to User Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Control Panel</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                System telemetry, user moderation, billing limits, and audit logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Refresh Telemetry
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {msg && (
          <div
            className={`p-4 rounded-2xl text-sm flex items-center justify-between ${
              msg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="text-xs font-bold underline">Dismiss</button>
          </div>
        )}

        {/* Telemetry KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Users</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalUsers}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {stats.activeUsers} Active Accounts
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Live Meetings</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.liveMeetings}</p>
              <p className="text-[11px] text-slate-500 font-medium">Currently in session</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Total Conferences</span>
                <Video className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalMeetings}</p>
              <p className="text-[11px] text-slate-500 font-medium">Lifetime sessions</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Cloud Recordings</span>
                <Disc className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalRecordings}</p>
              <p className="text-[11px] text-slate-500 font-medium">{stats.totalStorageMB} MB Consumed</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Storage Engine</span>
                <Database className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">MySQL / XAMPP</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Database Synced</p>
            </div>

          </div>
        )}

        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'users'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'meetings'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Active Meetings ({liveMeetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'plans'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Plans & Quotas</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Security Audit Logs</span>
          </button>
        </div>

        {/* Tab 1: User Accounts Table */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or room code..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Room Code</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Joined</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${u.fullName}`}
                            alt=""
                            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{u.fullName}</span>
                            <span className="text-slate-500 text-[11px]">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {u.personalMeetingCode}
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            u.role === 'ADMIN'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.role)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                        >
                          {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          title="Delete user permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 2: Active Meetings Table */}
        {activeTab === 'meetings' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {liveMeetings.length === 0 ? (
              <div className="text-center py-16 text-sm text-slate-500">
                No meetings are currently active right now.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Meeting Title</th>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-6 py-3.5">Host</th>
                    <th className="px-6 py-3.5">Started At</th>
                    <th className="px-6 py-3.5 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {liveMeetings.map((m) => (
                    <tr key={m.id}>
                      <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{m.title}</td>
                      <td className="px-6 py-3.5 font-mono text-blue-600 dark:text-blue-400">{m.code}</td>
                      <td className="px-6 py-3.5">{m.host?.fullName || 'Organizer'}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {m.startedAt ? new Date(m.startedAt).toLocaleTimeString() : 'Recent'}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleTerminateMeeting(m.id)}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                        >
                          Force Terminate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Plans & Quotas */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p, idx) => (
              <div key={p.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {p.code}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">Monthly Price (in cents, e.g. 1200 = $12)</label>
                    <input
                      type="number"
                      value={p.priceMonthly}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].priceMonthly = Number(e.target.value);
                        setPlans(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Max Meeting Duration (Minutes)</label>
                    <input
                      type="number"
                      value={p.maxDurationMinutes}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].maxDurationMinutes = Number(e.target.value);
                        setPlans(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Max Participants</label>
                    <input
                      type="number"
                      value={p.maxParticipants}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].maxParticipants = Number(e.target.value);
                        setPlans(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Max Cloud Storage (MB)</label>
                    <input
                      type="number"
                      value={p.maxStorageMB}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].maxStorageMB = Number(e.target.value);
                        setPlans(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.cloudRecording}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].cloudRecording = e.target.checked;
                        setPlans(updated);
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Allow Cloud Recording</span>
                  </label>
                </div>

                <button
                  onClick={() => handleSavePlan(p)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-colors"
                >
                  Save Quotas for {p.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Security Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Resource</th>
                    <th className="px-6 py-3.5">Operator</th>
                    <th className="px-6 py-3.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-3 text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-semibold text-amber-600 dark:text-amber-400">
                        {log.action}
                      </td>
                      <td className="px-6 py-3 text-slate-400">{log.resourceType}</td>
                      <td className="px-6 py-3 text-slate-300 font-sans">{log.user?.fullName || 'System'}</td>
                      <td className="px-6 py-3 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};
