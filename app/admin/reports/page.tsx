"use client";

import React, { useState, useMemo, useEffect } from 'react';
import AdminShell from '../components/AdminShell';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
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
        console.error("Error loading local orders cache in Reports:", localErr);
      }
    }

    let unsubscribeFirestore: () => void = () => {};
    
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

          setOrders(merged);
          setIsLoading(false);
        }, (fsErr) => {
          console.error("Firestore listener error in Reports, relying on cache:", fsErr);
          setOrders(localOrdersList);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Failed to setup Firestore listener in Reports:", err);
        setOrders(localOrdersList);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const activeOrders = orders;

  const dynamicStats = useMemo(() => {
    let totalRevenueNum = 0;
    let completedOrders = 0;
    let totalOrders = activeOrders.length;
    let pendingOrders = 0;
    let cancelledOrders = 0;

    let monthlyRevenueNum = 0;
    let monthlyCompletedOrders = 0;

    activeOrders.forEach(o => {
      let amount = 0;
      if (typeof o.total === 'string') {
        amount = parseInt(o.total.replace(/[^0-9]/g, '')) || 0;
      } else if (typeof o.total === 'number') {
        amount = o.total;
      }

      if (o.status === 'Completed') {
        totalRevenueNum += amount;
        completedOrders++;

        // Filter for June 2026 (index 5)
        const d = new Date(o.createdAt || '');
        if (d.getFullYear() === 2026 && d.getMonth() === 5) {
          monthlyRevenueNum += amount;
          monthlyCompletedOrders++;
        }
      } else if (o.status === 'Pending') {
        pendingOrders++;
      } else if (o.status === 'Cancelled') {
        cancelledOrders++;
      }
    });

    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    const avgOrderValue = completedOrders > 0 ? Math.round(totalRevenueNum / completedOrders) : 0;

    return {
      monthlyRevenue: `${monthlyRevenueNum}K`,
      monthlyCompletedOrders: monthlyCompletedOrders,
      avgOrderValue: `${avgOrderValue}K`,
      completionRate: `${completionRate}%`
    };
  }, [activeOrders]);

  const performanceRows = useMemo(() => {
    let comboOrders = 0;
    let comboRev = 0;
    let superOrders = 0;
    let superRev = 0;
    let premiumOrders = 0;
    let premiumRev = 0;

    activeOrders.forEach(o => {
      if (o.status === 'Completed') {
        let amount = 0;
        if (typeof o.total === 'string') {
          amount = parseInt(o.total.replace(/[^0-9]/g, '')) || 0;
        } else if (typeof o.total === 'number') {
          amount = o.total;
        }

        const prodLower = (o.product || '').toLowerCase();
        if (prodLower.includes('combo')) {
          comboOrders++;
          comboRev += amount;
        } else if (prodLower.includes('super')) {
          superOrders++;
          superRev += amount;
        } else if (prodLower.includes('premium')) {
          premiumOrders++;
          premiumRev += amount;
        }
      }
    });

    const totalRev = (comboRev + superRev + premiumRev) || 1;

    return [
      { name: 'Combo TrekShield', orders: comboOrders, revenue: `${comboRev}K`, share: `${totalRev > 1 ? Math.round((comboRev / totalRev) * 100) : 0}%`, trend: '+18%' },
      { name: 'Super Wax', orders: superOrders, revenue: `${superRev}K`, share: `${totalRev > 1 ? Math.round((superRev / totalRev) * 100) : 0}%`, trend: '+9%' },
      { name: 'Premium Wax', orders: premiumOrders, revenue: `${premiumRev}K`, share: `${totalRev > 1 ? Math.round((premiumRev / totalRev) * 100) : 0}%`, trend: '+6%' }
    ];
  }, [activeOrders]);

  const chartData = useMemo(() => {
    const monthlyRevenue = Array(12).fill(0);
    activeOrders.forEach(o => {
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

    return monthlyRevenue;
  }, [activeOrders]);

  const maxChartVal = useMemo(() => Math.max(...chartData, 10), [chartData]);

  const points = useMemo(() => {
    return chartData.map((val, idx) => {
      const x = 60 + idx * 80.9;
      const y = 270 - (val / maxChartVal) * 220;
      return { x, y, val };
    });
  }, [chartData, maxChartVal]);

  const polylinePoints = useMemo(() => {
    return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [points]);

  const polygonPoints = useMemo(() => {
    return `60,270 ${polylinePoints} 950,270`;
  }, [polylinePoints]);

  const insights = [
    "Combo sáp TrekShield đang đóng góp tỷ trọng doanh thu cao nhất nhờ giá trị đơn (AOV) hấp dẫn.",
    "Khách hàng mới thớ mỏng thường ưu tiên chọn Super Wax an toàn nhờ độ dễ thoa và giữ nguyên màu vải.",
    "Premium Wax bám bền tiếp tục giữ chân nhóm khách đi rừng nhiệt đới hoặc leo núi đá dài ngày."
  ];

  return (
    <AdminShell activePage="Reports">
      
      {/* 1. Page Heading */}
      <section className="space-y-2">
        <span className="text-[10px] font-black text-brand-650 dark:text-emerald-455 uppercase tracking-widest block">
          Thống kê phân tích tài chính
        </span>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          Báo Cáo & Phân Tích
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-4xl leading-relaxed">
          Đánh giá doanh thu kinh doanh, theo dõi hiệu suất phân phối sáp theo tháng và thu thập dữ liệu hành vi người dùng.
        </p>
      </section>

      {/* 2. Summary stats cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Doanh thu tháng này", val: dynamicStats.monthlyRevenue, icon: "💰", sub: "+15% mục tiêu", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Đơn hàng hoàn tất", val: dynamicStats.monthlyCompletedOrders, icon: "🧾", sub: "Mục tiêu: 100 đơn", color: "text-brand-600 dark:text-emerald-400" },
          { label: "Giá trị đơn (AOV)", val: dynamicStats.avgOrderValue, icon: "📊", sub: "+5% so với kỳ trước", color: "text-indigo-650 dark:text-indigo-400" },
          { label: "Tỷ lệ hoàn tất", val: dynamicStats.completionRate, icon: "📈", sub: "Mục tiêu: 90%", color: "text-teal-650 dark:text-teal-400" }
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

      {/* 3. Large SVG Area Chart */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
            Xu hướng doanh số năm 2026
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
            Doanh thu thực tế theo 12 tháng lưu trữ trên Firestore (VND x 1,000)
          </p>
        </div>

        <div className="w-full relative overflow-x-auto">
          <svg
            className="w-full h-auto min-w-[720px] min-h-[260px]"
            viewBox="0 0 1000 320"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="reports-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f6b4f" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0f6b4f" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="60" y1="50" x2="950" y2="50" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="15" y="54" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{maxChartVal}K</text>

            <line x1="60" y1="110" x2="950" y2="110" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="15" y="114" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{Math.round(maxChartVal * 0.7)}K</text>

            <line x1="60" y1="170" x2="950" y2="170" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="15" y="174" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{Math.round(maxChartVal * 0.4)}K</text>

            <line x1="60" y1="230" x2="950" y2="230" stroke="rgba(15, 107, 79, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="15" y="234" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">{Math.round(maxChartVal * 0.1)}K</text>

            <line x1="60" y1="270" x2="950" y2="270" stroke="rgba(15, 107, 79, 0.15)" strokeWidth="1.5" />
            <text x="15" y="274" className="fill-slate-400 dark:fill-slate-650 text-[10px] font-bold">0K</text>

            {/* Fill under line */}
            <polygon fill="url(#reports-gradient)" points={polygonPoints} />

            {/* Line trend */}
            <polyline
              fill="none"
              stroke="#0f6b4f"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
            />

            {/* Markers */}
            {points.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r="5" className="fill-white stroke-brand-500" strokeWidth="3" />
            ))}

            {/* Labels */}
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => (
              <text key={idx} x={60 + idx * 80.9} y="295" className="fill-slate-450 dark:fill-slate-550 text-[10px] font-black" textAnchor="middle">{m}</text>
            ))}
          </svg>
        </div>
      </section>

      {/* 4. Product performance table & Insights grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Performance Table */}
        <article className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
              Phân khúc sản lượng
            </h2>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
              Tỷ trọng đóng góp thực tế theo từng dòng sáp
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Dòng sáp</th>
                  <th className="py-3 px-4 font-bold text-center">Số đơn</th>
                  <th className="py-3 px-4 font-bold">Doanh số</th>
                  <th className="py-3 px-4 font-bold">Phân bổ</th>
                  <th className="py-3 px-4 font-bold">Xu hướng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-medium">
                {performanceRows.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{row.name}</td>
                    <td className="py-3.5 px-4 font-bold text-center">{row.orders}</td>
                    <td className="py-3.5 px-4 font-black text-brand-650 dark:text-emerald-450">{row.revenue}</td>
                    <td className="py-3.5 px-4 font-bold">{row.share}</td>
                    <td className="py-3.5 px-4 font-black text-brand-500 dark:text-emerald-400">{row.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Business Insights */}
        <article className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
              Phân tích hành vi & Insights
            </h2>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
              Khuyên dùng chiến dịch kinh doanh TrekShield
            </p>
          </div>

          <ul className="space-y-3.5">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex gap-2.5 items-start text-xs leading-relaxed font-semibold text-slate-600 dark:text-slate-350">
                <span className="text-sm select-none shrink-0">💡</span>
                <p>{insight}</p>
              </li>
            ))}
          </ul>

          <div className="p-4 bg-brand-50/50 dark:bg-slate-950 border border-dashed border-brand-200 dark:border-slate-800 rounded-xl">
            <strong className="block text-xs font-black text-slate-950 dark:text-white mb-1">
              Đề xuất chiến lược kinh doanh:
            </strong>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Tiếp tục quảng bá gói Combo để duy trì chỉ số AOV ở mức tối ưu. Sử dụng phản hồi tốt từ nhóm khách dùng sáp trắng Super Wax để tiếp cận tệp phượt thủ chuyên sâu sang dòng sáp vàng Premium Wax.
            </p>
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
