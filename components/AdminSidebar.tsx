"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartBarIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TagIcon,
  PresentationChartLineIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: ChartBarIcon },
  { name: 'Users', href: '/admin/users', icon: UserGroupIcon },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBagIcon },
  { name: 'Products', href: '/admin/products', icon: TagIcon },
  { name: 'Reports', href: '/admin/reports', icon: PresentationChartLineIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Sidebar Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-64 bg-emerald-50/30 dark:bg-slate-950/70 border-r border-emerald-100/50 dark:border-slate-800/80 p-5 flex flex-col h-screen backdrop-blur-md
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-emerald-100/30 dark:border-slate-800/50">
          <Link href="/admin/dashboard" className="flex items-center space-x-2 select-none">
            <span className="text-lg">🌲</span>
            <span className="text-lg font-black tracking-tight bg-linear-to-r from-emerald-800 via-teal-700 to-emerald-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              TrekShield Ops
            </span>
          </Link>

          {/* Close button for Mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-350 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Menu Navigation Items */}
        <nav className="flex-1 overflow-y-auto space-y-1.5 pr-1" aria-label="Sidebar Navigation">
          <ul className="space-y-1.5">
            {menuItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 outline-none
                      ${isActive
                        ? 'bg-linear-to-r from-emerald-800 to-teal-750 text-white shadow-md border-l-4 border-emerald-500 -ml-1 rounded-l-none pl-3'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-emerald-50/50 dark:hover:bg-slate-800/40 hover:text-emerald-850 dark:hover:text-emerald-300'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Credit */}
        <div className="mt-auto pt-4 border-t border-emerald-100/30 dark:border-slate-800/50 flex flex-col space-y-1">
          <span className="text-xs font-semibold text-emerald-800/60 dark:text-gray-500">
            TrekShield Operations
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>
      </aside>
    </>
  );
}
