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
    const ordersCol = collection(db, "orders");
    const querySnapshot = await getDocs(ordersCol);
    const orders: any[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt descending
    orders.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json(
      { ok: true, orders },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (e) {
    console.error("Error reading orders from Firestore, falling back to cache:", e);
    // Fallback to cache file
    const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
    let cachedOrders = [];
    try {
      if (fs.existsSync(cacheFilePath)) {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        cachedOrders = JSON.parse(fileContent || '[]');
      }
    } catch (cacheErr) {
      console.error("Error reading orders cache file:", cacheErr);
    }
    return NextResponse.json(
      { ok: true, orders: cachedOrders },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0, must-revalidate",
        },
      }
    );
  }
}
