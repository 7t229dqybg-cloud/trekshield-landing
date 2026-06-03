"use client";

import React, { useState, useEffect, useMemo } from 'react';
import AdminShell from '../components/AdminShell';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Product {
  id: string;
  name: string;
  price: string;
  type: string;
  stock: number;
  description: string;
  badge: string;
  status: 'Active' | 'Low stock';
  updatedAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);

  const triggerSync = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/products/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (data && data.ok) {
        console.log("3-way products sync completed:", data.stats);
      } else {
        console.error("Products sync failed:", data.message);
      }
    } catch (err) {
      console.error("Error triggering products sync:", err);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // 1. Tự động đồng bộ và nạp dữ liệu khi mount
  useEffect(() => {
    let localProductsList: Product[] = [];

    async function loadLocalProducts() {
      try {
        const res = await fetch("/api/admin/products");
        const resData = await res.json();
        if (resData && resData.ok && Array.isArray(resData.products)) {
          localProductsList = resData.products;
        }
      } catch (localErr) {
        console.error("Error loading local products cache:", localErr);
      }
    }

    let unsubscribeFirestore: () => void = () => { };

    loadLocalProducts().finally(() => {
      try {
        unsubscribeFirestore = onSnapshot(collection(db, "products"), (snapshot) => {
          const fetchedFirestoreProducts: Product[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedFirestoreProducts.push({
              id: doc.id,
              name: data.name || '',
              price: data.price || '',
              type: data.type || '',
              stock: Number(data.stock) || 0,
              description: data.description || '',
              badge: data.badge || '',
              status: data.status || 'Active',
              updatedAt: data.updatedAt || ''
            });
          });

          // Tránh nạp trùng lặp
          const merged = [...fetchedFirestoreProducts];
          localProductsList.forEach((localProd) => {
            const exists = merged.some(p => p.id === localProd.id);
            if (!exists) {
              merged.push(localProd);
            }
          });

          // Sắp xếp theo ID
          merged.sort((a, b) => a.id.localeCompare(b.id));

          setProducts(merged);
          setIsLoading(false);
        }, (fsErr) => {
          console.error("Firestore products listener error, using cachefallback:", fsErr);
          setProducts(localProductsList);
          setIsLoading(false);
        });
      } catch (err) {
        console.error("Failed to setup Firestore products listener:", err);
        setProducts(localProductsList);
        setIsLoading(false);
      }
    });

    // Kích hoạt đồng bộ kho 3 bên tự động lúc nạp trang
    setTimeout(() => triggerSync(true), 0);

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const handleRestock = async (id: string) => {
    setLoadingProductId(id);
    try {
      const res = await fetch("/api/admin/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, change: 10 }),
      });
      const data = await res.json();
      if (data && data.ok) {
        console.log(`Successfully restocked product ${id}`);
      } else {
        alert("Lỗi khi nhập thêm hàng: " + data.message);
      }
    } catch (err) {
      console.error("Error restocking product:", err);
    } finally {
      setLoadingProductId(null);
    }
  };

  const handleUpdateStock = async (id: string, change: number) => {
    // Cập nhật Optimistic UI
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const newStock = Math.max(0, p.stock + change);
      return {
        ...p,
        stock: newStock,
        status: newStock > 15 ? 'Active' : 'Low stock',
        updatedAt: new Date().toLocaleDateString('vi-VN')
      };
    }));

    try {
      const res = await fetch("/api/admin/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, change }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.error("Failed to update stock in backend:", data.message);
      }
    } catch (err) {
      console.error("Error calling update stock API:", err);
    }
  };

  const totalStockCount = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock, 0);
  }, [products]);

  return (
    <AdminShell activePage="Products">

      {/* 1. Page Heading */}
      <section className="space-y-2">
        <span className="text-[10px] font-black text-brand-650 dark:text-emerald-455 uppercase tracking-widest block">
          Quản lý danh mục & Kho vận
        </span>
        <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight">
          Danh Mục Sản Phẩm
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-4xl leading-relaxed">
          Cập nhật thông tin giá bán lẻ, trạng thái hoạt động và khối lượng tồn kho thực tế cho từng dòng sáp TrekShield Wax.
        </p>
      </section>

      {/* 2. Products Summary Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Tổng số mặt hàng", val: "3", icon: "📦", sub: "Đang hoạt động", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Khối lượng tồn kho", val: isLoading ? "..." : String(totalStockCount), icon: "📥", sub: "Tổng số lượng sáp", color: "text-brand-600 dark:text-emerald-400" },
          { label: "Sản phẩm bán chạy nhất", val: "Combo TrekShield", icon: "🔥", sub: "48% tỷ trọng đơn", color: "text-amber-600 dark:text-amber-400", size: "text-lg font-black pt-1.5" },
          { label: "Doanh thu sản phẩm", val: "12,456K", icon: "💰", sub: "Tất cả kênh", color: "text-teal-650 dark:text-teal-400" }
        ].map((s, idx) => (
          <article key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wide">{s.label}</span>
              <span className="text-xl select-none">{s.icon}</span>
            </div>
            <div className="mt-4 space-y-1">
              <strong className={s.size || "block text-3xl font-black text-slate-950 dark:text-white tracking-tight"}>{s.val}</strong>
              <span className={`block text-[10px] font-bold uppercase tracking-wider ${s.color}`}>{s.sub}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Sync Button block */}
      <section className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white tracking-tight">Dữ liệu kho</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Đồng bộ chéo dữ liệu tồn kho sản phẩm</p>
        </div>
        <button
          onClick={() => triggerSync(false)}
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
          {isSyncing ? 'Đang đồng bộ kho...' : 'Đồng bộ kho 3 bên'}
        </button>
      </section>

      {/* 3. Product Grid */}
      <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
        Hồ sơ chi tiết các gói sáp
      </h2>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, idx) => (
            <article key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="shimmer h-6 w-24 rounded animate-pulse self-end ml-auto" />
              <div className="space-y-2">
                <div className="shimmer h-12 w-12 rounded animate-pulse" />
                <div className="shimmer h-6 w-40 rounded animate-pulse" />
                <div className="shimmer h-6 w-20 rounded animate-pulse" />
              </div>
              <div className="shimmer h-12 w-full rounded-2xl animate-pulse" />
            </article>
          ))
        ) : (
          products.map((p) => (
            <article
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:border-brand-500/40 hover:-translate-y-0.5 transition-all duration-300"
              key={p.id}
            >
              <div className="absolute top-4 right-4 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-inner">
                {p.badge}
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-3xl select-none block mb-3">{p.id === 'super-wax' ? '🤍' : p.id === 'premium-wax' ? '💛' : '✨'}</span>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white tracking-tight leading-tight">{p.name}</h3>
                  <div className="text-2xl font-black text-brand-650 dark:text-emerald-450 mt-1">{p.price}</div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  {p.description}
                </p>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs font-bold text-slate-655 dark:text-slate-400">
                  <span>Loại: <strong className="text-slate-950 dark:text-white">{p.type}</strong></span>
                  <span>Trạng thái: <strong className={p.stock < 15 ? 'text-rose-500' : 'text-brand-500 dark:text-emerald-455'}>{p.stock < 15 ? '⚠️ Sắp hết' : '✅ Đủ hàng'}</strong></span>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 rounded-2xl border border-slate-200/60 dark:border-slate-850">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                    Số lượng tồn kho
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleUpdateStock(p.id, -1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all font-black text-base cursor-pointer shadow-xs"
                      title="Giảm 1"
                    >
                      -
                    </button>
                    <strong className={`min-w-[28px] text-center text-sm font-black ${p.stock < 15 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                      {p.stock}
                    </strong>
                    <button
                      onClick={() => handleUpdateStock(p.id, 1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all font-black text-base cursor-pointer shadow-xs"
                      title="Tăng 1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* 4. Products details catalog list table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight">
            Chi tiết lưu lượng kho
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
            Bảng tra cứu số lượng tồn kho sản phẩm TrekShield Wax
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Sản phẩm</th>
                <th className="py-3 px-4 font-bold">Loại chi tiết</th>
                <th className="py-3 px-4 font-bold">Đơn giá</th>
                <th className="py-3 px-4 font-bold">Còn trong kho</th>
                <th className="py-3 px-4 font-bold">Trạng thái</th>
                <th className="py-3 px-4 font-bold">Cập nhật lúc</th>
                <th className="py-3 px-4 font-bold text-right">Hành động nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300 font-medium">
              {isLoading ? (
                Array(3).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-28 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-32 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-12 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-20 rounded animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-5 w-20 rounded-full animate-pulse" /></td>
                    <td className="py-4 px-4"><div className="shimmer h-4 w-16 rounded animate-pulse" /></td>
                    <td className="py-4 px-4 text-right"><div className="shimmer h-7 w-24 rounded-xl ml-auto animate-pulse" /></td>
                  </tr>
                ))
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{p.name}</td>
                    <td className="py-3.5 px-4">{p.type}</td>
                    <td className="py-3.5 px-4 font-bold text-brand-650 dark:text-emerald-400">{p.price}</td>
                    <td className="py-3.5 px-4 font-bold">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStock(p.id, -1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-650 dark:text-slate-300 active:scale-95 transition-all text-xs font-black cursor-pointer"
                          title="Giảm 1"
                        >
                          -
                        </button>
                        <span className={`min-w-[24px] text-center ${p.stock < 15 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                          {p.stock}
                        </span>
                        <button
                          onClick={() => handleUpdateStock(p.id, 1)}
                          className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-650 dark:text-slate-300 active:scale-95 transition-all text-xs font-black cursor-pointer"
                          title="Tăng 1"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${p.stock < 15
                        ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                        }`}>
                        {p.stock < 15 ? '⚠️ Sắp hết' : '✅ Đủ hàng'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-450 dark:text-slate-500">{p.updatedAt}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRestock(p.id)}
                        disabled={loadingProductId === p.id}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 font-bold cursor-pointer outline-none transition-colors disabled:opacity-75"
                      >
                        {loadingProductId === p.id ? "Đang lưu..." : "Nhập thêm +10"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
