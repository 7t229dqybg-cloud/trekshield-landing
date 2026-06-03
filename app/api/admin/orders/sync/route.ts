/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase";
import { collection, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
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
      console.error(`[Sync Orders API] [${timestamp}] Sync failed: Missing webhook configuration.`);
      return NextResponse.json({ ok: false, message: "Thiếu cấu hình Google Sheet webhook." }, { status: 500 });
    }

    console.log("Triggering 3-way synchronization...");

    // 1. Lấy dữ liệu từ Google Sheets
    let sheetOrders: any[] = [];
    try {
      const googleResponse = await fetch(`${webhookUrl}?secret=${webhookSecret}&action=read`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        redirect: "follow",
        cache: "no-store",
      });

      if (!googleResponse.ok) {
        throw new Error(`Google Sheets API returned HTTP ${googleResponse.status}`);
      }

      const text = await googleResponse.text();
      try {
        const json = JSON.parse(text);
        if (json && Array.isArray(json.orders)) {
          sheetOrders = json.orders;
        } else if (Array.isArray(json)) {
          sheetOrders = json;
        } else {
          console.warn("Invalid format returned from Google Sheet:", text);
        }
      } catch (parseErr: any) {
        console.warn("Could not parse Google Sheet response as JSON. It might be empty or offline:", text);
        throw new Error(`JSON parse error: ${parseErr.message}`);
      }
    } catch (sheetErr: any) {
      console.error(`[Sync Orders API] [${timestamp}] Error reading from Google Sheet:`, sheetErr.message || sheetErr);
      // Let it throw or return error since we want production to report connectivity health
      return NextResponse.json({ 
        ok: false, 
        message: "Không thể kết nối với Google Sheet: " + (sheetErr.message || String(sheetErr)) 
      }, { status: 502 });
    }

    // 2. Lấy toàn bộ đơn hàng từ Cloud Firestore
    let firestoreOrders: any[] = [];
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      querySnapshot.forEach((doc) => {
        firestoreOrders.push({ id: doc.id, ...doc.data() });
      });
      console.log(`Fetched ${firestoreOrders.length} orders from Firestore.`);
    } catch (fsErr: any) {
      console.error(`[Sync Orders API] [${timestamp}] Error fetching from Cloud Firestore:`, fsErr.message || fsErr);
    }

    // Đọc thêm từ cache cục bộ làm dự phòng
    const cacheFilePath = path.join(process.cwd(), 'app/lib/orders-cache.json');
    let cachedOrders: any[] = [];
    try {
      if (fs.existsSync(cacheFilePath)) {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        cachedOrders = JSON.parse(fileContent || '[]');
      }
    } catch (cacheReadErr) {
      console.error("Error reading local cache:", cacheReadErr);
    }

    const stats = {
      addedToFirestore: 0,
      deletedFromFirestore: 0,
      updatedInFirestore: 0,
      deletedFromSheet: 0,
      updatedInSheet: 0,
      updatedIdsInSheet: 0,
    };

    // Tạo tập hợp để so sánh chéo hiệu quả
    const sheetOrderMap = new Map(sheetOrders.map(o => [o.id, o]));
    const firestoreOrderMap = new Map(firestoreOrders.map(o => [o.id, o]));
    const cachedOrderMap = new Map(cachedOrders.map(o => [o.id, o]));

    // --- PHẦN 1: DUYỆT SHEET ORDERS ĐỂ CẬP NHẬT/THÊM VÀO FIRESTORE ---
    for (const sheetOrder of sheetOrders) {
      const sId = sheetOrder.id;

      // TH1: Hàng mới tạo trên Sheet, CHƯA CÓ ID (Trống hoặc undefined/null)
      // -> Đây là dữ liệu ban đầu hoặc dòng mới thêm tay trên Sheet
      if (!sId || sId === "" || sId === "undefined" || sId === "null") {
        // Sinh ID Firestore mới
        const newDocRef = doc(collection(db, "orders"));
        const newId = newDocRef.id;

        const newOrder = {
          ...sheetOrder,
          id: newId,
          qty: Number(sheetOrder.qty || sheetOrder.quantity) || 1,
          quantity: String(sheetOrder.quantity || sheetOrder.qty || "1"),
          status: sheetOrder.status || "Pending",
          source: "google-sheet-sync",
          date: sheetOrder.date || new Date().toLocaleDateString('vi-VN'),
          createdAt: sheetOrder.createdAt || new Date().toISOString(),
          paymentMethod: sheetOrder.paymentMethod || sheetOrder.payment_method || sheetOrder.hinhThucThanhToan || sheetOrder["Hình thức thanh toán"] || "Tiền mặt",
          // Sync metadata
          sheetRowId: sheetOrder.rowId || sheetOrder.rowNumber || null,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: "synced",
          syncError: null,
          updatedAt: new Date().toISOString(),
        };

        // Ghi vào Firestore
        try {
          await setDoc(newDocRef, newOrder);
          stats.addedToFirestore++;
          console.log(`Synced new order from Sheet to Firestore: ${newId}`);
        } catch (fsWriteErr: any) {
          console.error(`[Sync Orders API] [${timestamp}] Failed to write new sheet order to Firestore:`, fsWriteErr.message || fsWriteErr);
        }

        // Gọi webhook Sheets để cập nhật ID mới cho dòng này
        try {
          const sheetRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "update_id",
              phone: sheetOrder.phone || "",
              createdAt: sheetOrder.createdAt || "",
              new_id: newId,
              secret: webhookSecret
            }),
            redirect: "follow",
          });
          
          if (!sheetRes.ok) {
            throw new Error(`Sheets update_id returned HTTP ${sheetRes.status}`);
          }
          
          stats.updatedIdsInSheet++;
          console.log(`Updated Sheet row with new ID: ${newId}`);
        } catch (sheetUpdateErr: any) {
          console.error(`[Sync Orders API] [${timestamp}] Failed to update ID back on Sheet for ${newId}:`, sheetUpdateErr.message || sheetUpdateErr);
          // Update Firestore sync status to failed
          try {
            await setDoc(newDocRef, { 
              syncStatus: "failed", 
              syncError: `Failed to update ID on Sheets: ${sheetUpdateErr.message || String(sheetUpdateErr)}` 
            }, { merge: true });
          } catch (e) {}
        }

        // Thêm vào bản đồ tạm để xử lý tiếp
        firestoreOrderMap.set(newId, newOrder);
        cachedOrderMap.set(newId, newOrder);
        continue;
      }

      // TH2: Có ID nhưng KHÔNG TỒN TẠI trong Firestore -> Đồng bộ thêm vào Firestore để phục hồi dữ liệu từ Sheets
      if (!firestoreOrderMap.has(sId)) {
        if (!sId.startsWith('local_')) {
          const newDocRef = doc(db, "orders", sId);
          const newOrder = {
            ...sheetOrder,
            qty: Number(sheetOrder.qty || sheetOrder.quantity) || 1,
            quantity: String(sheetOrder.quantity || sheetOrder.qty || "1"),
            status: sheetOrder.status || "Pending",
            source: sheetOrder.source || "google-sheet-sync",
            date: sheetOrder.date || new Date().toLocaleDateString('vi-VN'),
            createdAt: sheetOrder.createdAt || new Date().toISOString(),
            paymentMethod: sheetOrder.paymentMethod || sheetOrder.payment_method || sheetOrder.hinhThucThanhToan || sheetOrder["Hình thức thanh toán"] || "Tiền mặt",
            // Sync metadata
            sheetRowId: sheetOrder.rowId || sheetOrder.rowNumber || null,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: "synced",
            syncError: null,
            updatedAt: new Date().toISOString(),
          };

          try {
            await setDoc(newDocRef, newOrder);
            stats.addedToFirestore++;
            console.log(`Synced order ${sId} from Sheet to Firestore (imported/restored).`);
          } catch (fsWriteErr: any) {
            console.error(`[Sync Orders API] [${timestamp}] Failed to write restored sheet order ${sId} to Firestore:`, fsWriteErr.message || fsWriteErr);
          }

          firestoreOrderMap.set(sId, newOrder);
          cachedOrderMap.set(sId, newOrder);
          continue;
        }
      }

      // TH3: ID tồn tại ở cả hai nơi -> So sánh trạng thái
      const fsOrder = firestoreOrderMap.get(sId);
      if (fsOrder) {
        let needsUpdate = false;
        const updateData: any = {};

        if (fsOrder.status !== sheetOrder.status) {
          updateData.status = sheetOrder.status;
          needsUpdate = true;
        }

        // Sync metadata update
        if (!fsOrder.lastSyncedAt || fsOrder.syncStatus !== "synced" || fsOrder.sheetRowId !== (sheetOrder.rowId || sheetOrder.rowNumber)) {
          updateData.sheetRowId = sheetOrder.rowId || sheetOrder.rowNumber || null;
          updateData.lastSyncedAt = new Date().toISOString();
          updateData.syncStatus = "synced";
          updateData.syncError = null;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updateData.updatedAt = new Date().toISOString();
          try {
            const docRef = doc(db, "orders", sId);
            await setDoc(docRef, updateData, { merge: true });
            stats.updatedInFirestore++;
            console.log(`Updated status/metadata of ${sId} in Firestore.`);
          } catch (fsUpdateErr: any) {
            console.error(`[Sync Orders API] [${timestamp}] Failed to update status in Firestore for ${sId}:`, fsUpdateErr.message || fsUpdateErr);
          }

          // Cập nhật bản đồ cache
          const cachedItem = cachedOrderMap.get(sId);
          if (cachedItem) {
            cachedOrderMap.set(sId, { ...cachedItem, ...updateData });
          }
        }
      }
    }

    // --- PHẦN 2: DUYỆT FIRESTORE ORDERS ĐỂ KIỂM TRA XÓA TRÊN SHEETS ---
    for (const fsOrder of firestoreOrders) {
      const fsId = fsOrder.id;

      // TH1: Đơn hàng tồn tại trong Firestore nhưng KHÔNG CÓ TRÊN SHEET (và Sheet đã load thành công > 0 dòng)
      // -> Đơn đã bị xóa trực tiếp khỏi Google Sheets!
      // (Đồng bộ xóa: xóa tài liệu khỏi Firestore và Cache)
      if (sheetOrders.length > 0 && !sheetOrderMap.has(fsId)) {
        if (!fsId.startsWith('local_')) {
          try {
            await deleteDoc(doc(db, "orders", fsId));
            stats.deletedFromFirestore++;
            console.log(`Deleted order ${fsId} from Firestore because it was deleted from Sheets.`);
          } catch (fsDeleteErr: any) {
            console.error(`[Sync Orders API] [${timestamp}] Failed to delete document ${fsId} from Firestore:`, fsDeleteErr.message || fsDeleteErr);
          }
        }
        cachedOrderMap.delete(fsId);
      }
    }

    // --- PHẦN 3: GHI LẠI BẢN HỢP NHẤT SAU ĐỒNG BỘ VÀO CACHE CỤC BỘ ---
    const finalOrdersList: any[] = [];
    
    // Đọc lại từ Firestore để đảm bảo đồng bộ hoàn hảo
    const finalFSOrders = new Map<string, any>();
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
      querySnapshot.forEach((doc) => {
        finalFSOrders.set(doc.id, { id: doc.id, ...doc.data() });
      });
    } catch (e) {
      console.error("Error fetching final Firestore state:", e);
    }

    // Gộp Firestore và Local Cache
    cachedOrderMap.forEach((cachedOrder, id) => {
      if (finalFSOrders.has(id)) {
        finalOrdersList.push(finalFSOrders.get(id));
      } else {
        finalOrdersList.push(cachedOrder);
      }
    });

    // Thêm các Firestore doc còn thiếu trong cache map
    finalFSOrders.forEach((fsOrd, id) => {
      const alreadyAdded = finalOrdersList.some(o => o.id === id);
      if (!alreadyAdded) {
        finalOrdersList.push(fsOrd);
      }
    });

    // Sắp xếp theo ngày mới nhất
    finalOrdersList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Ghi cache (chỉ chạy ở dev local)
    if (process.env.NODE_ENV === 'development') {
      try {
        const dirPath = path.dirname(cacheFilePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(cacheFilePath, JSON.stringify(finalOrdersList, null, 2), 'utf8');
        console.log("3-way sync complete. Local cache updated with", finalOrdersList.length, "orders.");
      } catch (cacheWriteErr) {
        console.error("Failed to write to local cache file during sync:", cacheWriteErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Đồng bộ hóa 3 bên hoàn tất thành công.",
      stats
    });

  } catch (error: any) {
    console.error(`[Sync Orders API] [${timestamp}] Sync API error:`, error.message || error);
    return NextResponse.json({ ok: false, message: "Có lỗi xảy ra khi thực hiện đồng bộ hóa." }, { status: 500 });
  }
}
