/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Order {
  id: string;
  customer: string;
  phone: string;
  product: string;
  qty: number;
  total: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  date: string;
  paymentMethod?: string;
}

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Tất cả' | 'Pending' | 'Completed' | 'Cancelled'>('Tất cả');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/orders/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (data && data.ok) {
        console.log("3-way sync successful:", data.stats);
      } else {
        console.error("Sync failed:", data.message);
      }
    } catch (err) {
      console.error("Error triggering sync:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setTimeout(() => triggerSync(), 0);
  }, []);

  useEffect(() => {
    let localOrdersList: Order[] = [];

    // 1. Tải đơn hàng cache cục bộ qua API
    async function loadLocalOrders() {
      try {
        const res = await fetch("/api/admin/orders");
        const resData = await res.json();
        if (resData && resData.ok && Array.isArray(resData.orders)) {
          localOrdersList = resData.orders.map((localOrder: any) => ({
            id: localOrder.id || `local_${Date.now()}`,
            customer: localOrder.customer || localOrder.name || 'Khách hàng',
            phone: localOrder.phone || '',
            product: localOrder.product || 'Sáp TrekShield',
            qty: localOrder.qty || Number(localOrder.quantity) || 1,
            total: localOrder.total || '180K',
            status: localOrder.status || 'Pending',
            paymentMethod: localOrder.paymentMethod || 'Tiền mặt',
          }));
        }
      } catch (localErr) {
        console.error("Error loading local orders cache:", localErr);
      }
    }

    // 2. Lắng nghe thay đổi thời gian thực từ Cloud Firestore
    let unsubscribeFirestore: () => void = () => { };

    loadLocalOrders().finally(() => {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, "orders"), (snapshot) => {
          const fetchedFirestoreOrders: Order[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedFirestoreOrders.push({
              id: doc.id,
              customer: data.customer || data.name || 'Khách hàng',
              phone: data.phone || '',
              product: data.product || 'Sáp TrekShield',
              qty: data.qty || Number(data.quantity) || 1,
              total: data.total || '180K',
              status: data.status || 'Pending',
              date: data.date || '',
              paymentMethod: data.paymentMethod || 'Tiền mặt',
            });
          });

          // Tránh nạp trùng lặp giữa Firestore và Local
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

          setOrders(merged);
          setIsLoading(false);
        }, (fsErr) => {
          console.error("Firestore real-time listener error, relying on cache:", fsErr);
          setOrders(localOrdersList);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Failed to setup Firestore real-time listener:", err);
        setOrders(localOrdersList);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Filter orders based on search term and status tabs
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone.includes(searchTerm) ||
        order.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'Tất cả') return true;
      return order.status === activeTab;
    });
  }, [orders, searchTerm, activeTab]);

  const handleUpdateStatus = async (id: string, newStatus: 'Pending' | 'Completed' | 'Cancelled', phone: string) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

    try {
      const res = await fetch("/api/admin/orders/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus, phone }),
      });
      const resData = await res.json();
      if (resData.ok) {
        console.log(`Successfully updated status for order ${id} to ${newStatus}`);
      } else {
        console.error("Failed to update status in backend:", resData.message);
      }
    } catch (err) {
      console.error("Error calling update status API:", err);
    }
  };

  const handleDeleteOrder = async (id: string, phone: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn đơn đặt hàng này trên cả hệ thống Admin, Firestore và Google Sheets?")) {
      // Optimistic UI update
      setOrders(prev => prev.filter(o => o.id !== id));

      try {
        const res = await fetch("/api/admin/orders/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, phone }),
        });
        const resData = await res.json();
        if (resData.ok) {
          console.log(`Order ${id} deleted successfully across all channels.`);
        } else {
          alert(`Lỗi khi xóa đơn hàng: ${resData.message}`);
        }
      } catch (err) {
        console.error("Error deleting order:", err);
        alert("Có lỗi xảy ra khi gửi yêu cầu xóa đơn hàng.");
      }
    }
  };

  const dynamicStats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let cancelled = 0;
    orders.forEach(o => {
      if (o.status === 'Pending') pending++;
      else if (o.status === 'Completed') completed++;
      else if (o.status === 'Cancelled') cancelled++;
    });
    return {
      total: orders.length,
      pending,
      completed,
      cancelled,
      cancelledRate: orders.length > 0 ? ((cancelled / orders.length) * 100).toFixed(1) : '0'
    };
  }, [orders]);

  return (
    <AdminShell activePage="Orders">

      {/* 1. Page Heading */}
      <section className="space-y-2">
        <span className="text-[10px] font-black text-brand-650 dark:text-emerald-450 uppercase tracking-widest block">
          Quản lý đơn hàng
        </span>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          Danh Sách Đơn Hàng
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-4xl leading-relaxed">
          Theo dõi hành trình, kiểm duyệt và cập nhật trạng thái xuất kho cho sáp TrekShield Wax.
        </p>
      </section>

      {/* 2. Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Tổng đơn hàng", val: dynamicStats.total, icon: "🧾", sub: "+12% tuần này", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Đơn chờ xử lý", val: dynamicStats.pending, icon: "⏳", sub: "Cần duyệt gấp", color: "text-amber-600 dark:text-amber-400" },
          { label: "Đã hoàn tất", val: dynamicStats.completed, icon: "✅", sub: "Đã xuất kho sáp", color: "text-brand-600 dark:text-emerald-400" },
          { label: "Đã huỷ bỏ", val: dynamicStats.cancelled, icon: "❌", sub: `Tỷ lệ huỷ: ${dynamicStats.cancelledRate}%`, color: "text-rose-600 dark:text-rose-455" }
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

      {/* 3. Filter toolbar */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tab list */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {(['Tất cả', 'Pending', 'Completed', 'Cancelled'] as const).map(tab => (
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
              {tab === 'Tất cả' ? '📋 Tất cả' : tab === 'Pending' ? '⏳ Chờ xử lý' : tab === 'Completed' ? '✅ Hoàn tất' : '❌ Đã huỷ'}
            </button>
          ))}
        </div>

        {/* Local Search box & Sync Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className={`
              px-4 py-2 rounded-xl text-xs font-bold tracking-wide outline-none transition-all cursor-pointer border-none flex items-center gap-2
              ${isSyncing
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-sm'
              }
            `}
          >
            <span className={`inline-block ${isSyncing ? 'animate-spin' : ''}`}>🔄</span>
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ 3 bên'}
          </button>

          <div className="relative max-w-sm w-full sm:w-[240px]">
            <span className="absolute left-3.5 top-2.5 text-sm select-none text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo khách, SĐT, mã..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
            />
          </div>
        </div>
      </section>

      {/* 4. Orders list card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
            Danh sách đơn đặt hàng
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
            Chi tiết thông tin đơn đặt sáp TrekShield Wax
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Mã đơn</th>
                <th className="py-3 px-4 font-bold">Khách hàng</th>
                <th className="py-3 px-4 font-bold">Số điện thoại</th>
                <th className="py-3 px-4 font-bold">Sản phẩm</th>
                <th className="py-3 px-4 font-bold text-center">Số lượng</th>
                <th className="py-3 px-4 font-bold">Tổng tiền</th>
                <th className="py-3 px-4 font-bold">Thanh toán</th>
                <th className="py-3 px-4 font-bold">Trạng thái</th>
                <th className="py-3 px-4 font-bold">Ngày gửi</th>
                <th className="py-3 px-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-medium">

              {/* SKELETON LOADER STATE */}
              {isLoading ? (
                Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-12 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-24 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-20 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-28 rounded animate-pulse" /></td>
                    <td className="py-4 px-4 text-center"><div className="shimmer h-4 w-6 rounded mx-auto animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-12 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-16 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-5 w-20 rounded-full animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-16 rounded animate-pulse" /></td>
                    <td className="py-4 px-4 text-right"><div className="shimmer h-7 w-28 rounded-xl ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  let badgeColor = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
                  if (order.status === "Completed") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
                  } else if (order.status === "Cancelled") {
                    badgeColor = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-455 dark:border-rose-900/50";
                  }

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{order.id.startsWith('#') ? order.id : `#${order.id.substring(0, 6).toUpperCase()}`}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-850 dark:text-slate-200">{order.customer}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">{order.phone}</td>
                      <td className="py-3.5 px-4">{order.product}</td>
                      <td className="py-3.5 px-4 font-bold text-center">{order.qty}</td>
                      <td className="py-3.5 px-4 font-black text-brand-650 dark:text-emerald-400">{order.total}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                          order.paymentMethod === "Chuyển khoản"
                            ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
                            : "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-900/50"
                        }`}>
                          {order.paymentMethod === "Chuyển khoản" ? "💳 Chuyển khoản" : "💵 Tiền mặt"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                          {order.status === "Pending" ? "⏳ Chờ duyệt" : order.status === "Completed" ? "✅ Thành công" : "❌ Đã hủy"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-semibold">{order.date}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-2 justify-end w-full">
                          <button
                            onClick={() => {
                              const nextStatus = order.status === 'Pending' ? 'Completed' : (order.status === 'Completed' ? 'Cancelled' : 'Pending');
                              handleUpdateStatus(order.id, nextStatus, order.phone);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold cursor-pointer outline-none shadow-sm transition-colors border-none text-[10px] uppercase tracking-wider"
                            title="Duyệt / chuyển trạng thái đơn hàng"
                          >
                            {order.status === 'Pending' ? 'Duyệt' : 'Đổi TT'}
                          </button>

                          <button
                            onClick={() => handleDeleteOrder(order.id, order.phone)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer outline-none shadow-sm transition-colors border-none text-[10px] uppercase tracking-wider"
                            title="Xóa vĩnh viễn đơn đặt hàng"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* EMPTY STATE DISPLAY REDESIGNED */
                <tr>
                  <td colSpan={10} className="py-16 text-center space-y-4">
                    <div className="text-5xl select-none animate-bounce">📦</div>
                    <div className="space-y-1">
                      <strong className="block text-sm font-black text-slate-700 dark:text-slate-300">
                        Không tìm thấy đơn hàng nào phù hợp
                      </strong>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa gõ để thử lại.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination details */}
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
