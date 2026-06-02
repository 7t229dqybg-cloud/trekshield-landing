/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { db } from "../../lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result: any = {
    ok: true,
    firestore: {
      configured: false,
      projectId: null,
      canRead: false,
      error: null,
    },
    sheets: {
      configured: false,
      sheetIdExists: false,
      canRead: false,
      error: null,
    },
    sync: {
      lastSyncedAt: null,
      status: "unknown",
    },
    environment: {
      firebaseAdminPrivateKeyConfigured: false,
      googlePrivateKeyConfigured: false,
    }
  };

  // 1. Check client project ID configuration
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    result.firestore.configured = true;
    result.firestore.projectId = projectId;
  }

  // 2. Check Firestore read capability
  try {
    const productsCol = collection(db, "products");
    const q = query(productsCol, limit(1));
    await getDocs(q);
    result.firestore.canRead = true;
  } catch (fsErr: any) {
    result.firestore.canRead = false;
    result.firestore.error = fsErr.message || String(fsErr);
    result.ok = false;
  }

  // 3. Check Google Sheets webhook configurations & connectivity
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const webhookSecret = process.env.ORDER_WEBHOOK_SECRET;

  if (webhookUrl) {
    result.sheets.configured = true;
    // Extract sheet ID or script ID from the webhook URL safely if possible
    try {
      const match = webhookUrl.match(/\/macros\/s\/([^/]+)\/exec/);
      if (match && match[1]) {
        result.sheets.sheetIdExists = true; // The deployment script identifier exists
      }
    } catch (e) {}

    // Check connectivity to Google Sheets (try to ping/read)
    if (webhookSecret) {
      try {
        const googleResponse = await fetch(`${webhookUrl}?secret=${webhookSecret}&action=read_products`, {
          method: "GET",
          headers: { "Accept": "application/json" },
          redirect: "follow",
          cache: "no-store",
        });

        if (googleResponse.ok) {
          result.sheets.canRead = true;
        } else {
          result.sheets.canRead = false;
          result.sheets.error = `HTTP Status ${googleResponse.status}`;
          result.ok = false;
        }
      } catch (sheetErr: any) {
        result.sheets.canRead = false;
        result.sheets.error = sheetErr.message || String(sheetErr);
        result.ok = false;
      }
    } else {
      result.sheets.error = "Missing ORDER_WEBHOOK_SECRET for authentication";
      result.ok = false;
    }
  } else {
    result.sheets.error = "Missing GOOGLE_SHEET_WEBHOOK_URL env var";
    result.ok = false;
  }

  // 4. Verify formatting checks of server private keys if they are defined
  const firebaseAdminKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (firebaseAdminKey) {
    result.environment.firebaseAdminPrivateKeyConfigured = true;
    // Normalization check test
    const normalizedKey = firebaseAdminKey.replace(/\\n/g, "\n");
    if (!normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
      result.environment.firebaseAdminPrivateKeyError = "Key format invalid (missing BEGIN PRIVATE KEY prefix)";
    }
  }

  const googlePrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (googlePrivateKey) {
    result.environment.googlePrivateKeyConfigured = true;
    // Normalization check test
    const normalizedKey = googlePrivateKey.replace(/\\n/g, "\n");
    if (!normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
      result.environment.googlePrivateKeyError = "Key format invalid (missing BEGIN PRIVATE KEY prefix)";
    }
  }

  // 5. Try to find the most recent synchronization timestamp from orders/products metadata
  try {
    const ordersCol = collection(db, "orders");
    const ordersSnapshot = await getDocs(ordersCol);
    let latestSync: number = 0;
    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.lastSyncedAt) {
        const t = new Date(data.lastSyncedAt).getTime();
        if (t > latestSync) {
          latestSync = t;
          result.sync.lastSyncedAt = data.lastSyncedAt;
        }
      }
    });

    if (result.sync.lastSyncedAt) {
      result.sync.status = "ok";
    } else {
      result.sync.status = "no_sync_metadata_yet";
    }
  } catch (syncErr) {
    console.error("Error looking up sync metadata:", syncErr);
  }

  // If everything has been configured and tested correctly
  if (result.ok && result.sync.status !== "unknown") {
    result.sync.status = "ok";
  } else if (!result.ok) {
    result.sync.status = "error";
  }

  return NextResponse.json(result);
}
