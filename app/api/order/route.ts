import { NextResponse } from "next/server";

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      console.error("Missing env:", {
        hasWebhookUrl: Boolean(webhookUrl),
        hasWebhookSecret: Boolean(webhookSecret),
      });

      return NextResponse.json(
        {
          ok: false,
          message: "Thiếu cấu hình Google Sheet webhook.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const order = {
      name: getFormValue(formData, "name"),
      phone: getFormValue(formData, "phone"),
      product: getFormValue(formData, "product"),
      quantity: getFormValue(formData, "quantity") || "1",
      location: getFormValue(formData, "location"),
      note: getFormValue(formData, "note"),
      source: "trekshield-landing",
      createdAt: new Date().toISOString(),
    };

    if (!order.name || !order.phone || !order.product) {
      return NextResponse.json(
        {
          ok: false,
          message: "Vui lòng nhập họ tên, số điện thoại và sản phẩm.",
        },
        { status: 400 }
      );
    }

    const googleResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        ...order,
        secret: webhookSecret,
      }),
      redirect: "follow",
      cache: "no-store",
    });

    const googleText = await googleResponse.text();

    console.log("Google Sheet response:", {
      status: googleResponse.status,
      ok: googleResponse.ok,
      text: googleText,
    });

    let googleResult: {
      ok?: boolean;
      message?: string;
    } | null = null;

    try {
      googleResult = JSON.parse(googleText);
    } catch {
      googleResult = null;
    }

    if (!googleResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Google Apps Script trả về lỗi HTTP.",
          detail: googleText,
        },
        { status: 500 }
      );
    }

    if (googleResult && googleResult.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          message: googleResult.message || "Google Sheet từ chối lưu đơn.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Đơn hàng đã được lưu vào Google Sheet.",
    });
  } catch (error) {
    console.error("Order submit error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Có lỗi xảy ra khi gửi đơn hàng.",
      },
      { status: 500 }
    );
  }
}