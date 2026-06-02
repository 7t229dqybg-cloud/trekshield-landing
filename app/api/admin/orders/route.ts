import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function GET() {
  const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
  let cachedOrders = [];
  try {
    if (fs.existsSync(cacheFilePath)) {
      const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
      cachedOrders = JSON.parse(fileContent || '[]');
    }
  } catch (e) {
    console.error("Error reading orders cache file:", e);
  }
  return NextResponse.json({ ok: true, orders: cachedOrders });
}
