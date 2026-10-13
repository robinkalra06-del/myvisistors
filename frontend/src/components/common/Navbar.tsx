import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Video, Sun, Moon, LogOut, User as UserIcon, Shield, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isMeetingPage = location.pathname.startsWith('/meet/') || location.pathname.startsWith('/lobby/');

  // Do not render full navbar on meeting rooms to keep screen distraction-free
  if (isMeetingPage) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 glass-panel transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Pulse<span className="text-blue-600 dark:text-blue-400">Meet</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
          <a href="#preview" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Preview</a>
          <a href="#security" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Security</a>
          <a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</a>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
                <span className="hidden sm:inline-block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {user.fullName.split(' ')[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.fullName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    {user.plan && (
                      <span className="mt-1.5 inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {user.plan.name}
                      </span>
                    )}
                  </div>

                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-500" />
                    User Dashboard
                  </Link>

                  {user.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Control Panel
                    </Link>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl shadow-sm shadow-blue-500/20 hover:shadow transition-all"
              >
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
