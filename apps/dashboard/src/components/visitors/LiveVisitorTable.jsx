import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { CountryFlag } from '../common/CountryFlag.jsx';
import { VisitorDetailModal } from './VisitorDetailModal.jsx';
import { formatDuration } from '@livetrack/shared';
import {
  Monitor,
  Smartphone,
  Tablet,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Clock,
  Compass
} from 'lucide-react';

export function LiveVisitorTable({ visitors = [], websiteId, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('ACTIVITY'); // ACTIVITY | DURATION | PAGES
  const [selectedVisitorId, setSelectedVisitorId] = useState(null);

  // Live timer tick every 1 second to update elapsed durations
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  // Filter & Sort
  const filtered = visitors.filter(v => {
    if (statusFilter !== 'ALL' && v.status?.toUpperCase() !== statusFilter) return false;
    if (deviceFilter !== 'ALL' && v.deviceType?.toLowerCase() !== deviceFilter.toLowerCase()) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = (v.id && v.id.toLowerCase().includes(q)) || (v.sessionId && v.sessionId.toLowerCase().includes(q));
      const matchLoc = (v.city && v.city.toLowerCase().includes(q)) || (v.country && v.country.toLowerCase().includes(q));
      const matchPage = (v.currentPage && v.currentPage.toLowerCase().includes(q)) || (v.pageTitle && v.pageTitle.toLowerCase().includes(q));
      if (!matchId && !matchLoc && !matchPage) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'DURATION') {
      const durA = Date.now() - new Date(a.startedAt).getTime();
      const durB = Date.now() - new Date(b.startedAt).getTime();
      return durB - durA;
    }
    if (sortBy === 'PAGES') {
      return (b.pageViews || 1) - (a.pageViews || 1);
    }
    // Default: latest activity
    return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
  });

  return (
    <div className="space-y-4">
      {/* Filters and Search Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Visitor ID, City, or URL..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ONLINE">Active Online</option>
            <option value="IDLE">Idle</option>
          </select>

          {/* Device Filter */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Devices</option>
            <option value="DESKTOP">Desktop</option>
            <option value="MOBILE">Mobile</option>
            <option value="TABLET">Tablet</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ACTIVITY">Sort by: Latest Activity</option>
            <option value="DURATION">Sort by: Session Duration</option>
            <option value="PAGES">Sort by: Pages Viewed</option>
          </select>

          {onRefresh && (
            <Button size="sm" variant="secondary" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Visitor / Device</th>
                <th className="py-3 px-4">Current Page</th>
                <th className="py-3 px-4">Referrer / Channel</th>
                <th className="py-3 px-4 text-center">Pages</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Compass className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-300">No live visitors right now.</span>
                      <span className="text-[11px] text-slate-500 max-w-sm">
                        Visitors browsing your monitored website will appear here in real-time without refreshing.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((v) => {
                  const DeviceIcon = getDeviceIcon(v.deviceType);
                  const isOnline = v.status === 'online';
                  const isIdle = v.status === 'idle';

                  // Calculate real-time duration
                  const durationMs = Math.max(0, Date.now() - new Date(v.startedAt).getTime());

                  return (
                    <tr
                      key={v.sessionId}
                      onClick={() => setSelectedVisitorId(v.id)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            {isOnline && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span
                              className={`relative inline-flex rounded-full h-2 w-2 ${
                                isOnline ? 'bg-emerald-500' : isIdle ? 'bg-amber-500' : 'bg-slate-500'
                              }`}
                            ></span>
                          </span>
                          <span
                            className={`font-semibold capitalize ${
                              isOnline ? 'text-emerald-400' : isIdle ? 'text-amber-400' : 'text-slate-400'
                            }`}
                          >
                            {v.status}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CountryFlag countryCode={v.countryCode} countryName={v.country} />
                          <div className="overflow-hidden max-w-[130px]">
                            <div className="font-medium text-slate-200 truncate">{v.city || 'Unknown'}</div>
                            <div className="text-[11px] text-slate-500 truncate">{v.country}</div>
                          </div>
                        </div>
                      </td>

                      {/* Visitor & Device */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded bg-slate-800 text-slate-400 shrink-0">
                            <DeviceIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-mono text-[11px] text-blue-400 font-semibold truncate max-w-[120px]">
                              {v.id}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {v.browser} on {v.os}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Page */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-[200px]">
                          <div className="font-medium text-slate-200 truncate flex items-center gap-1">
                            <span className="truncate">{v.pageTitle || v.currentPage}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 truncate">
                            {v.currentPage}
                          </div>
                        </div>
                      </td>

                      {/* Referrer & Channel */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="max-w-[140px]">
                          <Badge variant="primary" size="sm" className="mb-0.5">
                            {v.channel || 'Direct'}
                          </Badge>
                          <div className="text-[11px] text-slate-500 truncate" title={v.referrer}>
                            {v.referrer || 'Direct'}
                          </div>
                        </div>
                      </td>

                      {/* Pages Viewed */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                          {v.pageViews || 1}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-300 font-medium">
                        {formatDuration(durationMs)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="text-slate-500 group-hover:text-blue-400 transition inline-flex items-center gap-1 font-semibold text-[11px]">
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      <VisitorDetailModal
        isOpen={Boolean(selectedVisitorId)}
        onClose={() => setSelectedVisitorId(null)}
        websiteId={websiteId}
        visitorId={selectedVisitorId}
      />
    </div>
  );
}
