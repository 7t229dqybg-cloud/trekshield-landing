/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { FormEvent, useState, useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function OrderForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "conflict" | "rate_limited">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `idemp_${Date.now()}_${randomPart}`;
  });
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(null);

  // PayOS states
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payDescription, setPayDescription] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [orderCode, setOrderCode] = useState<number | null>(null);

  // Form input states for dependency checking
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("1");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a cryptographically robust idempotency key on component mount
  const generateNewKey = () => {
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const key = `idemp_${Date.now()}_${randomPart}`;
    setIdempotencyKey(key);
  };

  // Function to create payment link on PayOS
  const handleSelectTransfer = async () => {
    // Get form inputs
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement | null;
    const phoneInput = document.querySelector('input[name="phone"]') as HTMLInputElement | null;
    const productSelect = document.querySelector('select[name="product"]') as HTMLSelectElement | null;
    const quantityInput = document.querySelector('input[name="quantity"]') as HTMLInputElement | null;
    const locationInput = document.querySelector('input[name="location"]') as HTMLInputElement | null;
    const noteTextarea = document.querySelector('textarea[name="note"]') as HTMLTextAreaElement | null;

    const name = nameInput?.value?.trim() || "";
    const phone = phoneInput?.value?.trim() || "";
    const product = productSelect?.value || "";
    const quantity = quantityInput?.value || "1";
    const location = locationInput?.value?.trim() || "";
    const note = noteTextarea?.value?.trim() || "";

    if (!name || !phone || !product) {
      alert("Vui lòng điền Họ tên, Số điện thoại và Chọn gói sản phẩm trước khi chọn hình thức Chuyển khoản.");
      setPaymentMethod("cash");
      return;
    }

    if (product.toLowerCase().includes("tư vấn") || product.toLowerCase().includes("tu van")) {
      alert("Đối với yêu cầu tư vấn chất liệu vải, vui lòng chọn hình thức Tiền mặt để gửi thông tin liên hệ.");
      setPaymentMethod("cash");
      return;
    }

    setQrLoading(true);
    setQrCodeUrl(null);
    setCheckoutUrl(null);

    try {
      const res = await fetch("/api/payos/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          product,
          quantity,
          location,
          note
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Không thể tạo liên kết thanh toán.");
      }

      setOrderCode(data.orderCode);
      setQrCodeUrl(data.qrCode);
      setCheckoutUrl(data.checkoutUrl);
      setPayAmount(data.amount);
      setPayDescription(data.description);
      setPaymentMethod("transfer");
    } catch (err: any) {
      console.error("Failed to generate PayOS link:", err);
      alert(err.message || "Đã xảy ra lỗi khi tạo mã QR thanh toán PayOS.");
      setPaymentMethod("cash");
    } finally {
      setQrLoading(false);
    }
  };

  const handlePaymentMethodChange = (method: "cash" | "transfer") => {
    if (method === "cash") {
      setPaymentMethod("cash");
      setQrCodeUrl(null);
      setCheckoutUrl(null);
      setOrderCode(null);
    } else {
      handleSelectTransfer();
    }
  };

  // Listen to Firestore for payment status updates
  useEffect(() => {
    if (!orderCode || paymentMethod !== "transfer") return;

    const unsub = onSnapshot(doc(db, "payment_attempts", String(orderCode)), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === "Paid") {
          setStatus("success");
          setPaymentMethod("cash"); // Revert back for next order
          setQrCodeUrl(null);
          setCheckoutUrl(null);
          setOrderCode(null);

          // Reset form fields
          const form = document.querySelector("form") as HTMLFormElement | null;
          if (form) form.reset();
          setSelectedProduct("");
          setSelectedQuantity("1");

          // Rotate idempotency key
          generateNewKey();
        }
      }
    });

    return () => unsub();
  }, [orderCode, paymentMethod]);

  // Automatically update QR code if product/quantity changes while Transfer mode is selected
  useEffect(() => {
    if (paymentMethod === "transfer" && selectedProduct) {
      if (selectedProduct.toLowerCase().includes("tư vấn") || selectedProduct.toLowerCase().includes("tu van")) {
        alert("Đối với yêu cầu tư vấn chất liệu vải, vui lòng chọn hình thức Tiền mặt để gửi thông tin liên hệ.");
        setPaymentMethod("cash");
        setQrCodeUrl(null);
        setCheckoutUrl(null);
        setOrderCode(null);
        return;
      }
      handleSelectTransfer();
    }
  }, [selectedProduct, selectedQuantity]);

  useEffect(() => {
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
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
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
            value={selectedQuantity}
            onChange={(e) => setSelectedQuantity(e.target.value)}
            disabled={status === "loading" || status === "rate_limited"}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 dark:focus:ring-emerald-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Địa chỉ nhận hàng
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

      {/* Payment Method Selector */}
      <div className="space-y-2 border-t border-slate-150 dark:border-slate-800 pt-4">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          Hình thức thanh toán <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${paymentMethod === "cash"
              ? "bg-brand-500/10 border-brand-500 dark:bg-emerald-500/10 dark:border-emerald-500"
              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}>
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === "cash"}
              onChange={() => handlePaymentMethodChange("cash")}
              disabled={status === "loading" || status === "rate_limited"}
              className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-slate-300 rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white">💵 Tiền mặt</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Nhận hàng thanh toán (COD)</span>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${paymentMethod === "transfer"
              ? "bg-brand-500/10 border-brand-500 dark:bg-emerald-500/10 dark:border-emerald-500"
              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}>
            <input
              type="radio"
              name="paymentMethod"
              value="transfer"
              checked={paymentMethod === "transfer"}
              onChange={() => handlePaymentMethodChange("transfer")}
              disabled={status === "loading" || status === "rate_limited"}
              className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-slate-300 rounded-full"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white">💳 Chuyển khoản</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tự động quét VietQR</span>
            </div>
          </label>
        </div>
      </div>

      {/* PayOS QR Code Block */}
      {paymentMethod === "transfer" && (qrLoading || qrCodeUrl) && (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 space-y-4 animate-fadeIn">
          {qrLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <span className="w-8 h-8 rounded-full border-3 border-brand-500/20 border-t-brand-500 animate-spin" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Đang tạo mã QR thanh toán...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-black text-brand-600 dark:text-emerald-450 uppercase tracking-widest block">VietQR - PayOS</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Quét mã để thanh toán đơn hàng</h3>
              </div>

              {/* QR Image with scan animation */}
              <div className="relative mx-auto w-[200px] h-[200px] bg-white p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeUrl || "")}`}
                  alt="Mã QR thanh toán PayOS"
                  className="w-full h-full object-contain"
                />
                {/* Laser scan line effect */}
                <div className="absolute left-0 right-0 h-0.5 bg-brand-500/50 dark:bg-emerald-500/50 shadow-md shadow-brand-500 dark:shadow-emerald-500 animate-scanLine top-0" />
              </div>

              {/* Payment Details Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-850">
                  <span className="font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wide text-[10px]">Số tiền</span>
                  <span className="font-black text-brand-650 dark:text-emerald-400 text-sm">
                    {payAmount ? payAmount.toLocaleString("vi-VN") + "đ" : ""}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-850">
                  <span className="font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wide text-[10px]">Nội dung chuyển khoản</span>
                  <span className="font-extrabold text-slate-850 dark:text-slate-200">
                    {payDescription}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wide text-[10px]">Trạng thái</span>
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    <span>Đang chờ chuyển khoản...</span>
                  </div>
                </div>
              </div>

              {/* PayOS Hosted Page Link */}
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-200/50 dark:border-slate-800"
                >
                  🌐 Mở cổng thanh toán PayOS →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {paymentMethod === "cash" ? (
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
      ) : (
        <button
          type="button"
          disabled
          className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 font-extrabold text-sm rounded-xl border border-slate-200 dark:border-slate-800 cursor-not-allowed select-none"
        >
          <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-slate-500 animate-spin shrink-0" />
          <span>Đang chờ thanh toán chuyển khoản...</span>
        </button>
      )}
    </form>
  );
}