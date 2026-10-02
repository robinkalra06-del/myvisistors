import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { UserCheck, Plus, Shield, Mail, Trash2 } from 'lucide-react';

export function TeamMembersPage() {
  const { user } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [members, setMembers] = useState([
    {
      id: user?.id || 'usr_1',
      name: user?.name || 'Owner',
      email: user?.email || 'admin@livetrack.io',
      role: 'OWNER',
      isCurrentUser: true
    }
  ]);

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setMembers(prev => [
      ...prev,
      {
        id: 'usr_' + Math.random().toString(36).substring(2, 8),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        isCurrentUser: false
      }
    ]);
    setIsInviteOpen(false);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            Team Members & Roles
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage members authorized to view and configure your websites.
          </p>
        </div>

        <Button onClick={() => setIsInviteOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Invite Member
        </Button>
      </div>

      {/* Members Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Access Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                      {m.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        {m.name}
                        {m.isCurrentUser && <span className="text-[10px] text-slate-500 font-normal">(You)</span>}
                      </div>
                      <div className="text-slate-400 text-[11px]">{m.email}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={m.role === 'OWNER' ? 'online' : m.role === 'ADMIN' ? 'primary' : 'default'}>
                      {m.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {m.role === 'OWNER' ? 'Full Control' : m.role === 'ADMIN' ? 'Manage Sites' : 'Read-Only Analytics'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Owner
          </div>
          <p className="text-slate-400">Full administrative access to all websites, member invites, billing, and account deletion.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> Admin
          </div>
          <p className="text-slate-400">Can create websites, configure tracking keys, verify installations, and view all analytics.</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" /> Viewer
          </div>
          <p className="text-slate-400">Read-only view of live visitors, visitor profiles, analytics graphs, and reports.</p>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Role & Permissions
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="VIEWER">Viewer (Read-Only Dashboards)</option>
              <option value="ADMIN">Admin (Manage Websites & Analytics)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Send Invite</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
