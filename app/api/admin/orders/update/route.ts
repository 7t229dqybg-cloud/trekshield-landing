/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  try {
    const { id, status, phone } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ ok: false, message: "Thiếu thông tin cập nhật." }, { status: 400 });
    }

    console.log(`Processing status update for order: ${id} to ${status}`);

    const syncMetadataInit = {
      status,
      syncStatus: "pending",
      updatedAt: new Date().toISOString(),
    };

    const orderDocRef = doc(db, "orders", id);

    // 1. Cập nhật trên Cloud Firestore trước
    if (!id.startsWith('local_')) {
      try {
        await updateDoc(orderDocRef, syncMetadataInit);
        console.log(`Updated order ${id} status to ${status} (pending sync) in Firestore.`);
      } catch (fsError: any) {
        console.error(`[Order Update API] [${timestamp}] Error updating order ${id} status in Firestore:`, fsError.message || fsError);
      }
    }

    // 2. Cập nhật trong file cache cục bộ
    try {
      const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
      if (fs.existsSync(cacheFilePath)) {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        let cachedOrders = JSON.parse(fileContent || '[]');
        cachedOrders = cachedOrders.map((o: any) => o.id === id ? { ...o, ...syncMetadataInit } : o);
        fs.writeFileSync(cacheFilePath, JSON.stringify(cachedOrders, null, 2), 'utf8');
        console.log(`Updated order ${id} status to ${status} in local cache.`);
      }
    } catch (cacheError) {
      console.error("Error updating local cache for update:", cacheError);
    }

    // 3. Gửi webhook yêu cầu cập nhật đơn hàng trên Google Sheets
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

    if (webhookUrl && webhookSecret) {
      try {
        console.log("Sending status update request to Google Sheet webhook...");
        const googleResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: "update",
            id: id,
            phone: phone || "",
            status: status,
            secret: webhookSecret
          }),
          redirect: "follow",
          cache: "no-store",
        });

        const text = await googleResponse.text();
        console.log("Google Sheets update webhook response:", text);

        let parsed: any = {};
        try { parsed = JSON.parse(text); } catch (e) {}

        if (googleResponse.ok && parsed.ok !== false) {
          // Sync succeeded
          const syncSuccess = {
            syncStatus: "synced",
            syncError: null,
            lastSyncedAt: new Date().toISOString(),
          };

          if (!id.startsWith('local_')) {
            await updateDoc(orderDocRef, syncSuccess);
          }
        } else {
          // Server returned error or parsed.ok is false
          const errMsg = parsed.message || `Sheets API returned HTTP ${googleResponse.status}`;
          console.error(`[Order Update API] [${timestamp}] Google Sheet update failed for order ID: ${id}. Error: ${errMsg}`);
          
          const syncFailure = {
            syncStatus: "failed",
            syncError: errMsg,
            lastSyncedAt: new Date().toISOString(),
          };

          if (!id.startsWith('local_')) {
            await updateDoc(orderDocRef, syncFailure);
          }
        }
      } catch (googleError: any) {
        const errMsg = googleError.message || String(googleError);
        console.error(`[Order Update API] [${timestamp}] Google Sheet update failed for order ID: ${id}. Error: ${errMsg}`);

        const syncFailure = {
          syncStatus: "failed",
          syncError: errMsg,
          lastSyncedAt: new Date().toISOString(),
        };

        if (!id.startsWith('local_')) {
          try {
            await updateDoc(orderDocRef, syncFailure);
          } catch (e) {}
        }
      }
    } else {
      console.warn("Google Sheet update webhook URL or secret is missing. Skipping Sheets update.");
      const syncFailure = {
        syncStatus: "failed",
        syncError: "Missing webhook configuration",
        lastSyncedAt: new Date().toISOString(),
      };
      if (!id.startsWith('local_')) {
        try {
          await updateDoc(orderDocRef, syncFailure);
        } catch (e) {}
      }
    }

    return NextResponse.json({ ok: true, message: "Trạng thái đơn hàng đã được cập nhật đồng bộ." });
  } catch (error: any) {
    console.error(`[Order Update API] [${timestamp}] Order status update error:`, error.message || error);
    return NextResponse.json({ ok: false, message: "Có lỗi xảy ra khi cập nhật đơn hàng." }, { status: 500 });
  }
}
