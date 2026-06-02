"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LockClosedIcon,
  UserIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface AdminLoginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminLoginDrawer({ isOpen, onClose }: AdminLoginDrawerProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setStatus('error');
      setErrorMessage('Vui lòng điền đầy đủ tài khoản và mật khẩu.');
      return;
    }

    setStatus('loading');

    // Simulate a secure cloud login pipeline
    setTimeout(() => {
      // Mock validation
      if (username.toLowerCase() === 'admin' && password === 'admin') {
        setStatus('success');
        setTimeout(() => {
          onClose();
          router.push('/admin/dashboard');
        }, 800);
      } else {
        setStatus('error');
        setErrorMessage('Tài khoản hoặc mật khẩu không chính xác.');
      }
    }, 1500);
  };

  return (
    <>
      {/* Backdrop blur overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-99 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sliding Login Drawer Panel */}
      <div
        className={`
            fixed top-0 bottom-0 right-0 z-99 w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col
           transition-all duration-300 ease-in-out transform border-l border-emerald-100/55 dark:border-slate-800
           ${isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}
         `}
      >
        {/* Header: Forest canopy banner */}
        <div className="relative bg-linear-to-br from-emerald-800 to-emerald-950 text-white p-6 pb-8 overflow-hidden rounded-bl-3xl shadow-md">
          {/* Subtle nature circle patterns */}
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-emerald-700/20 pointer-events-none" />
          <div className="absolute left-10 bottom-2 w-16 h-16 rounded-full bg-teal-800/10 pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🌲</span>
              <h3 className="text-xl font-bold tracking-tight">TrekShield</h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              aria-label="Đóng khay đăng nhập"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-emerald-250 dark:text-emerald-300/80 mt-3 relative z-10">
            Hệ thống cổng đăng nhập quản lý kho vận, đơn hàng và cấu hình chiến dịch TrekShield Wax.
          </p>
        </div>

        {/* Login Form body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-linear-to-b from-emerald-50/5 to-white dark:from-slate-950 dark:to-slate-900">

          {/* Status feedback alerts */}
          {status === 'error' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start space-x-3 text-xs text-rose-700 dark:text-rose-450 animate-shake">
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Đăng nhập thất bại</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-start space-x-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircleIcon className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Xác thực thành công</p>
                <p className="mt-0.5">Đang thiết lập phiên làm việc và tải trang điều hành...</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tài khoản</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setStatus('idle'); }}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mật khẩu</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setStatus('idle'); }}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-950/40 p-3 rounded-lg border border-gray-150/40 dark:border-slate-850">
              💡 <strong>Gợi ý:</strong> Nhập tài khoản: <code className="font-semibold text-emerald-600">admin</code> và mật khẩu: <code className="font-semibold text-emerald-600">admin</code> để truy cập nhanh mà không cần máy chủ xác thực thực tế.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full mt-4 bg-linear-to-r from-emerald-700 to-teal-650 hover:from-emerald-600 hover:to-teal-550 text-white py-3 rounded-xl text-sm font-bold shadow-md transition-all outline-none duration-250 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>Đang kết nối cổng đám mây...</span>
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Xác thực thành công!</span>
                </>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer Credit */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 text-center text-[10px] text-gray-400 dark:text-gray-650 bg-gray-50 dark:bg-slate-950/20">
          Hệ thống được thiết kế đồng bộ theo chỉ chuẩn bảo mật TrekShield Outdoor.
        </div>
      </div>
    </>
  );
}
