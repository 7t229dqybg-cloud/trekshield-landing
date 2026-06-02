import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { id, stock, change } = await request.json();
    if (!id) {
      return NextResponse.json({ ok: false, message: "Thiếu mã sản phẩm." }, { status: 400 });
    }

    console.log(`Updating stock for product ${id}: stock=${stock}, change=${change}`);

    // 1. Cập nhật trong Firestore
    let newStock = stock;
    try {
      const productDocRef = doc(db, "products", id);
      const productSnap = await getDoc(productDocRef);
      let productData: any = null;

      if (productSnap.exists()) {
        productData = productSnap.data();
        if (change !== undefined) {
          newStock = Math.max(0, (Number(productData.stock) || 0) + change);
        }
      } else {
        const initialMap: Record<string, any> = {
          "super-wax": { name: "Super Wax", price: "180K", type: "Sáp trắng", stock: 72, badge: "Phù hợp người mới", description: "Dễ thoa, nhanh khô, không làm đổi màu quần áo và linh hoạt trên nhiều loại vải.", status: "Active" },
          "premium-wax": { name: "Premium Wax", price: "160K", type: "Sáp vàng", stock: 64, badge: "Bám lâu", description: "Chống nước vượt trội, bám lâu, độ bền cao, phù hợp vải chuyên dụng.", status: "Active" },
          "combo-trekshield": { name: "Combo TrekShield", price: "329K", type: "Super Wax + Premium Wax", stock: 50, badge: "Bán chạy", description: "Bộ đôi linh hoạt cho nhiều loại đồ outdoor, balô, áo khoác, giày vải và túi canvas.", status: "Active" }
        };
        productData = initialMap[id] || { name: id, price: "180K", type: "Sáp", stock: 50, status: "Active" };
        if (change !== undefined) {
          newStock = Math.max(0, productData.stock + change);
        }
      }

      const updatedProduct = {
        ...productData,
        stock: newStock,
        status: newStock > 15 ? 'Active' : 'Low stock',
        updatedAt: new Date().toLocaleDateString('vi-VN')
      };

      await setDoc(productDocRef, updatedProduct);
      console.log(`Updated Firestore product ${id} stock to ${newStock}`);
    } catch (fsError) {
      console.error(`Error updating product ${id} in Firestore:`, fsError);
    }

    // 2. Cập nhật trong cache local
    try {
      const cacheFilePath = path.join(process.cwd(), 'app/lib/products-cache.json');
      if (fs.existsSync(cacheFilePath)) {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        let cachedProducts = JSON.parse(fileContent || '[]');
        
        cachedProducts = cachedProducts.map((p: any) => {
          if (p.id === id) {
            const finalStock = change !== undefined ? Math.max(0, p.stock + change) : stock;
            return {
              ...p,
              stock: finalStock,
              status: finalStock > 15 ? 'Active' : 'Low stock',
              updatedAt: new Date().toLocaleDateString('vi-VN')
            };
          }
          return p;
        });

        fs.writeFileSync(cacheFilePath, JSON.stringify(cachedProducts, null, 2), 'utf8');
        console.log(`Updated local products cache for ${id}.`);
      }
    } catch (cacheError) {
      console.error("Error updating local products cache:", cacheError);
    }

    // 3. Gửi đồng bộ sang Google Sheets
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (webhookUrl && webhookSecret) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "update_product",
            id: id,
            stock: newStock,
            secret: webhookSecret
          }),
          redirect: "follow",
          cache: "no-store",
        });
        console.log(`Sent product stock update for ${id} to Sheets.`);
      } catch (sheetError) {
        console.error("Error updating product stock on Sheets:", sheetError);
      }
    }

    return NextResponse.json({ ok: true, message: "Cập nhật tồn kho sản phẩm thành công." });
  } catch (error) {
    console.error("Product update stock error:", error);
    return NextResponse.json({ ok: false, message: "Lỗi hệ thống khi cập nhật kho." }, { status: 500 });
  }
}
