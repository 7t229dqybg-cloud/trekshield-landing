/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { rateLimiter } from "../../lib/rateLimit";
import { idempotencyService } from "../../lib/idempotency";
import { db } from "../../lib/firebase";
import { collection, doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getFormValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  // Trích xuất IP của Client an toàn sau proxy
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
             request.headers.get("x-real-ip") ||
             "127.0.0.1";

  // Cấu hình: tối đa 5 lượt gửi đơn trong 1 phút (60000ms)
  const rateLimitResult = await rateLimiter.check(ip, 5, 60000);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(rateLimitResult.limit),
    "X-RateLimit-Remaining": String(rateLimitResult.remaining),
    "X-RateLimit-Reset": String(rateLimitResult.resetTime),
  };

  // Trả về HTTP 429 nếu vượt giới hạn tần suất yêu cầu
  if (!rateLimitResult.isAllowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "Bạn đã gửi quá nhiều yêu cầu đặt hàng liên tục. Vui lòng đợi 1 phút trước khi thử lại.",
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      }
    );
  }

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
        { status: 500, headers: rateLimitHeaders }
      );
    }

    // Đọc formData và xác thực dữ liệu đặt hàng sớm để tránh khóa các khóa không hợp lệ
    const formData = await request.formData();
    const name = getFormValue(formData, "name");
    const phone = getFormValue(formData, "phone");
    const product = getFormValue(formData, "product");
    const quantity = getFormValue(formData, "quantity") || "1";
    const location = getFormValue(formData, "location");
    const note = getFormValue(formData, "note");

    if (!name || !phone || !product) {
      return NextResponse.json(
        {
          ok: false,
          message: "Vui lòng nhập họ tên, số điện thoại và sản phẩm.",
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    // Xác định khóa Idempotency (Lấy từ header hoặc băm nội dung đơn hàng dự phòng)
    let idempotencyKey = request.headers.get("x-idempotency-key") || 
                         request.headers.get("idempotency-key") || 
                         "";
    if (!idempotencyKey) {
      idempotencyKey = idempotencyService.generateHashKey(ip, name, phone, product);
    }

    // Kiểm tra bản ghi khóa trong cache
    const existingRecord = idempotencyService.get(idempotencyKey);
    if (existingRecord) {
      const responseHeaders = {
        ...rateLimitHeaders,
        "X-Idempotency-Cache": "HIT",
        "X-Idempotency-Key": idempotencyKey,
      };

      if (existingRecord.status === "processing") {
        return NextResponse.json(
          {
            ok: false,
            message: "Yêu cầu đặt hàng của bạn đang được xử lý. Vui lòng không nhấn liên tục.",
          },
          { status: 409, headers: responseHeaders }
        );
      }

      // Trả về ngay kết quả đệm thành công/thất bại trước đó
      return NextResponse.json(existingRecord.response.body, {
        status: existingRecord.response.status,
        headers: responseHeaders,
      });
    }

    // Đăng ký khóa tạm thời ở trạng thái "processing" (hạn dùng 5 phút)
    const now = Date.now();
    const ttl = 300000; // 5 phút
    idempotencyService.set(idempotencyKey, {
      status: "processing",
      response: { status: 200, body: null },
      expiresAt: now + ttl,
    });

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
    const totalVal = `${price * qtyNum}K`;

    // Sinh mã ID Firestore đồng bộ sớm để đồng bộ giữa 3 bên
    const orderCol = collection(db, "orders");
    const orderDocRef = doc(orderCol);
    const orderId = orderDocRef.id;

    const order = {
      id: orderId,
      name,
      customer: name,
      phone,
      product,
      quantity,
      qty: qtyNum,
      total: totalVal,
      location,
      note,
      status: "Pending" as const,
      source: "trekshield-landing",
      date: new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toISOString(),
      // Sync metadata initially set as pending
      syncStatus: "pending",
      syncError: null,
      updatedAt: new Date().toISOString(),
      paymentMethod: "Tiền mặt",
    };

    // 1. Lưu đơn hàng vào Firestore
    try {
      await setDoc(orderDocRef, order);
      console.log("Order saved to Firestore with ID:", orderId);
    } catch (fsError: any) {
      console.error("Firestore save error:", fsError.message || fsError);
    }

    // 2. Lưu đơn hàng vào file cache nội bộ làm fallback (chỉ chạy ở dev local)
    if (process.env.NODE_ENV === 'development') {
      try {
        const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
        
        // Đảm bảo thư mục tồn tại
        const dirPath = path.dirname(cacheFilePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        let cachedOrders = [];
        if (fs.existsSync(cacheFilePath)) {
          const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
          cachedOrders = JSON.parse(fileContent || '[]');
        }
        
        // Đồng bộ sử dụng chung ID thực tế
        const newLocalOrder = { ...order };
        cachedOrders.unshift(newLocalOrder);
        
        fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
        console.log("Order saved to local cache successfully.");
      } catch (cacheError) {
        console.error("Local order cache error:", cacheError);
      }
    }

    // --- KHẤU TRỪ TỒN KHO SẢN PHẨM ---
    try {
      let productId = "";
      const prodLower = product.toLowerCase();
      if (prodLower.includes("combo")) {
        productId = "combo-trekshield";
      } else if (prodLower.includes("premium")) {
        productId = "premium-wax";
      } else if (prodLower.includes("super")) {
        productId = "super-wax";
      }

      if (productId) {
        console.log(`Deducting stock for product: ${productId}, qty: ${qtyNum}`);

        let currentStock = 0;
        let productData: any = null;
        const prodDocRef = doc(db, "products", productId);

        // A. Cập nhật trong Firestore
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
            productData = initialMap[productId] || { name: product, price: "180K", type: "Sáp", stock: 50, status: "Active" };
            currentStock = productData.stock;
          }

          const newStock = Math.max(0, currentStock - qtyNum);
          const updatedProduct = {
            ...productData,
            stock: newStock,
            status: newStock > 15 ? 'Active' : 'Low stock',
            updatedAt: new Date().toLocaleDateString('vi-VN'),
            syncStatus: "pending"
          };

          await setDoc(prodDocRef, updatedProduct);
          console.log(`Updated Firestore stock for ${productId} to: ${newStock}`);
        } catch (fsProdErr) {
          console.error("Failed to update product stock in Firestore:", fsProdErr);
        }

        // B. Cập nhật trong local cache sản phẩm (chỉ chạy ở dev local)
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
              console.log("Updated product stock in local cache.");
            }
          } catch (cacheProdErr) {
            console.error("Failed to update product stock in local cache:", cacheProdErr);
          }
        }

        // C. Gửi webhook sang Google Sheets để đồng bộ stock
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
              console.error(`[Order Submit API] [${timestamp}] Google Sheet product stock update failed for product ID: ${productId}. Error: ${errMsg}`);
              await updateDoc(prodDocRef, {
                syncStatus: "failed",
                syncError: errMsg,
                lastSyncedAt: new Date().toISOString(),
              });
            }
          } catch (sheetDeductErr: any) {
            const errMsg = sheetDeductErr.message || String(sheetDeductErr);
            console.error(`[Order Submit API] [${timestamp}] Google Sheet product stock update failed for product ID: ${productId}. Error: ${errMsg}`);
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
      console.error("Error during stock deduction:", deductErr);
    }

    // 3. Gửi Webhook tới Google Sheet
    let finalResponseStatus = 200;
    let finalResponseBody = {
      ok: true,
      message: "Đơn hàng đã được lưu vào Google Sheet.",
    };

    try {
      const googleResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "create",
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
        finalResponseStatus = 500;
        finalResponseBody = {
          ok: false,
          message: "Google Apps Script trả về lỗi HTTP.",
        };
        throw new Error(`Google Apps Script returned HTTP ${googleResponse.status}`);
      } else if (googleResult && googleResult.ok === false) {
        finalResponseStatus = 500;
        finalResponseBody = {
          ok: false,
          message: googleResult.message || "Google Sheet từ chối lưu đơn.",
        };
        throw new Error(googleResult.message || "Google Sheet rejected order save.");
      }

      // Sync order succeeded
      await updateDoc(orderDocRef, {
        syncStatus: "synced",
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      });

    } catch (sheetErr: any) {
      const errMsg = sheetErr.message || String(sheetErr);
      console.error(`[Order Submit API] [${timestamp}] Google Sheet order submission failed for order ID: ${orderId}. Error: ${errMsg}`);
      
      finalResponseStatus = 500;
      finalResponseBody = {
        ok: false,
        message: "Không thể lưu đơn hàng vào Google Sheets: " + errMsg,
      };

      try {
        await updateDoc(orderDocRef, {
          syncStatus: "failed",
          syncError: errMsg,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (e) {}
    }

    // Cập nhật bản ghi hoàn thành "resolved" vào bộ nhớ đệm
    idempotencyService.set(idempotencyKey, {
      status: "resolved",
      response: {
        status: finalResponseStatus,
        body: finalResponseBody,
      },
      expiresAt: now + ttl,
    });

    const responseHeaders = {
      ...rateLimitHeaders,
      "X-Idempotency-Cache": "MISS",
      "X-Idempotency-Key": idempotencyKey,
    };

    return NextResponse.json(finalResponseBody, {
      status: finalResponseStatus,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[Order Submit API] [${timestamp}] Order submit error:`, error.message || error);

    return NextResponse.json(
      {
        ok: false,
        message: "Có lỗi xảy ra khi gửi đơn hàng.",
      },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}