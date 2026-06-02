"use client";

import React, { FormEvent, useState, useEffect, useRef } from "react";

export default function OrderForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "conflict" | "rate_limited">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a cryptographically robust idempotency key on component mount
  const generateNewKey = () => {
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const key = `idemp_${Date.now()}_${randomPart}`;
    setIdempotencyKey(key);
  };

  useEffect(() => {
    generateNewKey();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Countdown timer logic for rate limiting
  const startCountdown = (resetTimestampInSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const updateCountdown = () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, resetTimestampInSeconds - nowInSeconds);

      if (remaining <= 0) {
        setRateLimitSeconds(null);
        setStatus("idle");
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setRateLimitSeconds(remaining);
      }
    };

    updateCountdown();
    timerRef.current = setInterval(updateCountdown, 1000);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading" || status === "rate_limited") return;

    setStatus("loading");
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "X-Idempotency-Key": idempotencyKey,
        },
        body: formData,
      });

      const result = await response.json();

      // Handle Rate Limiting (429)
      if (response.status === 429) {
        const resetHeader = response.headers.get("X-RateLimit-Reset");
        const resetTime = resetHeader ? Number(resetHeader) : Math.floor(Date.now() / 1000) + 60;

        setStatus("rate_limited");
        startCountdown(resetTime);
        return;
      }

      // Handle Idempotency Conflict (409)
      if (response.status === 409) {
        setStatus("conflict");
        return;
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Gửi đơn hàng thất bại.");
      }

      setStatus("success");
      form.reset();

      // Successfully processed! Safe to rotate the idempotency key for the next order
      generateNewKey();
    } catch (error: any) {
      console.error("Order submit error:", error);
      setStatus("error");
      setErrorMessage(error?.message || "Đã xảy ra lỗi kết nối. Vui lòng kiểm tra lại đường truyền.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Dynamic Status Notifications */}
      {status === "success" && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-xs text-brand-700 dark:text-emerald-400 font-bold leading-relaxed animate-fadeIn">
          🎉 Cảm ơn bạn! Đơn đặt hàng đã được tiếp nhận thành công. TrekShield sẽ sớm liên hệ xác nhận qua điện thoại.
        </div>
      )}

      {status === "rate_limited" && (
        <div className="p-4 rounded-xl bg-amber-55 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-400 font-bold leading-relaxed animate-shake">
          ⏳ Bạn đã gửi đơn hàng quá nhanh. Vui lòng chờ bộ đếm kết thúc sau{" "}
          <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono px-1">
            {rateLimitSeconds ?? 0}s
          </span>{" "}
          trước khi có thể bấm gửi lại.
        </div>
      )}

      {status === "conflict" && (
        <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-150/40 dark:border-teal-900/50 text-xs text-teal-800 dark:text-teal-400 font-bold leading-relaxed animate-pulse">
          🔄 Đơn hàng của bạn đang được máy chủ TrekShield xử lý. Vui lòng không bấm liên tục để tránh trùng lặp.
        </div>
      )}

      {status === "error" && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-455 font-bold leading-relaxed animate-shake">
          ⚠️ {errorMessage || "Gửi đơn hàng thất bại. Vui lòng kiểm tra lại thông tin hoặc thử lại."}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            placeholder="Nguyễn Văn A"
            required
            disabled={status === "loading" || status === "rate_limited"}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Số điện thoại <span className="text-rose-500">*</span>
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="09xx xxx xxx"
            required
            disabled={status === "loading" || status === "rate_limited"}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Sản phẩm quan tâm <span className="text-rose-500">*</span>
        </label>
        <select
          name="product"
          required
          defaultValue=""
          disabled={status === "loading" || status === "rate_limited"}
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <option value="" disabled>
            Chọn gói sản phẩm
          </option>
          <option value="Super Wax">Super Wax — Sáp Trắng Dễ Dùng (180K)</option>
          <option value="Premium Wax">Premium Wax — Sáp Vàng Bền Bỉ (160K)</option>
          <option value="Combo TrekShield">Combo Sáp TrekShield — Đầy Đủ (329K)</option>
          <option value="Cần tư vấn thêm">Cần tư vấn thêm chất liệu vải</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Số lượng
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            defaultValue="1"
            disabled={status === "loading" || status === "rate_limited"}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Khu vực nhận hàng
          </label>
          <input
            name="location"
            type="text"
            placeholder="Ví dụ: Hà Nội"
            disabled={status === "loading" || status === "rate_limited"}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Ghi chú hành trình
        </label>
        <textarea
          name="note"
          rows={3}
          placeholder="Bạn muốn bảo dưỡng balo, áo gió hay giày thô để TrekShield tư vấn kỹ hơn?"
          disabled={status === "loading" || status === "rate_limited"}
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading" || status === "rate_limited"}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-brand-500/10 hover:shadow-lg hover:shadow-brand-500/25 active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed select-none"
      >
        {status === "loading" ? (
          <>
            <span className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" />
            <span>Đang gửi thông tin...</span>
          </>
        ) : (
          <span>Gửi thông tin đặt sáp ngay →</span>
        )}
      </button>
    </form>
  );
}