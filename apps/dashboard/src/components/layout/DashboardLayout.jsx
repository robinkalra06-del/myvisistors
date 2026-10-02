import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { TopNav } from './TopNav.jsx';

export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* Sidebar navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300
          ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}
        `}
      >
        {/* Top Navbar */}
        <TopNav
          isCollapsed={isCollapsed}
          onMobileMenuClick={() => setIsMobileOpen(true)}
        />

        {/* Dynamic page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 mt-16 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
