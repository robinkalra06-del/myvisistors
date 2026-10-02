import React, { useState, useEffect } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { analyticsService } from '../services/analytics.service.js';
import { socketService } from '../services/socket.service.js';
import { LiveVisitorTable } from '../components/visitors/LiveVisitorTable.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SOCKET_EVENTS } from '@livetrack/shared';
import { Users, Activity, Play, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LiveVisitorsPage() {
  const { currentWebsite, liveCount, socketConnected } = useWebsite();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial live visitors snapshot
  const loadLiveVisitors = async () => {
    if (!currentWebsite) return;
    try {
      setLoading(true);
      const list = await analyticsService.getLiveVisitors(currentWebsite.publicId);
      setVisitors(list);
    } catch (err) {
      console.error('Failed to load live visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveVisitors();
  }, [currentWebsite]);

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!currentWebsite) return;

    const unsubs = [
      socketService.on(SOCKET_EVENTS.VISITOR_NEW, (data) => {
        if (!data.visitor) return;
        setVisitors(prev => {
          const exists = prev.find(v => v.sessionId === data.visitor.sessionId);
          if (exists) {
            return prev.map(v => v.sessionId === data.visitor.sessionId ? data.visitor : v);
          }
          return [data.visitor, ...prev];
        });
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_UPDATE, (data) => {
        if (!data.visitor) return;
        setVisitors(prev =>
          prev.map(v => v.sessionId === data.visitor.sessionId ? data.visitor : v)
        );
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_PAGEVIEW, (data) => {
        setVisitors(prev =>
          prev.map(v => {
            if (v.sessionId === data.sessionId) {
              return {
                ...v,
                currentPage: data.path,
                pageTitle: data.title,
                pageViews: (v.pageViews || 1) + 1,
                lastActivityAt: data.timestamp
              };
            }
            return v;
          })
        );
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_IDLE, (data) => {
        setVisitors(prev =>
          prev.map(v => v.sessionId === data.sessionId ? { ...v, status: 'idle' } : v)
        );
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_OFFLINE, (data) => {
        setVisitors(prev => prev.filter(v => v.sessionId !== data.sessionId));
      })
    ];

    return () => {
      unsubs.forEach(u => u && u());
    };
  }, [currentWebsite]);

  const onlineCount = visitors.filter(v => v.status === 'online').length;
  const idleCount = visitors.filter(v => v.status === 'idle').length;

  if (!currentWebsite) {
    return (
      <div className="py-24 text-center">
        <p className="text-slate-400">Please select or register a website to monitor live visitors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Live Visitor Monitoring
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time feed of visitors active on {currentWebsite.name} ({currentWebsite.domain}).
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              {onlineCount} Active
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              {idleCount} Idle
            </span>
          </div>

          <a
            href={`/test-site.html`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open test website to simulate local visitor"
          >
            <Button size="sm" variant="secondary">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Open Test Page
            </Button>
          </a>
        </div>
      </div>

      {/* Main Real-Time Visitors Table */}
      <LiveVisitorTable
        visitors={visitors}
        websiteId={currentWebsite.publicId}
        onRefresh={loadLiveVisitors}
      />
    </div>
  );
}
