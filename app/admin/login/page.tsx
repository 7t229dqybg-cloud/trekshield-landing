"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize dark theme state with local storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // If user is already authenticated, bypass login screen
  useEffect(() => {
    if (!loading && user) {
      router.push('/admin/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await login(email, password);
      router.push('/admin/dashboard');
    } catch (err) {
      const authError = err as { code?: string };
      console.error("Lỗi đăng nhập Firebase:", authError);

      switch (authError.code) {
        case 'auth/invalid-email':
          setErrorMsg("Địa chỉ email không đúng định dạng.");
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setErrorMsg("Email hoặc mật khẩu quản trị không chính xác.");
          break;
        case 'auth/too-many-requests':
          setErrorMsg("Tài khoản bị tạm khóa do đăng nhập sai nhiều lần. Hãy quay lại sau.");
          break;
        default:
          setErrorMsg("Xác thực thất bại. Vui lòng kiểm tra lại kết nối.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Intermediate Auth loading state
  if (loading || user) {
    return (
      <div className="grid place-items-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="admin-loading-spinner" />
          <span className="text-brand-800 dark:text-emerald-450 font-extrabold text-xs tracking-widest uppercase animate-pulse">
            Đang tải phiên làm việc...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      {/* Background soft blurs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-brand-500/5 dark:bg-brand-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 lg:p-10 shadow-2xl relative transition-all duration-300">

        {/* Header/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-emerald-400 text-3xl items-center justify-center mb-4 shadow-sm select-none">
            🛡️
          </div>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
            TrekShield
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Đăng nhập hệ thống quản trị TrekShield Wax
          </p>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-4 bg-rose-55/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-455 font-bold leading-relaxed mb-6 flex items-start gap-2.5 animate-shake">
            <span className="text-sm select-none">⚠️</span>
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Admin Email
            </label>
            <input
              type="email"
              placeholder="nhap.email@trekshield.vn"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrorMsg(null); }}
              required
              disabled={isSubmitting}
              autoComplete="username"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrorMsg(null); }}
              required
              disabled={isSubmitting}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 inline-flex items-center justify-center gap-2 py-3 bg-linear-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-brand-500/10 hover:shadow-lg hover:shadow-brand-500/25 active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed select-none"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng Nhập</span>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-850">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-emerald-450 hover:underline focus:outline-none"
          >
            ← Quay về Landing Page chính
          </Link>
        </div>
      </div>
    </div>
  );
}
