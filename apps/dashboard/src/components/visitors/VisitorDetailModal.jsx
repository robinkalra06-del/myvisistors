import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Badge } from '../ui/Badge.jsx';
import { CountryFlag } from '../common/CountryFlag.jsx';
import { VisitorTimeline } from './VisitorTimeline.jsx';
import { analyticsService } from '../../services/analytics.service.js';
import { formatDuration } from '@livetrack/shared';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Compass,
  Layers,
  ArrowUpRight,
  Shield,
  Activity
} from 'lucide-react';

export function VisitorDetailModal({ isOpen, onClose, websiteId, visitorId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline'); // timeline | sessions

  useEffect(() => {
    if (isOpen && websiteId && visitorId) {
      setLoading(true);
      analyticsService.getVisitorDetail(websiteId, visitorId)
        .then(data => setProfile(data))
        .catch(err => console.error('Failed to load visitor profile:', err))
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [isOpen, websiteId, visitorId]);

  if (!isOpen) return null;

  const visitor = profile?.visitor;
  const sessions = profile?.sessions || [];
  const timeline = profile?.timeline || [];

  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };
  const DeviceIcon = getDeviceIcon(visitor?.deviceType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visitor Profile & Intelligence" maxWidth="max-w-4xl">
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-sm text-slate-400">Loading visitor timeline and history...</p>
        </div>
      ) : !visitor ? (
        <div className="py-12 text-center text-slate-400">
          Visitor details could not be retrieved.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
                <CountryFlag countryCode={visitor.countryCode} countryName={visitor.country} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white font-mono">{visitor.anonymousId}</h4>
                  <Badge variant={visitor.isCurrentlyOnline ? 'online' : 'offline'}>
                    {visitor.isCurrentlyOnline ? 'Active Now' : 'Offline'}
                  </Badge>
                  {visitor.isReturning && <Badge variant="primary">Returning Visitor</Badge>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                  <span>{visitor.city || 'Unknown City'}, {visitor.country || 'Unknown Country'}</span>
                  <span>•</span>
                  <span>IP: {visitor.lastIp || 'Masked'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Duration</div>
                <div className="text-sm font-bold text-slate-200">
                  {formatDuration((visitor.totalDurationSeconds || 0) * 1000)}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Page Views</div>
                <div className="text-sm font-bold text-slate-200">{visitor.totalPageViews || 0}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Sessions</div>
                <div className="text-sm font-bold text-slate-200">{visitor.totalSessions || 1}</div>
              </div>
            </div>
          </div>

          {/* Grid: Tech Specs & Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                <DeviceIcon className="w-3.5 h-3.5 text-blue-400" />
                Device & System
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div className="flex justify-between"><span className="text-slate-500">Type:</span> <span className="capitalize">{visitor.deviceType || 'Desktop'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">OS:</span> <span>{visitor.os || 'Unknown'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Browser:</span> <span>{visitor.browser || 'Unknown'}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                Locale & Display
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div className="flex justify-between"><span className="text-slate-500">Language:</span> <span>{visitor.language || 'en-US'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Timezone:</span> <span>{visitor.timezone || 'UTC'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Country:</span> <span>{visitor.country}</span></div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Visit History
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div className="flex justify-between"><span className="text-slate-500">First Seen:</span> <span>{new Date(visitor.firstSeenAt).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Last Seen:</span> <span>{new Date(visitor.lastSeenAt).toLocaleTimeString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Visits:</span> <span>{visitor.totalSessions} sessions</span></div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-800 flex gap-4">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition
                ${activeTab === 'timeline' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}
              `}
            >
              Activity Timeline ({timeline.length})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition
                ${activeTab === 'sessions' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}
              `}
            >
              Sessions History ({sessions.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-[350px] overflow-y-auto pr-2">
            {activeTab === 'timeline' ? (
              <VisitorTimeline timeline={timeline} />
            ) : (
              <div className="space-y-3">
                {sessions.map((ses, idx) => (
                  <div key={ses.id || idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-mono text-slate-200 font-semibold">{ses.sessionToken}</div>
                      <div className="text-slate-400 mt-1 flex items-center gap-2">
                        <span>Started: {new Date(ses.startedAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>Landing: {ses.landingPage}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-200">{ses.pageViewCount || 1} pages</div>
                      <div className="text-slate-500">{formatDuration((ses.durationSeconds || 0) * 1000)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
