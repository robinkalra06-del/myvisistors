import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWebsite } from '../../context/WebsiteContext.jsx';
import {
  LayoutDashboard,
  Users,
  History,
  Globe,
  Code2,
  BarChart3,
  Sparkles,
  Activity,
  Bell,
  UserCheck,
  ShieldAlert,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function Sidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const { user } = useAuth();
  const { liveCount } = useWebsite();

  const navigation = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Live Visitors', to: '/live', icon: Users, badge: liveCount > 0 ? liveCount : null },
    { name: 'Visitor History', to: '/history', icon: History },
    { name: 'Websites', to: '/websites', icon: Globe },
    { name: 'Tracking Setup', to: '/installation', icon: Code2 },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    { name: 'Custom Events', to: '/events', icon: Sparkles },
    { name: 'Activity Feed', to: '/activity', icon: Activity },
    { name: 'Notifications', to: '/notifications', icon: Bell },
    { name: 'Team Members', to: '/team', icon: UserCheck },
    ...(user?.role === 'SUPER_ADMIN' ? [{ name: 'Admin Panel', to: '/admin', icon: ShieldAlert }] : []),
    { name: 'Settings', to: '/settings', icon: Settings },
    { name: 'Documentation', to: '/docs', icon: BookOpen }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#0d131f] border-r border-slate-800 transition-all duration-300 flex flex-col
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Activity className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Live<span className="text-blue-500">Track</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block -mt-1">
                  Visitor Intelligence
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative
                ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {item.badge !== null && item.badge !== undefined && (
                <span className={`ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ${isCollapsed ? 'hidden' : 'inline-block'}`}>
                  {item.badge}
                </span>
              )}

              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer profile snippet */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-blue-400 shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-slate-200 truncate">{user?.name || 'User'}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.role || 'Viewer'}</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
