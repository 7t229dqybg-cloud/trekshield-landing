import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import payos from "../../../lib/payos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9 ]/g, ""); // Keep only alphanumeric and spaces
}

export async function POST(request: Request) {
  try {
    const { name, phone, product, quantity, location, note } = await request.json();

    if (!name || !phone || !product) {
      return NextResponse.json(
        { ok: false, message: "Vui lòng điền đầy đủ họ tên, số điện thoại và chọn sản phẩm." },
        { status: 400 }
      );
    }

    const qtyNum = Number(quantity) || 1;
    let price = 180;
    const prodLower = product.toLowerCase();
    
    if (prodLower.includes("combo")) {
      price = 329;
    } else if (prodLower.includes("premium")) {
      price = 160;
    } else if (prodLower.includes("super")) {
      price = 180;
    }
    
    const amount = price * qtyNum * 1000; // Total amount in VND
    
    // Check if Cần tư vấn thêm (Consultation requests shouldn't allow bank transfer)
    if (prodLower.includes("tư vấn") || prodLower.includes("tu van")) {
      return NextResponse.json(
        { ok: false, message: "Với yêu cầu tư vấn chất liệu, vui lòng chọn hình thức Tiền mặt." },
        { status: 400 }
      );
    }

    // Generate unique numeric orderCode (timestamp in milliseconds, within JS safe integer range)
    const orderCode = Date.now();

    // Normalizing description for Bank Transfer (max 25 characters)
    const normalizedProduct = removeAccents(product).replace(/\s+/g, " ").trim();
    const description = normalizedProduct.substring(0, 25).trim() || "Thanh toan TrekShield";

    // Setup return/cancel URLs dynamically based on request origin
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const returnUrl = `${origin}/`;
    const cancelUrl = `${origin}/`;

    console.log(`Generating PayOS payment link. OrderCode: ${orderCode}, Amount: ${amount}, Description: ${description}`);

    // Call PayOS API to create payment link
    const paymentLink = await payos.paymentRequests.create({
      orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl,
    });

    // Save the temporary payment attempt to Firestore
    const attemptRef = doc(db, "payment_attempts", String(orderCode));
    await setDoc(attemptRef, {
      orderCode,
      status: "Unpaid",
      name,
      customer: name,
      phone,
      product,
      quantity: String(quantity || "1"),
      qty: qtyNum,
      total: `${price * qtyNum}K`,
      location: location || "",
      note: note || "",
      amount,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      amount,
      description,
    });
  } catch (error: any) {
    console.error("Error creating PayOS payment link:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Không thể khởi tạo thanh toán qua PayOS." },
      { status: 500 }
    );
  }
}
