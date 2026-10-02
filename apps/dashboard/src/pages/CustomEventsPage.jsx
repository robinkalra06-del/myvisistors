import React, { useState, useEffect } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { analyticsService } from '../services/analytics.service.js';
import { socketService } from '../services/socket.service.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SOCKET_EVENTS } from '@livetrack/shared';
import { Sparkles, Zap, Code, Clock, Layers } from 'lucide-react';

export function CustomEventsPage() {
  const { currentWebsite } = useWebsite();
  const [eventsData, setEventsData] = useState({ totalEvents: 0, topEvents: [], recentEvents: [] });
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    if (!currentWebsite) return;
    try {
      setLoading(true);
      const data = await analyticsService.getEvents(currentWebsite.publicId);
      setEventsData(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentWebsite]);

  // Listen to incoming live custom events via Socket.IO
  useEffect(() => {
    if (!currentWebsite) return;

    const unsub = socketService.on(SOCKET_EVENTS.VISITOR_EVENT, (newEvent) => {
      setEventsData(prev => ({
        totalEvents: prev.totalEvents + 1,
        topEvents: prev.topEvents.map(te => te.eventName === newEvent.eventName ? { ...te, count: te.count + 1 } : te),
        recentEvents: [newEvent, ...prev.recentEvents.slice(0, 30)]
      }));
    });

    return () => unsub && unsub();
  }, [currentWebsite]);

  if (!currentWebsite) {
    return (
      <div className="py-24 text-center text-slate-400">
        Please select a website to view custom event tracking.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Custom Event Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track business actions like button clicks, form submissions, and checkouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="md">
            {eventsData.totalEvents} Total Events Recorded
          </Badge>
        </div>
      </div>

      {/* Grid: Top Events & Live Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Events (1 col) */}
        <div>
          <Card title="Top Custom Events" subtitle="Frequency by event name">
            <div className="space-y-3">
              {eventsData.topEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No custom events recorded yet.</p>
              ) : (
                eventsData.topEvents.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span className="font-mono font-semibold text-purple-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      {e.eventName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                      {e.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Live Stream of Events (2 cols) */}
        <div className="lg:col-span-2">
          <Card title="Recent Events Stream" subtitle="Live stream of recorded events">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Event Name</th>
                    <th className="py-2.5 px-3">Payload Data</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {eventsData.recentEvents.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-500 font-sans">
                        No recent events stream.
                      </td>
                    </tr>
                  ) : (
                    eventsData.recentEvents.map((evt, idx) => (
                      <tr key={evt.id || idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 px-3 text-purple-400 font-semibold whitespace-nowrap">
                          {evt.eventName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-md truncate">
                          {JSON.stringify(evt.properties)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Code Example Helper */}
      <Card title="How to Trigger Custom Events via JavaScript">
        <p className="text-xs text-slate-400 mb-3">
          Call <code className="text-blue-400">LiveTrack.track(eventName, metadata)</code> anywhere on your webpage:
        </p>
        <div className="bg-[#070b14] border border-slate-800 rounded-lg p-4 font-mono text-xs text-purple-300 overflow-x-auto">
          <pre>{`// 1. Button click
LiveTrack.track("button_click", { button_name: "Contact Sales" });

// 2. Signup completed
LiveTrack.track("signup_completed", { plan: "Pro" });

// 3. Purchase completed
LiveTrack.track("purchase_completed", { currency: "USD", value: 99 });`}</pre>
        </div>
      </Card>
    </div>
  );
}
