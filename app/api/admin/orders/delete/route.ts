/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  try {
    const { id, phone } = await request.json();
    if (!id) {
      return NextResponse.json({ ok: false, message: "Thiếu mã đơn hàng để xóa." }, { status: 400 });
    }

    console.log(`Processing deletion for order: ${id}`);

    // 1. Xóa đơn hàng trên Cloud Firestore trước
    if (!id.startsWith('local_')) {
      try {
        const orderDocRef = doc(db, "orders", id);
        await deleteDoc(orderDocRef);
        console.log(`Deleted order ${id} from Cloud Firestore successfully.`);
      } catch (fsError: any) {
        console.error(`[Order Delete API] [${timestamp}] Error deleting order ${id} from Firestore:`, fsError.message || fsError);
      }
    }

    // 2. Xóa đơn hàng trong file cache cục bộ (chỉ chạy ở dev local)
    if (process.env.NODE_ENV === 'development') {
      try {
        const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
        if (fs.existsSync(cacheFilePath)) {
          const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
          let cachedOrders = JSON.parse(fileContent || '[]');
          
          // Lọc bỏ đơn hàng cần xóa
          const originalCount = cachedOrders.length;
          cachedOrders = cachedOrders.filter((o: any) => o.id !== id);
          
          if (cachedOrders.length !== originalCount) {
            fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
            console.log(`Deleted order ${id} from local cache.`);
          }
        }
      } catch (cacheError) {
        console.error("Error updating local cache for delete:", cacheError);
      }
    }

    // 3. Gửi webhook yêu cầu xóa đơn hàng trên Google Sheets
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (webhookUrl && webhookSecret) {
      try {
        console.log("Sending delete request to Google Sheet webhook...");
        const googleResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: "delete",
            id: id,
            phone: phone || "",
            secret: webhookSecret
          }),
          redirect: "follow",
          cache: "no-store",
        });

        const text = await googleResponse.text();
        console.log("Google Sheets delete webhook response:", text);

        let parsed: any = {};
        try { parsed = JSON.parse(text); } catch (e) {}

        if (!googleResponse.ok || parsed.ok === false) {
          const errMsg = parsed.message || `Sheets API returned HTTP ${googleResponse.status}`;
          console.error(`[Order Delete API] [${timestamp}] Google Sheet delete failed for order ID: ${id}. Error: ${errMsg}`);
        }
      } catch (googleError: any) {
        console.error(`[Order Delete API] [${timestamp}] Google Sheet delete failed for order ID: ${id}. Error: ${googleError.message || googleError}`);
      }
    } else {
      console.warn("Google Sheet delete webhook URL or secret is missing. Skipping Sheets delete.");
    }

    return NextResponse.json({ ok: true, message: "Đơn hàng đã được xóa đồng bộ trên các kênh." });
  } catch (error: any) {
    console.error(`[Order Delete API] [${timestamp}] Order delete error:`, error.message || error);
    return NextResponse.json({ ok: false, message: "Có lỗi xảy ra khi xóa đơn hàng." }, { status: 500 });
  }
}
