import React, { useState, useEffect } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { socketService } from '../services/socket.service.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { SOCKET_EVENTS } from '@livetrack/shared';
import { Activity, Eye, Zap, UserPlus, Power, Filter, Trash2 } from 'lucide-react';

export function ActivityFeedPage() {
  const { currentWebsite } = useWebsite();
  const [feed, setFeed] = useState([]);
  const [filterType, setFilterType] = useState('ALL'); // ALL | pageview | new | event | offline

  useEffect(() => {
    if (!currentWebsite) return;

    const unsubs = [
      socketService.on(SOCKET_EVENTS.VISITOR_NEW, (data) => {
        addFeedItem({
          id: Date.now() + Math.random(),
          type: 'new',
          title: 'Visitor Arrived',
          description: `Visitor from ${data.visitor?.country || 'Unknown'} (${data.visitor?.city || 'Unknown'}) opened the site on ${data.visitor?.browser || 'Browser'}.`,
          timestamp: new Date().toISOString()
        });
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_PAGEVIEW, (data) => {
        addFeedItem({
          id: Date.now() + Math.random(),
          type: 'pageview',
          title: 'Page Visited',
          description: `Navigated to "${data.title || data.path}" (${data.path})`,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_EVENT, (data) => {
        addFeedItem({
          id: Date.now() + Math.random(),
          type: 'event',
          title: `Action: ${data.eventName}`,
          description: `Triggered custom event with payload: ${JSON.stringify(data.properties || {})}`,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }),

      socketService.on(SOCKET_EVENTS.VISITOR_OFFLINE, (data) => {
        addFeedItem({
          id: Date.now() + Math.random(),
          type: 'offline',
          title: 'Visitor Left Website',
          description: `Session ${data.sessionId} closed. Total duration: ${data.durationSeconds || 0}s.`,
          timestamp: new Date().toISOString()
        });
      })
    ];

    return () => unsubs.forEach(u => u && u());
  }, [currentWebsite]);

  const addFeedItem = (item) => {
    setFeed(prev => [item, ...prev.slice(0, 99)]);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new': return UserPlus;
      case 'event': return Zap;
      case 'offline': return Power;
      default: return Eye;
    }
  };

  const filteredFeed = feed.filter(item => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Real-Time Activity Feed
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live stream of every visitor event happening right now on {currentWebsite?.name}.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Actions</option>
            <option value="pageview">Page Views</option>
            <option value="new">Arrivals</option>
            <option value="event">Custom Events</option>
            <option value="offline">Exits</option>
          </select>

          <Button size="sm" variant="ghost" onClick={() => setFeed([])}>
            <Trash2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Clear Feed
          </Button>
        </div>
      </div>

      {/* Feed Stream */}
      <Card>
        {filteredFeed.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
            Waiting for live actions from website visitors...
            <p className="mt-1 text-slate-600">Open your test page or browse the site to see events populate here instantly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeed.map((item) => {
              const Icon = getIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex items-start gap-3 animate-fade-in"
                >
                  <div className="p-2 rounded-lg bg-slate-800 text-blue-400 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200">{item.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 break-words">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
