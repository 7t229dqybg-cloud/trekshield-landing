import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import payos from "../../../lib/payos";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, message: "PayOS Webhook is active." });
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  console.log(`[PayOS Webhook] [${timestamp}] Webhook received.`);

  try {
    const body = await request.json();

    // 1. Verify webhook signature and retrieve data
    let verifiedData;
    try {
      verifiedData = await payos.webhooks.verify(body);
      console.log(`[PayOS Webhook] Signature verified. OrderCode: ${verifiedData.orderCode}, Code: ${verifiedData.code}`);
    } catch (sigError: any) {
      // Allow mock webhook in development environment for testing
      if (process.env.NODE_ENV === 'development' && body.isMock) {
        verifiedData = body.data;
        console.log(`[PayOS Webhook] [MOCK] Bypassing signature verification in development. OrderCode: ${verifiedData?.orderCode}`);
      } else {
        console.error("[PayOS Webhook] Signature verification failed:", sigError.message || sigError);
        return NextResponse.json({ ok: false, message: "Chữ ký webhook không hợp lệ." }, { status: 400 });
      }
    }

    const { orderCode, code, reference } = verifiedData;

    // Only process successful payments (code "00")
    if (code !== "00") {
      console.log(`[PayOS Webhook] Payment not successful. Code: ${code}. Skipping.`);
      return NextResponse.json({ ok: true, message: "Giao dịch không thành công hoặc trạng thái khác. Không xử lý." });
    }

    // 2. Fetch the corresponding draft payment attempt from Firestore
    const attemptRef = doc(db, "payment_attempts", String(orderCode));
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      console.warn(`[PayOS Webhook] Payment attempt not found in Firestore for orderCode: ${orderCode}. Returning 200 OK for test pings.`);
      return NextResponse.json({ ok: true, message: "Nhận webhook thành công (mã đơn test/không tồn tại)." });
    }

    const attemptData = attemptSnap.data();

    // Avoid double processing
    if (attemptData.status === "Paid") {
      console.log(`[PayOS Webhook] Payment attempt ${orderCode} already processed. Returning OK.`);
      return NextResponse.json({ ok: true, message: "Webhook đã được xử lý trước đó." });
    }

    // 3. Update the payment attempt status to Paid
    await updateDoc(attemptRef, {
      status: "Paid",
      paymentReference: reference || "",
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`[PayOS Webhook] Marked payment attempt ${orderCode} as Paid.`);

    // 4. Create the official order document in Firestore (orders collection)
    const orderCol = collection(db, "orders");
    const orderDocRef = doc(orderCol);
    const orderId = orderDocRef.id;

    const qtyNum = attemptData.qty || 1;
    const order = {
      id: orderId,
      name: attemptData.name,
      customer: attemptData.customer,
      phone: attemptData.phone,
      product: attemptData.product,
      quantity: attemptData.quantity || "1",
      qty: qtyNum,
      total: attemptData.total,
      location: attemptData.location || "",
      note: attemptData.note || "",
      status: "Pending" as const,
      source: "trekshield-landing",
      date: new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
      syncError: null,
      updatedAt: new Date().toISOString(),
      paymentStatus: "Paid",
      paymentMethod: "Chuyển khoản",
      payosOrderCode: orderCode,
    };

    // Save order in Firestore
    try {
      await setDoc(orderDocRef, order);
      console.log("[PayOS Webhook] Order saved to Firestore with ID:", orderId);
    } catch (fsError: any) {
      console.error("[PayOS Webhook] Firestore save error:", fsError.message || fsError);
    }

    // 5. Save order to local cache (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
        const dirPath = path.dirname(cacheFilePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        let cachedOrders = [];
        if (fs.existsSync(cacheFilePath)) {
          const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
          cachedOrders = JSON.parse(fileContent || '[]');
        }

        cachedOrders.unshift({ ...order });
        fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
        console.log("[PayOS Webhook] Order saved to local cache successfully.");
      } catch (cacheError) {
        console.error("[PayOS Webhook] Local order cache error:", cacheError);
      }
    }

    // 6. Deduct Product Stock (Firestore, Cache, Sheet)
    try {
      let productId = "";
      const prodLower = attemptData.product.toLowerCase();
      if (prodLower.includes("combo")) {
        productId = "combo-trekshield";
      } else if (prodLower.includes("premium")) {
        productId = "premium-wax";
      } else if (prodLower.includes("super")) {
        productId = "super-wax";
      }

      if (productId) {
        console.log(`[PayOS Webhook] Deducting stock for: ${productId}, qty: ${qtyNum}`);

        const prodDocRef = doc(db, "products", productId);
        let currentStock = 0;
        let productData: any = null;

        // A. Firestore stock update
        try {
          const productSnap = await getDoc(prodDocRef);
          if (productSnap.exists()) {
            productData = productSnap.data();
            currentStock = Number(productData.stock) || 0;
          } else {
            const initialMap: Record<string, any> = {
              "super-wax": { name: "Super Wax", price: "180K", type: "Sáp trắng", stock: 72, badge: "Phù hợp người mới", description: "Dễ thoa, nhanh khô, không làm đổi màu quần áo và linh hoạt trên nhiều loại vải.", status: "Active" },
              "premium-wax": { name: "Premium Wax", price: "160K", type: "Sáp vàng", stock: 64, badge: "Bám lâu", description: "Chống nước vượt trội, bám lâu, độ bền cao, phù hợp vải chuyên dụng.", status: "Active" },
              "combo-trekshield": { name: "Combo TrekShield", price: "329K", type: "Super Wax + Premium Wax", stock: 50, badge: "Bán chạy", description: "Bộ đôi linh hoạt cho nhiều loại đồ outdoor, balô, áo khoác, giày vải và túi canvas.", status: "Active" }
            };
            productData = initialMap[productId] || { name: attemptData.product, price: "180K", type: "Sáp", stock: 50, status: "Active" };
            currentStock = productData.stock;
          }

          const newStock = Math.max(0, currentStock - qtyNum);
          await setDoc(prodDocRef, {
            ...productData,
            stock: newStock,
            status: newStock > 15 ? 'Active' : 'Low stock',
            updatedAt: new Date().toLocaleDateString('vi-VN'),
            syncStatus: "pending"
          });
          console.log(`[PayOS Webhook] Updated Firestore stock for ${productId} to: ${newStock}`);
        } catch (fsProdErr) {
          console.error("[PayOS Webhook] Failed to update product stock in Firestore:", fsProdErr);
        }

        // B. Local cache stock update (development only)
        if (process.env.NODE_ENV === 'development') {
          try {
            const prodCachePath = path.join(process.cwd(), 'app/lib/products-cache.json');
            if (fs.existsSync(prodCachePath)) {
              const fileContent = fs.readFileSync(prodCachePath, 'utf8');
              let cachedProducts = JSON.parse(fileContent || '[]');
              cachedProducts = cachedProducts.map((p: any) => {
                if (p.id === productId) {
                  const updatedStock = Math.max(0, p.stock - qtyNum);
                  return {
                    ...p,
                    stock: updatedStock,
                    status: updatedStock > 15 ? 'Active' : 'Low stock',
                    updatedAt: new Date().toLocaleDateString('vi-VN'),
                    syncStatus: "pending"
                  };
                }
                return p;
              });
              fs.writeFileSync(prodCachePath, JSON.stringify(cachedProducts, null, 2), 'utf8');
              console.log("[PayOS Webhook] Updated product stock in local cache.");
            }
          } catch (cacheProdErr) {
            console.error("[PayOS Webhook] Failed to update product stock in local cache:", cacheProdErr);
          }
        }

        // C. Google Sheet Stock Webhook sync
        const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
        const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;
        if (webhookUrl && webhookSecret) {
          try {
            const stockRes = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                action: "update_product_stock",
                id: productId,
                secret: webhookSecret,
                qty_deducted: qtyNum
              }),
              redirect: "follow",
              cache: "no-store",
            });
            const stockText = await stockRes.text();
            let parsedStock: any = {};
            try { parsedStock = JSON.parse(stockText); } catch (e) {}

            if (stockRes.ok && parsedStock.ok !== false) {
              await updateDoc(prodDocRef, {
                syncStatus: "synced",
                syncError: null,
                lastSyncedAt: new Date().toISOString(),
              });
            } else {
              const errMsg = parsedStock.message || `HTTP Status ${stockRes.status}`;
              console.error(`[PayOS Webhook] Google Sheet stock update failed: ${errMsg}`);
              await updateDoc(prodDocRef, {
                syncStatus: "failed",
                syncError: errMsg,
                lastSyncedAt: new Date().toISOString(),
              });
            }
          } catch (sheetDeductErr: any) {
            const errMsg = sheetDeductErr.message || String(sheetDeductErr);
            console.error(`[PayOS Webhook] Google Sheet stock update error: ${errMsg}`);
            try {
              await updateDoc(prodDocRef, {
                syncStatus: "failed",
                syncError: errMsg,
                lastSyncedAt: new Date().toISOString(),
              });
            } catch (e) {}
          }
        }
      }
    } catch (deductErr) {
      console.error("[PayOS Webhook] Error during stock deduction:", deductErr);
    }

    // 7. Sync Order to Google Sheets
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (webhookUrl && webhookSecret) {
      try {
        const googleResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "create",
            ...order,
            secret: webhookSecret,
          }),
          redirect: "follow",
          cache: "no-store",
        });

        const googleText = await googleResponse.text();
        let googleResult: any = null;
        try { googleResult = JSON.parse(googleText); } catch (e) {}

        if (googleResponse.ok && googleResult && googleResult.ok !== false) {
          await updateDoc(orderDocRef, {
            syncStatus: "synced",
            syncError: null,
            lastSyncedAt: new Date().toISOString(),
          });
          console.log("[PayOS Webhook] Order successfully synced to Google Sheets.");
        } else {
          const errMsg = googleResult?.message || `HTTP ${googleResponse.status}`;
          throw new Error(errMsg);
        }
      } catch (sheetErr: any) {
        const errMsg = sheetErr.message || String(sheetErr);
        console.error(`[PayOS Webhook] Google Sheet sync failed: ${errMsg}`);
        await updateDoc(orderDocRef, {
          syncStatus: "failed",
          syncError: errMsg,
          lastSyncedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ ok: true, message: "Xử lý webhook thanh toán thành công." });
  } catch (error: any) {
    console.error(`[PayOS Webhook] Error handling webhook:`, error.message || error);
    return NextResponse.json({ ok: false, message: "Có lỗi xảy ra khi xử lý webhook." }, { status: 500 });
  }
}
