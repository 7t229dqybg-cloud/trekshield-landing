import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function GET() {
  const cacheFilePath = path.join(process.cwd(), 'app/lib/products-cache.json');
  let cachedProducts = [];
  try {
    if (fs.existsSync(cacheFilePath)) {
      const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
      cachedProducts = JSON.parse(fileContent || '[]');
    }
  } catch (e) {
    console.error("Error reading products cache file:", e);
  }
  return NextResponse.json({ ok: true, products: cachedProducts });
}
