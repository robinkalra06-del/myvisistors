import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { authService } from '../services/auth.service.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Settings, Shield, Lock, Moon, Sun, CheckCircle } from 'lucide-react';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');
    if (!currentPassword || !newPassword) {
      setPasswordError('Both fields are required.');
      return;
    }

    try {
      setChangingPass(true);
      await authService.changePassword(currentPassword, newPassword);
      setPasswordMsg('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Account & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal profile, security credentials, and dashboard appearance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card title="User Profile">
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={user?.name || ''}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 opacity-80"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 opacity-80"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Account Role</label>
              <input
                type="text"
                disabled
                value={user?.role || 'OWNER'}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono opacity-80"
              />
            </div>
          </div>
        </Card>

        {/* Change Password Card */}
        <Card title="Change Password">
          <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
            {passwordMsg && (
              <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                {passwordMsg}
              </div>
            )}
            {passwordError && (
              <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-300">
                {passwordError}
              </div>
            )}

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <Button type="submit" size="sm" isLoading={changingPass}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>

      {/* Appearance & Security Preferences */}
      <Card title="Display & Security">
        <div className="space-y-4 text-xs divide-y divide-slate-800/80">
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="font-semibold text-white">Dashboard Theme</div>
              <div className="text-slate-400 text-[11px]">Toggle between Dark and Light mode</div>
            </div>
            <Button size="sm" variant="secondary" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 mr-1 text-amber-400" /> : <Moon className="w-3.5 h-3.5 mr-1" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="font-semibold text-white">Two-Factor Authentication (2FA)</div>
              <div className="text-slate-400 text-[11px]">Enhance account login security with TOTP</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => alert('2FA setup is available in Pro/Enterprise plans.')}>
              <Shield className="w-3.5 h-3.5 mr-1" /> Configure 2FA
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
