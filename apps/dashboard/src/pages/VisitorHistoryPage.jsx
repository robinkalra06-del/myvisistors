import React, { useState, useEffect } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { analyticsService } from '../services/analytics.service.js';
import { CountryFlag } from '../components/common/CountryFlag.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { VisitorDetailModal } from '../components/visitors/VisitorDetailModal.jsx';
import { formatDuration } from '@livetrack/shared';
import { Search, ChevronLeft, ChevronRight, History, Monitor, Smartphone, Tablet } from 'lucide-react';

export function VisitorHistoryPage() {
  const { currentWebsite } = useWebsite();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVisitorId, setSelectedVisitorId] = useState(null);

  const fetchHistory = async (page = 1) => {
    if (!currentWebsite) return;
    try {
      setLoading(true);
      const data = await analyticsService.getVisitorHistory(currentWebsite.publicId, {
        page,
        limit: pagination.limit,
        search,
        device: deviceFilter
      });
      setSessions(data.sessions || []);
      setPagination(data.pagination || { page, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [currentWebsite, deviceFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHistory(1);
  };

  const getDeviceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Visitor Session History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical log of all visitor sessions, paths, and interactions.
          </p>
        </div>

        {/* Search & Filters */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search session token or ID..."
              className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>

          <Button size="sm" type="submit">Search</Button>
        </form>
      </div>

      {/* Sessions Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Session Token</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Device / System</th>
                <th className="py-3 px-4">Landing Page</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-center">Page Views</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-right">Date & Time</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
                    <p>Loading session logs...</p>
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500">
                    No historical sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const DeviceIcon = getDeviceIcon(s.deviceType);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedVisitorId(s.visitorId)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono text-blue-400 font-medium">
                        {s.sessionToken}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <CountryFlag countryCode={s.countryCode} countryName={s.country} />
                          <div>
                            <div className="text-slate-200">{s.city || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-500">{s.country}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <DeviceIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.browser} ({s.os})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {s.landingPage || '/'}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="primary" size="sm">{s.channel || 'Direct'}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                        {s.pageViewCount || 1}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatDuration((s.durationSeconds || 0) * 1000)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">
                        {new Date(s.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button size="sm" variant="ghost" className="text-blue-400">
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{sessions.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{pagination.total}</span> total sessions
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page <= 1}
              onClick={() => fetchHistory(pagination.page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <span className="font-medium text-slate-300">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchHistory(pagination.page + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      <VisitorDetailModal
        isOpen={Boolean(selectedVisitorId)}
        onClose={() => setSelectedVisitorId(null)}
        websiteId={currentWebsite?.publicId}
        visitorId={selectedVisitorId}
      />
    </div>
  );
}
