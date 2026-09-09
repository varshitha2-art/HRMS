import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';

export const MainLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex overflow-x-hidden relative">

      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          <Outlet />
        </main>

        <footer className="py-4 px-8 border-t border-slate-200/80 bg-white/70 backdrop-blur-sm text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 VPHS Services Pvt. Ltd. All rights reserved.</span>
          <span className="text-[11px] text-amber-700 font-semibold font-mono">
            Facility Management & Enterprise HR ERP
          </span>
        </footer>
      </div>
    </div>
  );
};
