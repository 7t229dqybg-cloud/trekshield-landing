/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  try {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      console.error(`[Products Sync API] [${timestamp}] Sync failed: Missing configuration.`);
      return NextResponse.json({ ok: false, message: "Thiếu cấu hình Google Sheet webhook." }, { status: 500 });
    }

    console.log("Triggering 3-way products sync...");

    // 1. Lấy dữ liệu sản phẩm từ Google Sheets
    let sheetProducts: any[] = [];
    try {
      const googleResponse = await fetch(`${webhookUrl}?secret=${webhookSecret}&action=read_products`, {
        method: "GET",
        headers: { "Accept": "application/json" },
        redirect: "follow",
        cache: "no-store",
      });

      if (googleResponse.ok) {
        const text = await googleResponse.text();
        try {
          const json = JSON.parse(text);
          if (json && Array.isArray(json.products)) {
            sheetProducts = json.products;
          } else if (Array.isArray(json)) {
            sheetProducts = json;
          }
        } catch (jsonErr: any) {
          console.warn("Could not parse products from sheet as JSON:", text);
          throw new Error(`JSON parse error: ${jsonErr.message}`);
        }
      } else {
        throw new Error(`Sheets API returned HTTP ${googleResponse.status}`);
      }
    } catch (sheetErr: any) {
      console.error(`[Products Sync API] [${timestamp}] Error reading products from Google Sheet:`, sheetErr.message || sheetErr);
      return NextResponse.json({ 
        ok: false, 
        message: "Không thể kết nối Google Sheets: " + (sheetErr.message || String(sheetErr)) 
      }, { status: 502 });
    }

    // 2. Lấy dữ liệu sản phẩm từ Cloud Firestore
    let firestoreProducts: any[] = [];
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      querySnapshot.forEach((doc) => {
        firestoreProducts.push({ id: doc.id, ...doc.data() });
      });
    } catch (fsErr: any) {
      console.error(`[Products Sync API] [${timestamp}] Error fetching products from Cloud Firestore:`, fsErr.message || fsErr);
    }

    // 3. Khởi tạo maps so sánh
    const sheetProductMap = new Map(sheetProducts.map(p => [p.id, p]));
    const firestoreProductMap = new Map(firestoreProducts.map(p => [p.id, p]));

    const stats = {
      syncedToFirestore: 0,
      syncedToSheet: 0
    };

    // Đọc cache local ban đầu
    const cacheFilePath = path.join(process.cwd(), 'app/lib/products-cache.json');
    let cachedProducts: any[] = [];
    if (fs.existsSync(cacheFilePath)) {
      try {
        cachedProducts = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8') || '[]');
      } catch (e) {
        console.error(e);
      }
    }
    const cachedProductMap = new Map(cachedProducts.map(p => [p.id, p]));

    // Danh sách 3 mã sản phẩm chuẩn của TrekShield
    const standardIds = ["super-wax", "premium-wax", "combo-trekshield"];

    for (const id of standardIds) {
      const sProduct = sheetProductMap.get(id);
      const fProduct = firestoreProductMap.get(id);
      const cProduct = cachedProductMap.get(id) || { id, stock: 50 };

      // Xác định số lượng tồn kho và thuộc tính tối ưu
      let targetStock = cProduct.stock;
      let finalProductData = { ...cProduct };

      if (fProduct) {
        targetStock = fProduct.stock;
        finalProductData = { ...fProduct };
      }

      let source = "local-cache-fallback";
      if (fProduct) {
        source = "firestore";
      }

      if (sProduct) {
        // Ưu tiên dữ liệu tồn kho từ Google Sheet nếu có chênh lệch
        targetStock = Number(sProduct.stock) || 0;
        source = "google-sheet-sync";
        finalProductData = {
          ...finalProductData,
          ...sProduct,
          stock: targetStock,
          status: targetStock > 15 ? 'Active' : 'Low stock',
          updatedAt: sProduct.updatedAt || new Date().toLocaleDateString('vi-VN')
        };
      }

      // Đảm bảo ghi đồng bộ lại Firestore kèm metadata
      let syncStatus = "synced";
      let syncError = null;

      // Đảm bảo ghi đồng bộ lại Google Sheet nếu chưa khớp
      if (!sProduct || Number(sProduct.stock) !== targetStock) {
        try {
          const sheetRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "update_product",
              id: id,
              stock: targetStock,
              secret: webhookSecret
            }),
            redirect: "follow",
          });

          if (sheetRes.ok) {
            stats.syncedToSheet++;
            console.log(`Synced product ${id} stock to Sheet: ${targetStock}`);
          } else {
            throw new Error(`Sheets update_product returned HTTP ${sheetRes.status}`);
          }
        } catch (sheetErr: any) {
          syncStatus = "failed";
          syncError = sheetErr.message || String(sheetErr);
          console.error(`[Products Sync API] [${timestamp}] Failed to sync product ${id} to Sheet:`, syncError);
        }
      }

      const syncMetadata = {
        lastSyncedAt: new Date().toISOString(),
        syncStatus,
        syncError,
        source,
        updatedAt: new Date().toISOString(),
      };

      try {
        const docRef = doc(db, "products", id);
        const finalDoc = {
          ...finalProductData,
          ...syncMetadata,
        };
        await setDoc(docRef, finalDoc);
        stats.syncedToFirestore++;
      } catch (fsErr: any) {
        console.error(`[Products Sync API] [${timestamp}] Failed to sync product ${id} to Firestore:`, fsErr.message || fsErr);
      }

      // Cập nhật lại cache map
      cachedProductMap.set(id, { ...finalProductData, ...syncMetadata });
    }

    // Ghi ngược lại tệp cache cục bộ (chỉ chạy ở dev local)
    if (process.env.NODE_ENV === 'development') {
      const finalCacheList = Array.from(cachedProductMap.values());
      try {
        fs.writeFileSync(cacheFilePath, JSON.stringify(finalCacheList, null, 2), 'utf8');
        console.log("Local products cache updated successfully during sync.");
      } catch (e) {
        console.error(e);
      }
    }

    return NextResponse.json({ ok: true, message: "Đồng bộ tồn kho sản phẩm hoàn tất.", stats });
  } catch (error: any) {
    console.error(`[Products Sync API] [${timestamp}] Products sync error:`, error.message || error);
    return NextResponse.json({ ok: false, message: "Lỗi đồng bộ sản phẩm." }, { status: 500 });
  }
}
