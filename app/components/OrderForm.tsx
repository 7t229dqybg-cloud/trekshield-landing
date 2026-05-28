"use client";

import { FormEvent, useState } from "react";

export default function OrderForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Submit failed");

      setStatus("success");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Họ và tên
          <input name="name" type="text" placeholder="Nguyễn Văn A" required />
        </label>

        <label>
          Số điện thoại
          <input name="phone" type="tel" placeholder="09xx xxx xxx" required />
        </label>
      </div>

      <label>
        Sản phẩm quan tâm
        <select name="product" required defaultValue="">
          <option value="" disabled>
            Chọn sản phẩm
          </option>
          <option>Super Wax</option>
          <option>Premium Wax</option>
          <option>Combo TrekShield</option>
          <option>Cần tư vấn thêm</option>
        </select>
      </label>

      <div className="form-row">
        <label>
          Số lượng
          <input name="quantity" type="number" min="1" defaultValue="1" />
        </label>

        <label>
          Khu vực nhận hàng
          <input name="location" type="text" placeholder="Ví dụ: Hà Nội" />
        </label>
      </div>

      <label>
        Ghi chú
        <textarea
          name="note"
          placeholder="Bạn muốn dùng cho balô, áo khoác, giày vải hay đồ trekking?"
        />
      </label>

      <button className="btn btn-primary" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Đang gửi..." : "Gửi thông tin đặt hàng →"}
      </button>

      {status === "success" && (
        <p className="form-message success">
          Cảm ơn bạn! TrekShield sẽ liên hệ xác nhận đơn hàng sớm.
        </p>
      )}

      {status === "error" && (
        <p className="form-message error">
          Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hotline.
        </p>
      )}
    </form>
  );
}