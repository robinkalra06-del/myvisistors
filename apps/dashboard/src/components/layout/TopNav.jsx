import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWebsite } from '../../context/WebsiteContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { LiveIndicator } from '../common/LiveIndicator.jsx';
import {
  Menu,
  ChevronDown,
  Globe,
  Plus,
  Moon,
  Sun,
  Bell,
  LogOut,
  ExternalLink,
  Shield,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function TopNav({ isCollapsed, onMobileMenuClick }) {
  const { user, logout } = useAuth();
  const { websites, currentWebsite, selectWebsite, liveCount, socketConnected } = useWebsite();
  const { theme, toggleTheme } = useTheme();

  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const siteDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target)) {
        setSiteDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-[#0d131f]/90 backdrop-blur-md border-b border-slate-800 transition-all duration-300 flex items-center justify-between px-4 sm:px-6
        ${isCollapsed ? 'left-20' : 'left-0 lg:left-64'}
      `}
    >
      {/* Left section: mobile hamburger + website selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuClick}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Website Selector Dropdown */}
        <div className="relative" ref={siteDropdownRef}>
          <button
            onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition"
          >
            <div className="h-6 w-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div className="max-w-[140px] sm:max-w-[180px] overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">
                {currentWebsite ? currentWebsite.name : 'Select Website'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {currentWebsite ? currentWebsite.domain : 'No site selected'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Dropdown Menu */}
          {siteDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-xl bg-[#111827] border border-slate-800 shadow-2xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Monitored Websites
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {websites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => {
                      selectWebsite(site);
                      setSiteDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-800/80
                      ${currentWebsite?.id === site.id ? 'bg-blue-600/10 text-blue-400' : 'text-slate-300'}
                    `}
                  >
                    <div className="overflow-hidden">
                      <div className="font-medium text-xs truncate">{site.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{site.domain}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {site.activeVisitors || 0} live
                      </span>
                      {currentWebsite?.id === site.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2 mt-1 border-t border-slate-800 px-3">
                <Link
                  to="/websites"
                  onClick={() => setSiteDropdownOpen(false)}
                  className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 py-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Website</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* View Monitored site link */}
        {currentWebsite && (
          <a
            href={`http://${currentWebsite.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open website in new tab"
            className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Right section: Live badge + Notifications + User menu */}
      <div className="flex items-center gap-3">
        {/* Real-time Live indicator */}
        <LiveIndicator count={liveCount} connected={socketConnected} />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Icon */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500"></span>
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-800/80 transition"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#111827] border border-slate-800 shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-800">
                <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/60">
                  <Shield className="w-3 h-3" />
                  {user?.role}
                </div>
              </div>

              <div className="py-1 text-xs">
                <Link
                  to="/settings"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Account Settings
                </Link>
                <Link
                  to="/team"
                  onClick={() => setUserDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  Team Members
                </Link>
                {user?.role === 'SUPER_ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                  >
                    Super Admin Console
                  </Link>
                )}
              </div>

              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
