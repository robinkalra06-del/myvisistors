import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { StatCard } from '../components/ui/StatCard.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import {
  ShieldAlert,
  Users,
  Globe,
  Cpu,
  Server,
  Activity,
  UserX,
  UserCheck,
  RefreshCw,
  Trash2
} from 'lucide-react';

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cleaningRetention, setCleaningRetention] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, logsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data || []);
      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error('Failed to load admin console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleSuspend = async (userId, currentSuspended) => {
    try {
      await api.post(`/admin/users/${userId}/suspend`, { suspend: !currentSuspended });
      fetchAdminData();
    } catch (err) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleRunRetention = async () => {
    try {
      setCleaningRetention(true);
      const res = await api.post('/admin/retention-cleanup', {});
      alert(res.data?.message || 'Retention cleanup executed.');
    } catch (err) {
      alert('Cleanup failed: ' + err.message);
    } finally {
      setCleaningRetention(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Super Admin Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global system health, user administration, and platform audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleRunRetention} isLoading={cleaningRetention}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Run Retention Sweep
          </Button>
          <Button size="sm" variant="secondary" onClick={fetchAdminData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Platform Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
        />
        <StatCard
          title="Registered Sites"
          value={stats?.totalWebsites ?? 0}
          icon={Globe}
        />
        <StatCard
          title="Tracked Visitors"
          value={stats?.totalVisitors ?? 0}
          icon={Activity}
        />
        <StatCard
          title="Total Page Views"
          value={stats?.totalPageViews ?? 0}
          icon={Server}
        />
      </div>

      {/* System Health Card */}
      <Card title="System Diagnostics & Runtime" subtitle="Backend server metrics">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Process Uptime</span>
            <span className="text-sm font-bold text-slate-200">{stats?.system?.uptimeFormatted || '0m'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Memory (RSS / Heap)</span>
            <span className="text-sm font-bold text-slate-200">
              {stats?.system?.memoryRssMb}MB / {stats?.system?.memoryHeapUsedMb}MB
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Host Platform / CPUs</span>
            <span className="text-sm font-bold text-slate-200">
              {stats?.system?.platform} ({stats?.system?.cpus} cores)
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Node.js Runtime</span>
            <span className="text-sm font-bold text-slate-200">{stats?.system?.nodeVersion}</span>
          </div>
        </div>
      </Card>

      {/* User Moderation Table */}
      <Card title="User Administration" subtitle="All registered platform accounts">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-200">{u.name}</div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={u.role === 'SUPER_ADMIN' ? 'purple' : 'default'} size="sm">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={u.isSuspended ? 'danger' : 'online'} size="sm">
                      {u.isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {u.role !== 'SUPER_ADMIN' && (
                      <Button
                        size="sm"
                        variant={u.isSuspended ? 'secondary' : 'danger'}
                        onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                      >
                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Logs */}
      <Card title="System Audit Trail" subtitle="Recent administrative actions">
        <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-6">No audit records found.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-2.5 rounded bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 mr-2">[{log.action}]</span>
                  <span className="text-slate-400">{log.resourceType} ({log.resourceId})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
