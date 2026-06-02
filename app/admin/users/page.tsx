"use client";

import React, { useState, useMemo, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface User {
  id: string;
  name: string;
  phone: string;
  location: string;
  ordersCount: number;
  totalSpent: string;
  status: 'Active' | 'Lead' | 'Inactive';
  createdAt: string;
  type: 'Khách mới' | 'Khách quay lại' | 'Có đơn hàng' | 'Khác';
}

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Tất cả' | 'Khách mới' | 'Khách quay lại' | 'Có đơn hàng'>('Tất cả');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let localOrdersList: any[] = [];
    setIsLoading(true);

    async function loadLocalOrders() {
      try {
        const res = await fetch("/api/admin/orders");
        const resData = await res.json();
        if (resData && resData.ok && Array.isArray(resData.orders)) {
          localOrdersList = resData.orders;
        }
      } catch (localErr) {
        console.error("Error loading local orders cache:", localErr);
      }
    }

    let unsubscribeFirestore: () => void = () => { };

    loadLocalOrders().finally(() => {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, "orders"), (snapshot) => {
          const fetchedFirestoreOrders: any[] = [];
          snapshot.forEach((doc) => {
            fetchedFirestoreOrders.push({ id: doc.id, ...doc.data() });
          });

          // Tránh nạp trùng lặp
          const merged = [...fetchedFirestoreOrders];
          localOrdersList.forEach((localOrder) => {
            const exists = merged.some(o =>
              o.id === localOrder.id ||
              (o.phone === localOrder.phone && o.date === localOrder.date && o.total === localOrder.total)
            );
            if (!exists) {
              merged.push(localOrder);
            }
          });

          // Nhóm các đơn hàng theo số điện thoại khách hàng
          const ordersMap = new Map<string, any[]>();
          merged.forEach((order) => {
            const phone = order.phone || '';
            if (phone) {
              if (!ordersMap.has(phone)) {
                ordersMap.set(phone, []);
              }
              ordersMap.get(phone)!.push(order);
            }
          });

          const fetchedUsers: User[] = [];
          let index = 1;

          ordersMap.forEach((userOrders, phone) => {
            userOrders.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

            const latestOrder = userOrders[userOrders.length - 1];
            const oldestOrder = userOrders[0];

            let totalSpentNum = 0;
            userOrders.forEach(o => {
              if (o.status === "Completed") {
                let amount = 0;
                if (typeof o.total === 'string') {
                  amount = parseInt(o.total.replace(/[^0-9]/g, '')) || 0;
                } else if (typeof o.total === 'number') {
                  amount = o.total;
                }
                totalSpentNum += amount;
              }
            });

            fetchedUsers.push({
              id: `U${String(index++).padStart(3, '0')}`,
              name: latestOrder.customer || latestOrder.name || 'Khách hàng',
              phone: phone,
              location: latestOrder.location || 'Chưa xác định',
              ordersCount: userOrders.length,
              totalSpent: `${totalSpentNum}K`,
              status: userOrders.some(o => o.status === 'Completed') ? 'Active' : (userOrders.some(o => o.status === 'Pending') ? 'Lead' : 'Inactive'),
              createdAt: oldestOrder.date || (oldestOrder.createdAt ? new Date(oldestOrder.createdAt).toLocaleDateString('vi-VN') : ''),
              type: userOrders.length > 1 ? 'Khách quay lại' : 'Khách mới'
            });
          });

          setUsers(fetchedUsers);
          setIsLoading(false);
        }, (fsErr) => {
          console.error("Firestore listener error, using cache fallback:", fsErr);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Failed to setup Firestore listener:", err);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Filter users based on search term and selected tab
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm) ||
        user.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'Tất cả') return true;
      if (activeTab === 'Khách mới') return user.type === 'Khách mới';
      if (activeTab === 'Khách quay lại') return user.type === 'Khách quay lại';
      if (activeTab === 'Có đơn hàng') return user.ordersCount > 0;

      return true;
    });
  }, [users, searchTerm, activeTab]);

  const dynamicStats = useMemo(() => {
    let newUsers = 0;
    let returningUsers = 0;
    let convertingCount = 0;

    users.forEach(u => {
      if (u.type === 'Khách mới') newUsers++;
      else if (u.type === 'Khách quay lại') returningUsers++;
      if (u.ordersCount > 0) convertingCount++;
    });

    const conversionRate = users.length > 0 ? Math.round((convertingCount / users.length) * 100) : 0;

    return {
      total: users.length,
      newUsers,
      returningUsers,
      conversionRate
    };
  }, [users]);

  return (
    <AdminShell activePage="Users">

      {/* 1. Page Heading */}
      <section className="space-y-2">
        <span className="text-[10px] font-black text-brand-650 dark:text-emerald-455 uppercase tracking-widest block">
          Quản lý quan hệ khách hàng (CRM)
        </span>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          Danh Sách Khách Hàng
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-4xl leading-relaxed">
          Tra cứu, quản lý hồ sơ tiêu dùng và phân chia phân khúc khách hàng của TrekShield.
        </p>
      </section>

      {/* 2. CRM Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Tổng số khách hàng", val: dynamicStats.total, icon: "👥", sub: "+8% tháng này", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Khách hàng mới", val: dynamicStats.newUsers, icon: "🆕", sub: "+12% hôm nay", color: "text-brand-600 dark:text-emerald-400" },
          { label: "Khách quay lại", val: dynamicStats.returningUsers, icon: "🔄", sub: `${users.length > 0 ? ((dynamicStats.returningUsers / users.length) * 100).toFixed(1) : 0}% quay lại`, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Tỷ lệ mua hàng", val: `${dynamicStats.conversionRate}%`, icon: "📈", sub: "+2.4% mục tiêu", color: "text-teal-650 dark:text-teal-400" }
        ].map((s, idx) => (
          <article key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">{s.label}</span>
              <span className="text-xl select-none">{s.icon}</span>
            </div>
            <div className="mt-4 space-y-1">
              <strong className="block text-3xl font-black text-slate-950 dark:text-white tracking-tight">{s.val}</strong>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${s.color}`}>{s.sub}</span>
            </div>
          </article>
        ))}
      </section>

      {/* 3. CRM Filters block */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(['Tất cả', 'Khách mới', 'Khách quay lại', 'Có đơn hàng'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold tracking-wide outline-none transition-all cursor-pointer border-none
                ${activeTab === tab
                  ? 'bg-brand-500 text-white shadow shadow-brand-500/10'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                }
              `}
            >
              {tab === 'Tất cả' ? '👥 Tất cả' : tab === 'Khách mới' ? '🆕 Khách mới' : tab === 'Khách quay lại' ? '🔄 Khách quay lại' : '🧾 Có đơn hàng'}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm w-full sm:w-[280px]">
          <span className="absolute left-3.5 top-2.5 text-sm select-none text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Lọc tên, điện thoại, tỉnh..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
          />
        </div>
      </section>

      {/* 4. CRM Users List Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
            Danh sách hồ sơ người dùng
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
            Chi tiết phân khúc và lịch sử mua sáp TrekShield
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">ID</th>
                <th className="py-3 px-4 font-bold">Họ và tên</th>
                <th className="py-3 px-4 font-bold">Số điện thoại</th>
                <th className="py-3 px-4 font-bold">Khu vực</th>
                <th className="py-3 px-4 font-bold text-center">Số đơn mua</th>
                <th className="py-3 px-4 font-bold">Tổng chi tiêu</th>
                <th className="py-3 px-4 font-bold">Hoạt động</th>
                <th className="py-3 px-4 font-bold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-medium">

              {/* SKELETON SHIMMER LOADER */}
              {isLoading ? (
                Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-10 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-28 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-20 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-24 rounded animate-pulse" /></td>
                    <td className="py-4 px-4 text-center"><div className="shimmer h-4 w-6 rounded mx-auto animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-12 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-5 w-16 rounded-full animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-16 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  let badgeColor = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
                  if (user.status === "Active") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
                  } else if (user.status === "Inactive") {
                    badgeColor = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800";
                  }

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{user.id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-850 dark:text-slate-200">{user.name}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">{user.phone}</td>
                      <td className="py-3.5 px-4">{user.location}</td>
                      <td className="py-3.5 px-4 font-bold text-center">{user.ordersCount}</td>
                      <td className="py-3.5 px-4 font-black text-brand-650 dark:text-emerald-400">{user.totalSpent}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                          {user.status === "Active" ? "Active" : user.status === "Lead" ? "Lead" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-450 dark:text-slate-500">{user.createdAt}</td>
                    </tr>
                  );
                })
              ) : (
                /* EMPTY STATE DISPLAY CRM */
                <tr>
                  <td colSpan={8} className="py-16 text-center space-y-4">
                    <div className="text-5xl select-none animate-bounce">👥</div>
                    <div className="space-y-1">
                      <strong className="block text-sm font-black text-slate-700 dark:text-slate-300">
                        Không tìm thấy khách hàng nào phù hợp
                      </strong>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Vui lòng lọc từ khóa tìm kiếm khác hoặc chuyển phân khúc tab để thử lại.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CRM Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 text-[10px] text-slate-450 dark:text-slate-500 font-black uppercase tracking-wider">
          <span>Trang 1 / 1</span>
          <div className="flex gap-2">
            <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Trước
            </button>
            <button className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Sau
            </button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
