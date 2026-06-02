import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { action, secret, id, name, stock, price, type, updatedAt } = data;

    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;
    if (!secret || secret !== webhookSecret) {
      console.warn("Unauthorized products sync-webhook: invalid secret.");
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    console.log(`Incoming products sync-webhook action: ${action} for ${id}`);

    if (action === "sheet_product_update" || action === "update_product" || action === "update") {
      if (id) {
        const prodStock = Number(stock) || 0;
        
        // 1. Cập nhật Firestore
        try {
          const docRef = doc(db, "products", id);
          const snap = await getDoc(docRef);
          let existingData = {};
          if (snap.exists()) {
            existingData = snap.data();
          }

          const updatedProduct = {
            ...existingData,
            id,
            name: name || (existingData as any).name || id,
            stock: prodStock,
            price: price || (existingData as any).price || "180K",
            type: type || (existingData as any).type || "Sáp",
            status: prodStock > 15 ? 'Active' : 'Low stock',
            updatedAt: updatedAt || new Date().toLocaleDateString('vi-VN')
          };

          await setDoc(docRef, updatedProduct);
          console.log(`Sync-webhook updated Firestore product ${id} stock to ${prodStock}`);
        } catch (fsErr) {
          console.error("Sync-webhook failed to update Firestore:", fsErr);
        }

        // 2. Cập nhật cache local
        try {
          const cacheFilePath = path.join(process.cwd(), 'app/lib/products-cache.json');
          if (fs.existsSync(cacheFilePath)) {
            const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
            let cachedProducts = JSON.parse(fileContent || '[]');
            
            const exists = cachedProducts.some((p: any) => p.id === id);
            if (exists) {
              cachedProducts = cachedProducts.map((p: any) => {
                if (p.id === id) {
                  return {
                    ...p,
                    stock: prodStock,
                    status: prodStock > 15 ? 'Active' : 'Low stock',
                    updatedAt: updatedAt || new Date().toLocaleDateString('vi-VN')
                  };
                }
                return p;
              });
            } else {
              cachedProducts.push({
                id,
                name: name || id,
                stock: prodStock,
                price: price || "180K",
                type: type || "Sáp",
                status: prodStock > 15 ? 'Active' : 'Low stock',
                updatedAt: updatedAt || new Date().toLocaleDateString('vi-VN')
              });
            }

            fs.writeFileSync(cacheFilePath, JSON.stringify(cachedProducts, null, 2), 'utf8');
            console.log(`Sync-webhook updated local cache for product ${id}.`);
          }
        } catch (cacheErr) {
          console.error("Sync-webhook failed to update local cache:", cacheErr);
        }
      }
    }

    return NextResponse.json({ ok: true, message: "Đồng bộ sản phẩm thành công." });
  } catch (error) {
    console.error("Products sync-webhook error:", error);
    return NextResponse.json({ ok: false, message: "Lỗi webhook đồng bộ sản phẩm." }, { status: 500 });
  }
}
