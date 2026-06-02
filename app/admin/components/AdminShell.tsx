"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface AdminShellProps {
  activePage: 'Dashboard' | 'Users' | 'Orders' | 'Products' | 'Reports' | 'Settings';
  children: React.ReactNode;
}

export default function AdminShell({ activePage, children }: AdminShellProps) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sync Dark Mode state with localStorage and document element
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { label: "Dashboard", icon: "📊", href: "/admin/dashboard", id: "Dashboard" },
    { label: "Users", icon: "👥", href: "/admin/users", id: "Users" },
    { label: "Orders", icon: "🧾", href: "/admin/orders", id: "Orders" },
    { label: "Products", icon: "📦", href: "/admin/products", id: "Products" },
    { label: "Reports", icon: "📈", href: "/admin/reports", id: "Reports" },
    { label: "Settings", icon: "⚙️", href: "/admin/settings", id: "Settings" },
  ];

  // Route Guard protection redirect logic
  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  // Premium loading screen state
  if (loading) {
    return (
      <div className="grid place-items-center min-h-screen bg-linear-to-tr from-brand-50/20 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="admin-loading-spinner" />
          <span className="text-brand-800 dark:text-emerald-400 font-extrabold text-xs tracking-widest uppercase animate-pulse">
            Đang xác thực tài khoản Admin...
          </span>
        </div>
      </div>
    );
  }

  // Prevent rendering dashboard panel to unauthenticated users before redirect triggers
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

      {/* 1. Backdrop Overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-350 flex flex-col justify-between border-r border-slate-200/80 dark:border-slate-850/80
        transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand/Header */}
        <div>
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
            <div>
              <strong className="block text-slate-900 dark:text-white text-base tracking-tight font-black">TrekShield</strong>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Hệ thống điều hành</span>
            </div>

            {/* Close button on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold tracking-wide outline-none transition-all duration-200
                    ${isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-slate-100'
                    }
                  `}
                  id={`admin-nav-${item.id.toLowerCase()}`}
                >
                  <span className="text-lg leading-none shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Sign Out and Home Navigation */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-850/80 space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
          <button
            type="button"
            className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-250 text-slate-650 dark:text-slate-300 dark:border-slate-700/80 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 dark:hover:border-rose-900/50 font-bold text-xs tracking-wide cursor-pointer transition-all flex items-center justify-center gap-2"
            onClick={async () => {
              try {
                await logout();
                router.push('/admin/login');
              } catch (err) {
                console.error("Lỗi đăng xuất:", err);
              }
            }}
          >
            🔓 Đăng xuất
          </button>

          <Link
            href="/"
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-white font-bold text-xs tracking-wide text-center transition-all block"
            id="admin-back-to-home"
          >
            Về trang chính
          </Link>
        </div>
      </aside>

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

        {/* Top Header/Topbar */}
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-850/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors duration-300 shrink-0">
          <div className="flex items-center justify-between h-20 px-6 sm:px-8">

            {/* Left side: Hamburger button + Search */}
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 focus:outline-none"
                aria-label="Mở Sidebar"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="relative max-w-md w-full hidden sm:block">
                <span className="absolute left-3.5 top-2.5 text-sm select-none text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm đơn hàng, khách hàng, số điện thoại..."
                  aria-label="Tìm kiếm"
                  id="admin-global-search"
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Right side Actions */}
            <div className="flex items-center space-x-4">
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-colors"
                title="Chuyển đổi giao diện sáng tối"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              {/* Notifications */}
              <button
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-colors"
                aria-label="Thông báo"
                id="admin-notifications-btn"
              >
                🔔
              </button>

              {/* User profile details */}
              <div className="flex items-center gap-3.5 border-l border-slate-200 dark:border-slate-800 pl-4">
                <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-black select-none shadow">
                  A
                </div>
                <div className="hidden md:block">
                  <strong className="block text-xs font-black text-slate-900 dark:text-white leading-tight">Admin</strong>
                  <span className="text-[10px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider">TrekShield</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Inner Children Layout Content */}
        <main className="flex-1 p-6 sm:p-8 space-y-8 bg-slate-50 dark:bg-slate-950/60 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
