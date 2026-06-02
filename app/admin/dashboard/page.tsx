"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  createdAt: string;
  name?: string;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let localOrdersList: Order[] = [];
    setIsLoading(true);

    // 1. Tải đơn hàng từ cache cục bộ làm dự phòng
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
            date: localOrder.date || '',
            createdAt: localOrder.createdAt || new Date().toISOString()
          }));
        }
      } catch (localErr) {
        console.error("Error loading local orders cache:", localErr);
      }
    }

    // 2. Lắng nghe thay đổi từ Cloud Firestore
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
              createdAt: data.createdAt || new Date().toISOString()
            });
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

          // Sắp xếp đơn hàng mới nhất lên đầu
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setOrders(merged);
          setIsLoading(false);
        }, (fsErr) => {
          console.error("Firestore listener error, using cache:", fsErr);
          setOrders(localOrdersList);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Failed to setup Firestore listener:", err);
        setOrders(localOrdersList);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Tính toán các chỉ số thống kê động
  const data = useMemo(() => {
    let totalRevenueNum = 0;
    let totalOrders = orders.length;
    let completedOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;
    const uniqueUsers = new Set<string>();

    orders.forEach(o => {
      let amount = 0;
      if (typeof o.total === 'string') {
        amount = parseInt(o.total.replace(/[^0-9]/g, '')) || 0;
      } else if (typeof o.total === 'number') {
        amount = o.total;
      }

      if (o.status === "Completed") {
        totalRevenueNum += amount;
        completedOrders++;
      } else if (o.status === "Pending") {
        pendingOrders++;
      } else if (o.status === "Cancelled") {
        cancelledOrders++;
      }

      if (o.phone) {
        uniqueUsers.add(o.phone);
      }
    });

    const totalRevenue = `${totalRevenueNum}K`;
    const userCount = uniqueUsers.size;

    const stats = [
      {
        label: "Tổng doanh thu",
        value: totalRevenue,
        change: "Dữ liệu hoàn tất thực tế",
        icon: "💰",
        color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400"
      },
      {
        label: "Tổng đơn hàng",
        value: String(totalOrders),
        change: `${totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}% hoàn thành`,
        icon: "🧾",
        color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400"
      },
      {
        label: "Khách hàng duy nhất",
        value: String(userCount),
        change: "Khách mua hàng thực tế",
        icon: "👥",
        color: "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400"
      },
      {
        label: "Đơn chờ duyệt",
        value: String(pendingOrders),
        change: "Yêu cầu cần xử lý gấp",
        icon: "⏳",
        color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400"
      }
    ];

    const summaryItems = [
      { label: "Đơn hàng thành công", value: `${completedOrders} đơn` },
      { label: "Tỷ lệ hủy đơn", value: `${totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0}%` },
      { label: "Doanh thu trung bình", value: `${completedOrders > 0 ? Math.round(totalRevenueNum / completedOrders) : 0}K / đơn` },
      { label: "Khách duy nhất", value: `${userCount} người` },
    ];

    const recentOrders = orders.slice(0, 5).map(o => ({
      id: o.id.startsWith("#") ? o.id : `#${o.id.substring(0, 4).toUpperCase()}`,
      customer: o.customer || o.name || "Khách hàng",
      product: o.product || "Sáp TrekShield",
      amount: o.total || "180K",
      status: o.status || "Pending",
      date: o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : "")
    }));

    // Tính toán dữ liệu doanh số hàng tháng trong năm 2026
    const monthlyRevenue = Array(12).fill(0);
    orders.forEach(o => {
      if (o.status === "Completed" && o.createdAt) {
        const d = new Date(o.createdAt);
        if (d.getFullYear() === 2026) {
          const month = d.getMonth();
          let amount = 0;
          if (typeof o.total === 'string') {
            amount = parseInt(o.total.replace(/[^0-9]/g, '')) || 0;
          } else if (typeof o.total === 'number') {
            amount = o.total;
          }
          monthlyRevenue[month] += amount;
        }
      }
    });

    const hasRevenueData = monthlyRevenue.some(v => v > 0);
    const chartData = hasRevenueData ? monthlyRevenue : [12, 15, 18, 22, 26, 30, 28, 32, 34, 36, 38, 40];

    const maxChartVal = Math.max(...chartData, 10);
    const points = chartData.map((val, idx) => {
      const x = 50 + idx * 63.63;
      const y = 240 - (val / maxChartVal) * 180;
      return { x, y, val };
    });

    const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const polygonPoints = `50,240 ${polylinePoints} 750,240`;

    return {
      stats,
      summaryItems,
      recentOrders,
      points,
      polylinePoints,
      polygonPoints,
      maxChartVal
    };
  }, [orders]);

  return (
    <AdminShell activePage="Dashboard">

      {/* 1. Page Heading */}
      <section className="space-y-2">
        <span className="text-[10px] font-black text-brand-650 dark:text-emerald-450 uppercase tracking-widest block">
          Tổng quan vận hành
        </span>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          Tổng Quan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-4xl leading-relaxed">

        </p>Chào mừng quay trở lại, Admin! Phân tích hiệu suất bán hàng, lưu lượng đơn đặt sáp TrekShield Wax.
      </section>

      {/* 2. KPI Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array(4).fill(0).map((_, idx) => (
            <article key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="shimmer h-4 w-24 rounded animate-pulse" />
                <div className="shimmer h-10 w-10 rounded-xl animate-pulse" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="shimmer h-8 w-20 rounded animate-pulse" />
                <div className="shimmer h-3.5 w-28 rounded animate-pulse" />
              </div>
            </article>
          ))
        ) : (
          data.stats.map((stat) => (
            <article
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-500/40 dark:hover:border-brand-500/30 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group"
              key={stat.label}
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-linear-to-r from-brand-500 to-teal-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />

              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">
                  {stat.label}
                </p>
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${stat.color} flex items-center justify-center text-lg shadow-inner`}>
                  {stat.icon}
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <strong className="block text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                  {stat.value}
                </strong>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  {stat.change}
                </span>
              </div>
            </article>
          ))
        )}
      </section>

      {/* 3. Analytics Chart & Summary Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Area Chart */}
        <article className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
              Biểu đồ xu hướng doanh thu
            </h2>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
              Tổng doanh thu sáp hoàn thành năm 2026 (VND x 1,000)
            </p>
          </div>

          <div className="w-full relative">
            {isLoading ? (
              <div className="w-full h-[220px] bg-slate-50 dark:bg-slate-950/40 rounded-xl flex items-center justify-center">
                <div className="text-xs font-bold text-slate-400 animate-pulse">Đang nạp biểu đồ...</div>
              </div>
            ) : (
              <svg
                className="w-full h-auto min-h-[220px]"
                viewBox="0 0 800 280"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="dashboard-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f6b4f" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0f6b4f" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="50" y1="60" x2="750" y2="60" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
                <text x="10" y="64" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{data.maxChartVal}K</text>

                <line x1="50" y1="120" x2="750" y2="120" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
                <text x="10" y="124" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{Math.round(data.maxChartVal * 0.7)}K</text>

                <line x1="50" y1="180" x2="750" y2="180" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
                <text x="10" y="184" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{Math.round(data.maxChartVal * 0.4)}K</text>

                <line x1="50" y1="240" x2="750" y2="240" stroke="rgba(15, 107, 79, 0.15)" strokeWidth="1.5" />
                <text x="10" y="244" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">0K</text>

                {/* Area Fill */}
                <polygon fill="url(#dashboard-gradient)" points={data.polygonPoints} />

                {/* Line graph path */}
                <polyline
                  fill="none"
                  stroke="#0f6b4f"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={data.polylinePoints}
                />

                {/* Point Markers */}
                {data.points.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="4.5" className="fill-white stroke-brand-500" strokeWidth="2.5" />
                ))}

                {/* Month Labels */}
                {["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"].map((m, idx) => (
                  <text key={idx} x={50 + idx * 63.63} y="265" className="fill-slate-450 dark:fill-slate-550 text-[9px] font-black" textAnchor="middle">{m}</text>
                ))}
              </svg>
            )}
          </div>
        </article>

        {/* Operating Efficiency */}
        <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
              Hiệu suất bán hàng
            </h2>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
              Phân tích tỷ lệ chi tiết đơn hàng
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-850 flex-1 flex flex-col justify-center">
            {isLoading ? (
              Array(4).fill(0).map((_, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between">
                  <div className="shimmer h-4 w-28 rounded animate-pulse" />
                  <div className="shimmer h-4 w-12 rounded animate-pulse" />
                </div>
              ))
            ) : (
              data.summaryItems.map((item) => (
                <div key={item.label} className="py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-450">{item.label}</span>
                  <strong className="text-sm font-black text-slate-900 dark:text-white">{item.value}</strong>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-brand-50/50 dark:bg-slate-950 border border-brand-100/30 dark:border-slate-850 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            💡 <strong>Nhận định:</strong> Tổng doanh thu hoàn thiện tăng trưởng khả quan. Combo 2 hộp sáp chiếm tỷ lệ phân bổ đơn tối ưu để tối đa hóa AOV.
          </div>
        </article>
      </section>

      {/* 4. Recent Orders Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
            Đơn đặt sáp mới nhất
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
            5 yêu cầu gửi đơn hàng gần nhất.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Mã đơn</th>
                <th className="py-3 px-4 font-bold">Khách hàng</th>
                <th className="py-3 px-4 font-bold">Sản phẩm</th>
                <th className="py-3 px-4 font-bold">Số tiền</th>
                <th className="py-3 px-4 font-bold">Trạng thái</th>
                <th className="py-3 px-4 font-bold">Ngày gửi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-medium">
              {isLoading ? (
                Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-12 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-24 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-28 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-12 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-5 w-20 rounded-full animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-16 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : data.recentOrders.length > 0 ? (
                data.recentOrders.map((order) => {
                  let badgeColor = "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
                  if (order.status === "Completed") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
                  } else if (order.status === "Cancelled") {
                    badgeColor = "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-455 dark:border-rose-900/50";
                  }

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{order.id}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-850 dark:text-slate-200">{order.customer}</td>
                      <td className="py-3.5 px-4">{order.product}</td>
                      <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-emerald-400">{order.amount}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                          {order.status === "Pending" ? "⏳ Chờ duyệt" : order.status === "Completed" ? "✅ Thành công" : "❌ Đã hủy"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-450 dark:text-slate-500">{order.date}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-bold text-slate-400 dark:text-slate-650">
                    Không tìm thấy dữ liệu đơn hàng nào trên Firestore.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination details */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
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
