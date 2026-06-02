import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, secret, id, phone, customer, name, product, quantity, qty, total, location, note, status, date, createdAt } = data;

    // Xác thực secret key để đảm bảo an toàn bảo mật dữ liệu
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;
    if (!secret || secret !== webhookSecret) {
      console.warn("Unauthorized sync-webhook request: invalid secret.");
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    console.log(`Incoming sync-webhook action from Google Sheets: ${action}`);

    // Dùng băm ID nếu Google Sheet không trả về id doc
    const syncId = id || `sheet_${phone || ""}_${date || ""}`.replace(/[^a-zA-Z0-9_]/g, "");

    if (action === "sheet_delete" || action === "delete") {
      // 1. Đồng bộ XÓA lên Firestore
      if (id && !id.startsWith('local_')) {
        try {
          await deleteDoc(doc(db, "orders", id));
          console.log(`Sync deleted Firestore doc: ${id}`);
        } catch (fsErr) {
          console.error(`Sync delete doc ${id} failed in Firestore:`, fsErr);
        }
      }

      // 2. Đồng bộ XÓA vào file cache cục bộ
      try {
        const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
        if (fs.existsSync(cacheFilePath)) {
          const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
          let cachedOrders = JSON.parse(fileContent || '[]');
          cachedOrders = cachedOrders.filter((o: any) => o.id !== id && o.phone !== phone);
          fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
          console.log("Sync deleted local cache order.");
        }
      } catch (cacheErr) {
        console.error("Sync delete in cache failed:", cacheErr);
      }
    } 
    
    else if (action === "sheet_update" || action === "update") {
      // 1. Đồng bộ CẬP NHẬT lên Firestore
      if (id && !id.startsWith('local_')) {
        try {
          const orderDocRef = doc(db, "orders", id);
          await updateDoc(orderDocRef, { status });
          console.log(`Sync updated Firestore doc ${id} to status ${status}`);
        } catch (fsErr) {
          console.error(`Sync update doc ${id} failed in Firestore:`, fsErr);
        }
      }

      // 2. Đồng bộ CẬP NHẬT vào file cache cục bộ
      try {
        const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
        if (fs.existsSync(cacheFilePath)) {
          const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
          let cachedOrders = JSON.parse(fileContent || '[]');
          cachedOrders = cachedOrders.map((o: any) => (o.id === id || o.phone === phone) ? { ...o, status } : o);
          fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
          console.log(`Sync updated local cache order ${id} to status ${status}`);
        }
      } catch (cacheErr) {
        console.error("Sync update in cache failed:", cacheErr);
      }
    } 
    
    else if (action === "sheet_create" || action === "create" || action === "sheet_add") {
      const order = {
        id: syncId,
        name: name || customer || "Khách hàng",
        customer: name || customer || "Khách hàng",
        phone: phone || "",
        product: product || "Sáp TrekShield",
        quantity: String(quantity || qty || "1"),
        qty: Number(qty || quantity || 1),
        total: total || "180K",
        location: location || "",
        note: note || "",
        status: (status || "Pending") as any,
        source: "google-sheet-sync",
        date: date || new Date().toLocaleDateString('vi-VN'),
        createdAt: createdAt || new Date().toISOString(),
      };

      // 1. Đồng bộ THÊM/GHI ĐÈ lên Firestore
      if (!syncId.startsWith('local_')) {
        try {
          await setDoc(doc(db, "orders", syncId), order);
          console.log(`Sync created/overrode Firestore doc: ${syncId}`);
        } catch (fsErr) {
          console.error(`Sync write doc ${syncId} failed in Firestore:`, fsErr);
        }
      }

      // 2. Đồng bộ THÊM/GHI ĐÈ vào file cache cục bộ
      try {
        const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
        if (fs.existsSync(cacheFilePath)) {
          const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
          let cachedOrders = JSON.parse(fileContent || '[]');
          
          // Tránh trùng lặp
          cachedOrders = cachedOrders.filter((o: any) => o.id !== syncId);
          cachedOrders.unshift(order);
          
          fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
          console.log("Sync created/overrode local cache order.");
        }
      } catch (cacheErr) {
        console.error("Sync write in cache failed:", cacheErr);
      }
    }

    return NextResponse.json({ ok: true, message: "Đồng bộ dữ liệu ba bên thành công." });
  } catch (error) {
    console.error("Sync webhook error:", error);
    return NextResponse.json({ ok: false, message: "Lỗi xử lý webhook đồng bộ." }, { status: 500 });
  }
}
