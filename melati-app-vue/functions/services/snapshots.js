import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { db, admin } from "../config.js";
import { resolveCallerRole } from "../helpers/auth-helpers.js";
import { toWitaParts, formatYmd, toDateFromYmd, shiftYmd } from "../helpers/date-helpers.js";
import {
  ensureSnapshotsForAllScopes,
  ensureSnapshotForYesterdayByScope,
  ensureSnapshotByDateYmdForScope,
} from "../helpers/snapshot-helpers.js";

export const scheduledCreateDailySnapshot = onSchedule(
  {
    schedule: "30 23 * * *",
    timeZone: "Asia/Makassar",
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async () => {
    await ensureSnapshotsForAllScopes("scheduler", "today");
  },
);

export const ensureYesterdaySnapshotOnFirstTxFloor = onDocumentWritten(
  {
    document: "floors/{floorId}/stokAksesorisTransaksi/{txId}",
    region: "asia-southeast2",
    memory: "256MiB",
    retry: false,
  },
  async (event) => {
    const floorId = String(event.params?.floorId || "")
      .trim()
      .toUpperCase();
    if (!["L1", "L2"].includes(floorId)) return;
    await ensureSnapshotForYesterdayByScope("firestore-write-fallback-floor", "floor", floorId);
  },
);

export const scheduledCreateDailyStockReports = onSchedule(
  {
    schedule: "40 23 * * *",
    timeZone: "Asia/Makassar",
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async () => {
    await ensureSnapshotsForAllScopes("scheduler-daily-reports", "today");
  },
);

export const saveDailySnapshot = onCall(
  {
    region: "asia-southeast2",
    memory: "256MiB",
    timeoutSeconds: 180,
  },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["admin", "supervisor", "staff"].includes(role)) {
      throw new HttpsError("permission-denied", "Anda tidak memiliki akses untuk menyimpan snapshot.");
    }

    const scopeRaw = String(request.data?.scope || "floor")
      .trim()
      .toLowerCase();
    const scope = scopeRaw === "global" ? "global" : "floor";
    const floorId = String(request.data?.floorId || "")
      .trim()
      .toUpperCase();
    const dateYmd = String(request.data?.dateYmd || "").trim();
    const reason = String(request.data?.reason || "manual").trim() || "manual";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
      throw new HttpsError("invalid-argument", "Format tanggal harus YYYY-MM-DD.");
    }

    const result = await ensureSnapshotByDateYmdForScope({
      triggerSource: `callable-saveDailySnapshot:${reason}`,
      scope,
      floorId,
      dateYmd,
    });

    return {
      ok: true,
      role,
      scope,
      floorId: floorId || null,
      ...result,
    };
  },
);

export const backfillSnapshots = onCall(
  {
    region: "asia-southeast2",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["admin", "supervisor"].includes(role)) {
      throw new HttpsError("permission-denied", "Anda harus admin/supervisor untuk menjalankan backfill snapshots.");
    }

    const scopeRaw = String(request.data?.scope || "floor")
      .trim()
      .toLowerCase();
    const scope = scopeRaw === "global" ? "global" : "floor";
    const floorId = String(request.data?.floorId || "")
      .trim()
      .toUpperCase();
    const startYmd = String(request.data?.startYmd || "").trim();
    const endYmd = String(request.data?.endYmd || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) {
      throw new HttpsError("invalid-argument", "Format tanggal harus YYYY-MM-DD.");
    }

    const startDate = toDateFromYmd(startYmd, "00:00:00");
    const endDate = toDateFromYmd(endYmd, "00:00:00");
    if (startDate > endDate) throw new HttpsError("invalid-argument", "startYmd harus <= endYmd.");

    const today = formatYmd(toWitaParts(new Date()));
    if (endYmd >= today) throw new HttpsError("failed-precondition", "Range harus sebelum hari berjalan.");

    const results = [];

    let current = startYmd;
    while (true) {
      try {
        const result = await ensureSnapshotByDateYmdForScope({
          triggerSource: "backfill",
          scope,
          floorId,
          dateYmd: current,
        });
        results.push({ date: current, created: !!result?.created, reason: result?.reason || null });
      } catch (error) {
        logger.error("Backfill snapshot error", { date: current, error: error.message });
        results.push({ date: current, error: error.message });
      }

      if (current === endYmd) break;
      current = shiftYmd(current, 1);
    }

    return { ok: true, scope, floorId: floorId || null, startYmd, endYmd, results };
  },
);

// ========== MIGRATION: Legacy → Floors/L1 ==========
// Bulk migrate legacy collections to floors/{floorId} paths
// Strategy B: Copy to floors/L1, keep legacy as backup

const MIGRATION_CONFIG = {
  manualOvertime: { sourceCollections: ["manualOvertime"] },
  mutasiKode: { sourceCollections: ["mutasiKode"] },
  orderBarang: { sourceCollections: ["orderBarang"] },
  order_online: { sourceCollections: ["order_online"] },
  order_online_management: { sourceCollections: ["order_online_management"] },
  penjualanAksesoris: { sourceCollections: ["penjualanAksesoris"] },
  restokBarang: { sourceCollections: ["restokBarang"] },
  salesStaff: { sourceCollections: ["salesStaff"] },
  settings: { sourceCollections: ["settings"] },
  stocks: { sourceCollections: ["stocks"] },
  stokAksesoris: { sourceCollections: ["stokAksesoris"] },
  stokAksesorisTransaksi: { sourceCollections: ["stokAksesorisTransaksi", "stokSksesorisTransaksi"] },
  systemLocks: { sourceCollections: ["systemLocks"], runtimeSensitive: true },
  users: { sourceCollections: ["users"] },
  attendance: { sourceCollections: ["attendance"] },
  dailyStockSnapshot: { sourceCollections: ["dailyStockSnapshot"] },
  daily_stock_reports: { sourceCollections: ["daily_stock_reports"] },
  employeeFaces: { sourceCollections: ["employeeFaces"] },
  employees: { sourceCollections: ["employees"] },
  kodeAksesoris: { sourceCollections: ["kodeAksesoris"] },
  latePermissionCodes: { sourceCollections: ["latePermissionCodes"] },
  leaveRequests: { sourceCollections: ["leaveRequests", "leaveRequest"] },
  maintenanceLogs: { sourceCollections: ["maintenanceLogs"] },
};

function getMigrationConfig(collectionName) {
  return MIGRATION_CONFIG[collectionName] || { sourceCollections: [collectionName] };
}

async function copyDocumentTree({ sourceDocRef, targetDocRef, batchWriter, stats }) {
  const sourceSnap = await sourceDocRef.get();
  if (!sourceSnap.exists) {
    stats.skippedDocs += 1;
    return;
  }

  batchWriter.set(targetDocRef, sourceSnap.data());
  stats.writtenDocs += 1;

  const subcollections = await sourceDocRef.listCollections();
  for (const sourceSubcollectionRef of subcollections) {
    // eslint-disable-next-line no-await-in-loop
    const subDocs = await sourceSubcollectionRef.get();
    for (const subDoc of subDocs.docs) {
      const targetSubDocRef = db.doc(`${targetDocRef.path}/${sourceSubcollectionRef.id}/${subDoc.id}`);
      // eslint-disable-next-line no-await-in-loop
      await copyDocumentTree({
        sourceDocRef: subDoc.ref,
        targetDocRef: targetSubDocRef,
        batchWriter,
        stats,
      });
    }
  }
}

async function migrateCollection(collectionName, floorId, batchSize = 500) {
  const config = getMigrationConfig(collectionName);
  const sourceCollections = [...new Set(config.sourceCollections || [collectionName])];
  const batchWriter = db.bulkWriter();

  let migratedCount = 0;
  let totalDocs = 0;
  let errorCount = 0;
  const errors = [];
  const stats = {
    writtenDocs: 0,
    skippedDocs: 0,
  };

  try {
    for (const sourceCollectionName of sourceCollections) {
      const sourceColRef = db.collection(sourceCollectionName);
      // eslint-disable-next-line no-await-in-loop
      const sourceDocs = await sourceColRef.get();
      totalDocs += sourceDocs.size;

      if (sourceDocs.size === 0) {
        logger.info("Migration: collection empty", { collectionName, sourceCollectionName });
        continue;
      }

      let processedCount = 0;
      for (const sourceDoc of sourceDocs.docs) {
        try {
          const targetDocRef = db.doc(`floors/${floorId}/${collectionName}/${sourceDoc.id}`);
          // eslint-disable-next-line no-await-in-loop
          await copyDocumentTree({
            sourceDocRef: sourceDoc.ref,
            targetDocRef,
            batchWriter,
            stats,
          });

          migratedCount += 1;
          processedCount += 1;

          if (processedCount % batchSize === 0) {
            // eslint-disable-next-line no-await-in-loop
            await batchWriter.flush();
            logger.info("Migration batch checkpoint", {
              collectionName,
              sourceCollectionName,
              processed: processedCount,
              total: sourceDocs.size,
            });
          }
        } catch (docError) {
          errorCount += 1;
          const errorMsg = `doc ${sourceCollectionName}/${sourceDoc.id}: ${docError.message}`;
          errors.push(errorMsg);
          logger.warn("Migration document error", {
            collectionName,
            sourceCollectionName,
            docId: sourceDoc.id,
            error: docError.message,
          });
        }
      }
    }

    await batchWriter.flush();

    logger.info("Migration collection completed", {
      collectionName,
      sourceCollections,
      migratedCount,
      totalDocs,
      writtenDocs: stats.writtenDocs,
      errorCount,
    });
  } catch (collectionError) {
    errorCount += 1;
    const errorMsg = `collection migration failed: ${collectionError.message}`;
    errors.push(errorMsg);
    logger.error("Migration collection error", { collectionName, error: collectionError.message });
  }

  return {
    collectionName,
    sourceCollections,
    totalDocs,
    migratedCount,
    writtenDocs: stats.writtenDocs,
    skippedDocs: stats.skippedDocs,
    errorCount,
    errors,
  };
}

export const migrateToFloorScoped = onCall(
  {
    region: "asia-southeast2",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["admin", "supervisor"].includes(role)) {
      throw new HttpsError("permission-denied", "Anda harus admin/supervisor untuk menjalankan migration.");
    }

    const floorId = String(request.data?.floorId || "L1")
      .trim()
      .toUpperCase();
    if (!["L1", "L2"].includes(floorId)) {
      throw new HttpsError("invalid-argument", "floorId harus L1 atau L2.");
    }

    const requestedCollections = Array.isArray(request.data?.collections) ? request.data.collections : [];
    const collectionsToMigrate = requestedCollections.length
      ? requestedCollections.filter((name) => MIGRATION_CONFIG[name])
      : Object.keys(MIGRATION_CONFIG);

    if (collectionsToMigrate.length === 0) {
      throw new HttpsError("invalid-argument", "Tidak ada koleksi valid untuk di-migrate.");
    }

    logger.info("Migration starting", {
      callerRole: role,
      floorId,
      collections: collectionsToMigrate,
    });

    // Create migration status doc for tracking
    const statusDocId = `migration_${Date.now()}`;
    const statusRef = db.collection("migration_status").doc(statusDocId);

    await statusRef.set({
      status: "in-progress",
      floorId,
      collections: collectionsToMigrate,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      initiatedBy: request.auth?.uid || "unknown",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const results = [];
    let totalDocsMigrated = 0;
    let totalErrors = 0;

    try {
      for (const collectionName of collectionsToMigrate) {
        // eslint-disable-next-line no-await-in-loop
        const result = await migrateCollection(collectionName, floorId, 500);
        results.push(result);
        totalDocsMigrated += result.migratedCount;
        totalErrors += result.errorCount;

        // Update status after each collection
        // eslint-disable-next-line no-await-in-loop
        await statusRef.update({
          [`collectionProgress.${collectionName}`]: result,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Mark migration as completed
      await statusRef.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        totalDocsMigrated,
        totalErrors,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Migration completed", { statusDocId, totalDocsMigrated, totalErrors, floorId });

      return {
        success: totalErrors === 0,
        statusDocId,
        floorId,
        collections: collectionsToMigrate,
        totalDocsMigrated,
        totalErrors,
        results,
      };
    } catch (migrationError) {
      await statusRef.update({
        status: "failed",
        error: migrationError.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.error("Migration failed", { statusDocId, error: migrationError.message });
      throw new HttpsError("internal", `Migration gagal: ${migrationError.message}`);
    }
  },
);
