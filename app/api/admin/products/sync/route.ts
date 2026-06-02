import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      console.error("Products Sync API: Missing configuration.");
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
        } catch (jsonErr) {
          console.warn("Could not parse products from sheet as JSON:", text);
        }
      }
    } catch (sheetErr) {
      console.error("Error reading products from Google Sheet:", sheetErr);
    }

    // 2. Lấy dữ liệu sản phẩm từ Cloud Firestore
    let firestoreProducts: any[] = [];
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      querySnapshot.forEach((doc) => {
        firestoreProducts.push({ id: doc.id, ...doc.data() });
      });
    } catch (fsErr) {
      console.error("Error fetching products from Cloud Firestore:", fsErr);
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

      if (sProduct) {
        // Ưu tiên dữ liệu tồn kho từ Google Sheet nếu có chênh lệch
        targetStock = Number(sProduct.stock) || 0;
        finalProductData = {
          ...finalProductData,
          ...sProduct,
          stock: targetStock,
          status: targetStock > 15 ? 'Active' : 'Low stock',
          updatedAt: sProduct.updatedAt || new Date().toLocaleDateString('vi-VN')
        };
      }

      // Đảm bảo ghi đồng bộ lại Firestore
      try {
        const docRef = doc(db, "products", id);
        await setDoc(docRef, finalProductData);
        stats.syncedToFirestore++;
      } catch (fsErr) {
        console.error(`Failed to sync product ${id} to Firestore:`, fsErr);
      }

      // Đảm bảo ghi đồng bộ lại Google Sheet nếu chưa khớp
      if (!sProduct || Number(sProduct.stock) !== targetStock) {
        try {
          await fetch(webhookUrl, {
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
          stats.syncedToSheet++;
        } catch (sheetErr) {
          console.error(`Failed to sync product ${id} to Sheet:`, sheetErr);
        }
      }

      // Cập nhật lại cache map
      cachedProductMap.set(id, finalProductData);
    }

    // Ghi ngược lại tệp cache cục bộ
    const finalCacheList = Array.from(cachedProductMap.values());
    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(finalCacheList, null, 2), 'utf8');
      console.log("Local products cache updated successfully during sync.");
    } catch (e) {
      console.error(e);
    }

    return NextResponse.json({ ok: true, message: "Đồng bộ tồn kho sản phẩm hoàn tất.", stats });
  } catch (error) {
    console.error("Products sync error:", error);
    return NextResponse.json({ ok: false, message: "Lỗi đồng bộ sản phẩm." }, { status: 500 });
  }
}
