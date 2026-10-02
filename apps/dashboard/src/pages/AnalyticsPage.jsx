import React, { useState, useEffect } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { analyticsService } from '../services/analytics.service.js';
import { StatCard } from '../components/ui/StatCard.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TrafficChart } from '../components/analytics/TrafficChart.jsx';
import { GeoDistribution } from '../components/analytics/GeoDistribution.jsx';
import { DeviceBreakdown } from '../components/analytics/DeviceBreakdown.jsx';
import { TopPagesTable } from '../components/analytics/TopPagesTable.jsx';
import { ReferrersTable } from '../components/analytics/ReferrersTable.jsx';
import { formatDuration } from '@livetrack/shared';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Eye,
  Clock,
  Repeat,
  Compass
} from 'lucide-react';

export function AnalyticsPage() {
  const { currentWebsite } = useWebsite();
  const [range, setRange] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [geography, setGeography] = useState({ countries: [], cities: [] });
  const [technology, setTechnology] = useState({ devices: [], browsers: [], operatingSystems: [] });
  const [pages, setPages] = useState({ topPages: [], landingPages: [], exitPages: [] });
  const [acquisition, setAcquisition] = useState({ channels: [], referrers: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    if (!currentWebsite) return;
    try {
      setLoading(true);
      const [ov, tr, geo, tech, pg, acq] = await Promise.all([
        analyticsService.getOverview(currentWebsite.publicId, range),
        analyticsService.getTraffic(currentWebsite.publicId, range),
        analyticsService.getGeography(currentWebsite.publicId),
        analyticsService.getTechnology(currentWebsite.publicId),
        analyticsService.getPages(currentWebsite.publicId),
        analyticsService.getAcquisition(currentWebsite.publicId)
      ]);
      setOverview(ov);
      setTraffic(tr);
      setGeography(geo);
      setTechnology(tech);
      setPages(pg);
      setAcquisition(acq);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [currentWebsite, range]);

  const handleExport = async (type) => {
    if (!currentWebsite) return;
    try {
      setExporting(true);
      const csv = await analyticsService.exportCsv(currentWebsite.publicId, type);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livetrack-${currentWebsite.publicId}-${type}-${range}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (!currentWebsite) {
    return (
      <div className="py-24 text-center text-slate-400">
        Please select a website to view traffic analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Traffic & Audience Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated traffic statistics, acquisition channels, and technology metrics.
          </p>
        </div>

        {/* Date Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs flex gap-1">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRange(t.id)}
                className={`px-3 py-1 rounded font-medium transition ${
                  range === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => handleExport('traffic')} isLoading={exporting}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Visitors"
          value={overview?.uniqueVisitors ?? 0}
          icon={Users}
        />
        <StatCard
          title="Total Page Views"
          value={overview?.totalPageViewsAllTime ?? 0}
          icon={Eye}
        />
        <StatCard
          title="Bounce Rate"
          value={`${overview?.bounceRatePercentage ?? 0}%`}
          icon={Repeat}
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration((overview?.avgSessionDurationSeconds || 0) * 1000)}
          icon={Clock}
        />
        <StatCard
          title="Pages / Session"
          value={overview?.avgPagesPerSession ?? '1.0'}
          icon={Compass}
        />
        <StatCard
          title="Returning Rate"
          value={`${Math.round(((overview?.returningVisitors || 0) / (overview?.uniqueVisitors || 1)) * 100)}%`}
          icon={Users}
        />
      </div>

      {/* Traffic Trend Chart */}
      <Card>
        <TrafficChart data={traffic} />
      </Card>

      {/* Mid Grid: Geography & Tech */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Geographic Breakdown" subtitle="Audience by country and city">
          <GeoDistribution countries={geography.countries} cities={geography.cities} />
        </Card>

        <Card title="Technology & Devices" subtitle="Hardware, browsers, and operating systems">
          <DeviceBreakdown
            devices={technology.devices}
            browsers={technology.browsers}
            operatingSystems={technology.operatingSystems}
          />
        </Card>
      </div>

      {/* Bottom Grid: Pages & Acquisition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Top Visited Pages"
          subtitle="Top visited content paths"
          action={
            <Button size="sm" variant="ghost" onClick={() => handleExport('pages')}>
              <Download className="w-3 h-3 mr-1" /> Export Pages
            </Button>
          }
        >
          <TopPagesTable pages={pages.topPages} />
        </Card>

        <Card title="Acquisition & Referrers" subtitle="Where your visitors arrive from">
          <ReferrersTable channels={acquisition.channels} referrers={acquisition.referrers} />
        </Card>
      </div>
    </div>
  );
}
