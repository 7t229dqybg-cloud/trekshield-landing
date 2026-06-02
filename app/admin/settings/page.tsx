"use client";

import React, { useState } from 'react';
import AdminShell from '../components/AdminShell';

export default function AdminSettingsPage() {
  const [toggles, setToggles] = useState({
    newOrder: true,
    confirmEmail: true,
    webhookError: true,
    weeklyReport: false,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Đã lưu tất cả thiết lập cấu hình hệ thống TrekShield!');
  };

  return (
    <AdminShell activePage="Settings">
      
      {/* 1. Page Heading */}
      <section className="space-y-2">
        <span className="text-[10px] font-black text-brand-650 dark:text-emerald-455 uppercase tracking-widest block">
          Cấu hình toàn hệ thống
        </span>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          Settings Hệ Thống
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-4xl leading-relaxed">
          Thiết lập thông tin hiển thị thương hiệu TrekShield, định dạng Webhook tích hợp Google Sheet và các cổng cảnh báo thông báo tự động.
        </p>
      </section>

      {/* 2. Main Settings Form Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Column 1: Store & Webhook settings */}
        <div className="space-y-8">
          {/* Brand Info Card */}
          <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                Thông tin thương hiệu
              </h2>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                Cấu hình thông tin cơ bản hiển thị trên Landing Page
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-450 uppercase tracking-wider block">Tên thương hiệu</label>
                <input type="text" defaultValue="TrekShield" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Hotline hỗ trợ</label>
                <input type="text" defaultValue="0382373666" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Email hỗ trợ</label>
                <input type="email" defaultValue="trekshield0@gmail.com" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Khu vực giao hàng</label>
                <input type="text" defaultValue="Toàn quốc hỏa tốc" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>
            </div>
          </article>

          {/* Webhook Card */}
          <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                Tích hợp dữ liệu (Webhook)
              </h2>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                Kết nối đơn hàng của Landing Page với Google Sheets tự động
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Google Sheet Webhook URL</label>
                <input type="url" defaultValue="https://script.google.com/macros/s/AKfycbzTrekShieldLanding/exec" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Order Webhook Secret</label>
                <input type="password" value="••••••••••••" readOnly className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 outline-none cursor-not-allowed select-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Nguồn đơn hàng nhãn</label>
                <input type="text" defaultValue="trekshield-landing" readOnly className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-500 outline-none cursor-not-allowed select-none" />
              </div>
            </div>
          </article>
        </div>

        {/* Column 2: Notification & Account settings */}
        <div className="space-y-8">
          {/* Notification settings card */}
          <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                Thiết lập thông báo tự động
              </h2>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                Quản lý cảnh báo các cổng sự kiện kinh doanh và lưu kho
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-855 space-y-4">
              {[
                { key: 'newOrder' as const, title: 'Cảnh báo Slack/Telegram đơn mới', desc: 'Bắn tin nhắn thông báo tức thì khi có người dùng hoàn tất đặt sáp.' },
                { key: 'confirmEmail' as const, title: 'Tự động gửi email khách hàng', desc: 'Gửi thư biên lai tự động hướng dẫn bôi sáp khi đơn hàng hoàn thành.' },
                { key: 'webhookError' as const, title: 'Cảnh báo lỗi Google Sheets', desc: 'Thông báo khẩn cấp cho admin khi đồng bộ API Webhook bị gián đoạn.' },
                { key: 'weeklyReport' as const, title: 'Báo cáo doanh số hằng tuần', desc: 'Nhận thư phân tích hiệu suất lưu kho vào sáng thứ Hai hằng tuần.' }
              ].map((toggle, idx) => (
                <div key={idx} className="flex items-center justify-between pt-4">
                  <div className="max-w-[280px]">
                    <strong className="block text-xs font-bold text-slate-900 dark:text-white">{toggle.title}</strong>
                    <span className="block text-[10px] text-slate-450 dark:text-slate-500 leading-normal font-semibold mt-0.5">{toggle.desc}</span>
                  </div>
                  
                  {/* Slider Toggle Switches */}
                  <button
                    type="button"
                    onClick={() => handleToggle(toggle.key)}
                    className={`
                      w-12 h-6.5 rounded-full transition-all duration-300 flex items-center p-0.5 border-none outline-none cursor-pointer shrink-0
                      ${toggles[toggle.key] ? 'bg-brand-500 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'}
                    `}
                  >
                    <span className="w-5.5 h-5.5 rounded-full bg-white shadow" />
                  </button>
                </div>
              ))}
            </div>
          </article>

          {/* Account card */}
          <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                Tài khoản Quản trị viên
              </h2>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                Hồ sơ định danh bảo mật admin điều hành hệ thống
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Tên hiển thị</label>
                <input type="text" defaultValue="Admin TrekShield" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Vai trò hạn định</label>
                <input type="text" value="System Administrator" readOnly className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold text-slate-400 dark:text-slate-550 outline-none cursor-not-allowed select-none" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 dark:text-slate-455 uppercase tracking-wider block">Đổi mật khẩu mới</label>
                <input type="password" placeholder="Nhập mật khẩu mới bảo mật tại đây" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all" />
              </div>
            </div>
          </article>
        </div>
      </form>

      {/* Save Button Bar */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-8 py-3.5 rounded-xl bg-linear-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-extrabold text-xs shadow-md shadow-brand-500/10 hover:shadow-lg hover:shadow-brand-500/25 active:scale-98 transition-all cursor-pointer border-none outline-none select-none"
        >
          Lưu thay đổi thiết lập
        </button>
      </div>
    </AdminShell>
  );
}
