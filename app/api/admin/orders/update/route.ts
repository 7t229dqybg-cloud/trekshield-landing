import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { id, status, phone } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ ok: false, message: "Thiếu thông tin cập nhật." }, { status: 400 });
    }

    console.log(`Processing status update for order: ${id} to ${status}`);

    // 1. Cập nhật trên Cloud Firestore
    if (!id.startsWith('local_')) {
      try {
        const orderDocRef = doc(db, "orders", id);
        await updateDoc(orderDocRef, { status });
        console.log(`Updated order ${id} status to ${status} in Firestore.`);
      } catch (fsError) {
        console.error(`Error updating order ${id} status in Firestore:`, fsError);
      }
    }

    // 2. Cập nhật trong file cache cục bộ
    try {
      const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
      if (fs.existsSync(cacheFilePath)) {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        let cachedOrders = JSON.parse(fileContent || '[]');
        cachedOrders = cachedOrders.map((o: any) => o.id === id ? { ...o, status } : o);
        fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
        console.log(`Updated order ${id} status to ${status} in local cache.`);
      }
    } catch (cacheError) {
      console.error("Error updating local cache for update:", cacheError);
    }

    // 3. Gửi webhook yêu cầu cập nhật đơn hàng trên Google Sheets
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (webhookUrl && webhookSecret) {
      try {
        console.log("Sending status update request to Google Sheet webhook...");
        const googleResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: "update",
            id: id,
            phone: phone || "",
            status: status,
            secret: webhookSecret
          }),
          redirect: "follow",
          cache: "no-store",
        });
        const text = await googleResponse.text();
        console.log("Google Sheets update webhook response:", text);
      } catch (googleError) {
        console.error("Error calling Google Sheet update webhook:", googleError);
      }
    } else {
      console.warn("Google Sheet update webhook URL or secret is missing. Skipping Sheets update.");
    }

    return NextResponse.json({ ok: true, message: "Trạng thái đơn hàng đã được cập nhật đồng bộ." });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json({ ok: false, message: "Có lỗi xảy ra khi cập nhật đơn hàng." }, { status: 500 });
  }
}
