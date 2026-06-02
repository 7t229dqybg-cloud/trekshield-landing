"use client";

import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-linear-to-br from-emerald-50/15 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 font-sans">
      {/* Sidebar Navigation - handles desktop layout and mobile collapsible drawer overlay */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content frame */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Responsive Header with menu toggler */}
        <AdminHeader onMenuToggle={() => setSidebarOpen(true)} />
        
        {/* Main Content Area with fluid padding */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-linear-to-br from-emerald-50/15 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10 text-gray-800 dark:text-gray-200">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
