/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const productsCol = collection(db, "products");
    const querySnapshot = await getDocs(productsCol);
    const products: any[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    if (products.length > 0) {
      // Define a standard order for products
      const orderMap: Record<string, number> = {
        "super-wax": 1,
        "premium-wax": 2,
        "combo-trekshield": 3
      };
      products.sort((a, b) => (orderMap[a.id] || 99) - (orderMap[b.id] || 99));
      return NextResponse.json(
        { ok: true, products },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        }
      );
    }
    throw new Error("No products found in Firestore");
  } catch (e) {
    console.error("Error reading products from Firestore, falling back to cache:", e);
    // Fallback to cache file
    const cacheFilePath = path.join(process.cwd(), 'app/lib/products-cache.json');
    let cachedProducts = [];
    try {
      if (fs.existsSync(cacheFilePath)) {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        cachedProducts = JSON.parse(fileContent || '[]');
      }
    } catch (cacheErr) {
      console.error("Error reading products cache file:", cacheErr);
    }
    return NextResponse.json(
      { ok: true, products: cachedProducts },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
