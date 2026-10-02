import React, { useState, useEffect } from 'react';
import { useWebsite } from '../context/WebsiteContext.jsx';
import { analyticsService } from '../services/analytics.service.js';
import { socketService } from '../services/socket.service.js';
import { StatCard } from '../components/ui/StatCard.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TrafficChart } from '../components/analytics/TrafficChart.jsx';
import { GeoDistribution } from '../components/analytics/GeoDistribution.jsx';
import { DeviceBreakdown } from '../components/analytics/DeviceBreakdown.jsx';
import { TopPagesTable } from '../components/analytics/TopPagesTable.jsx';
import { ReferrersTable } from '../components/analytics/ReferrersTable.jsx';
import { formatDuration } from '@livetrack/shared';
import { SOCKET_EVENTS } from '@livetrack/shared';
import {
  Users,
  Eye,
  Clock,
  Compass,
  Repeat,
  Activity,
  ArrowRight,
  TrendingUp,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function OverviewPage() {
  const { currentWebsite, liveCount } = useWebsite();
  const [overview, setOverview] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [geography, setGeography] = useState({ countries: [], cities: [] });
  const [technology, setTechnology] = useState({ devices: [], browsers: [], operatingSystems: [] });
  const [pages, setPages] = useState({ topPages: [], landingPages: [] });
  const [acquisition, setAcquisition] = useState({ channels: [], referrers: [] });
  const [recentFeed, setRecentFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  const loadData = async () => {
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
      console.error('Failed to load overview analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWebsite, range]);

  // Real-time live activity listener
  useEffect(() => {
    if (!currentWebsite) return;

    const unsubs = [
      socketService.on(SOCKET_EVENTS.VISITOR_NEW, (data) => {
        setRecentFeed(prev => [
          {
            id: Date.now(),
            text: `New visitor arrived from ${data.visitor?.country || 'Unknown'} (${data.visitor?.city || 'Unknown'})`,
            time: 'Just now',
            type: 'new'
          },
          ...prev.slice(0, 7)
        ]);
      }),
      socketService.on(SOCKET_EVENTS.VISITOR_PAGEVIEW, (data) => {
        setRecentFeed(prev => [
          {
            id: Date.now(),
            text: `Visitor opened "${data.title || data.path}"`,
            time: 'Just now',
            type: 'pageview'
          },
          ...prev.slice(0, 7)
        ]);
      }),
      socketService.on(SOCKET_EVENTS.VISITOR_EVENT, (data) => {
        setRecentFeed(prev => [
          {
            id: Date.now(),
            text: `Action triggered: "${data.eventName}"`,
            time: 'Just now',
            type: 'event'
          },
          ...prev.slice(0, 7)
        ]);
      })
    ];

    return () => unsubs.forEach(u => u && u());
  }, [currentWebsite]);

  if (!currentWebsite) {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Monitored Websites Registered</h2>
        <p className="text-sm text-slate-400 mb-6">
          Add your website to generate your tracking code and start monitoring live visitors in real time.
        </p>
        <Link to="/websites">
          <Button>Register Your First Website</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>{currentWebsite.name}</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
              {currentWebsite.domain}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics and visitor activity intelligence.
          </p>
        </div>

        {/* Date Filter & Quick Links */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs flex gap-1">
            {['today', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded font-medium transition ${
                  range === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          <Link to="/live">
            <Button size="sm" variant="primary">
              <Users className="w-4 h-4 mr-1" />
              Live Monitor ({liveCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Currently Online"
          value={liveCount}
          live={true}
          icon={Users}
        />
        <StatCard
          title="Visitors Today"
          value={overview?.totalVisitorsToday ?? 0}
          change="+18%"
          isPositive={true}
          icon={TrendingUp}
        />
        <StatCard
          title="Page Views Today"
          value={overview?.totalPageViewsToday ?? 0}
          change="+24%"
          isPositive={true}
          icon={Eye}
        />
        <StatCard
          title="Unique Visitors"
          value={overview?.uniqueVisitors ?? 0}
          icon={Compass}
        />
        <StatCard
          title="Avg Session Duration"
          value={formatDuration((overview?.avgSessionDurationSeconds || 0) * 1000)}
          icon={Clock}
        />
        <StatCard
          title="Bounce Rate"
          value={`${overview?.bounceRatePercentage ?? 0}%`}
          change="-4%"
          isPositive={true}
          icon={Repeat}
        />
        <StatCard
          title="Pages Per Session"
          value={overview?.avgPagesPerSession ?? '1.0'}
          icon={Eye}
        />
        <StatCard
          title="New vs Returning"
          value={`${overview?.returningVisitors ?? 0} ret.`}
          unit={`/ ${overview?.newVisitors ?? 0} new`}
          icon={Users}
        />
      </div>

      {/* Main Charts & Live Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart (2 cols) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <TrafficChart data={traffic} />
          </Card>
        </div>

        {/* Live Visitor Activity Stream (1 col) */}
        <div>
          <Card
            title="Live Activity Stream"
            subtitle="Real-time visitor interactions"
            action={
              <Link to="/activity" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="space-y-3 pt-2">
              {recentFeed.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Activity className="w-6 h-6 mx-auto mb-2 text-slate-600 animate-pulse" />
                  Listening for real-time events...
                </div>
              ) : (
                recentFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between animate-fade-in"
                  >
                    <span className="text-slate-200 truncate max-w-[190px]">{item.text}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Pages */}
        <Card
          title="Top Visited Pages"
          subtitle="Most viewed paths"
          action={
            <Link to="/analytics" className="text-xs text-blue-400 hover:text-blue-300">
              Details
            </Link>
          }
        >
          <TopPagesTable pages={pages.topPages} />
        </Card>

        {/* Geographic Distribution */}
        <Card
          title="Top Countries"
          subtitle="Visitor locations"
          action={
            <Link to="/analytics" className="text-xs text-blue-400 hover:text-blue-300">
              Details
            </Link>
          }
        >
          <GeoDistribution countries={geography.countries} cities={geography.cities} />
        </Card>

        {/* Technology Breakdown */}
        <Card
          title="Devices & Browsers"
          subtitle="Technology breakdown"
          action={
            <Link to="/analytics" className="text-xs text-blue-400 hover:text-blue-300">
              Details
            </Link>
          }
        >
          <DeviceBreakdown
            devices={technology.devices}
            browsers={technology.browsers}
            operatingSystems={technology.operatingSystems}
          />
        </Card>
      </div>
    </div>
  );
}
