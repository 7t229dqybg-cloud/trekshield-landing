import React from 'react';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon, Bars3Icon } from '@heroicons/react/24/outline';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  return (
    <header className="flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-emerald-100/40 dark:border-slate-800/80 px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        {/* Hamburger Menu Toggle for Mobile/Tablet */}
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg lg:hidden hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        
        {/* Modern search bar input with integrated search icon */}
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-emerald-600/75 dark:text-emerald-450 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="border border-emerald-100/50 dark:border-slate-700 rounded-lg pl-10 pr-4 py-1.5 w-40 sm:w-60 focus:outline-none focus:ring-2 focus:ring-emerald-550/40 focus:border-emerald-550 bg-emerald-50/10 dark:bg-slate-950 text-gray-800 dark:text-gray-200 transition-all text-sm outline-none focus:bg-white dark:focus:bg-slate-950"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notification bell with indicator */}
        <button className="relative p-2 rounded-full hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
        </button>
        
        {/* User profile section */}
        <div className="relative">
          <button className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors">
            <UserCircleIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-450" />
            <span className="hidden sm:inline-block text-sm font-bold text-emerald-850 dark:text-emerald-300 pr-1">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}

