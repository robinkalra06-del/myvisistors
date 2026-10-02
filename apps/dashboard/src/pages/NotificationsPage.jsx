import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Bell, Check, Settings, AlertTriangle, ShieldCheck } from 'lucide-react';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [threshold, setThreshold] = useState(100);
  const [savedSettings, setSavedSettings] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications/settings', {
        emailAlerts,
        trafficSpikeThreshold: parseInt(threshold, 10)
      });
      setSavedSettings(true);
      setTimeout(() => setSavedSettings(false), 2500);
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" />
          Notifications & Alerts
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review traffic spike alerts, system updates, and configure notification rules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Notification Feed (2 cols) */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Alerts</h4>

          {loading ? (
            <p className="text-xs text-slate-500 py-8 text-center">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#111827] border border-slate-800 text-center text-xs text-slate-500">
              No unread notifications right now.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3
                  ${n.isRead ? 'bg-slate-900/40 border-slate-800/60 opacity-70' : 'bg-slate-900 border-slate-800'}
                `}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{n.title}</span>
                    <Badge variant={n.type === 'TRAFFIC_SPIKE' ? 'online' : 'primary'} size="sm">
                      {n.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>

                {!n.isRead && (
                  <Button size="sm" variant="ghost" onClick={() => handleMarkAsRead(n.id)}>
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Notification Settings (1 col) */}
        <div>
          <Card title="Alert Preferences">
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Email Notifications</div>
                  <div className="text-slate-400 text-[11px]">Receive emails for traffic surges</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-white mb-1">
                  Traffic Surge Threshold
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Alert when concurrent visitors exceed this limit.
                </span>
              </div>

              <Button type="submit" size="sm" className="w-full">
                {savedSettings ? 'Settings Saved!' : 'Save Preferences'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
