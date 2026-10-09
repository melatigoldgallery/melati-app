import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, admin } from "../config.js";
import { resolveCallerRole } from "../helpers/auth-helpers.js";
import { pad2, formatMonthBounds } from "../helpers/date-helpers.js";

function normalizeMaintenanceCollectionKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const MAINTENANCE_COLLECTION_CONFIG = [
  {
    key: "attendance",
    label: "attendance",
    collection: "attendance",
    mode: "date-string",
    field: "date",
    deletable: true,
    aliases: ["attendance"],
  },
  {
    key: "dailystocksnapshot",
    label: "dailyStockSnapshot",
    collection: "dailyStockSnapshot",
    mode: "snapshot-date",
    field: "dateYmd",
    legacyField: "date",
    deletable: true,
    aliases: ["dailystocksnapshot", "dailyStockSnapshot", "daily-stock-snapshot"],
  },
  {
    key: "dailystocklogs",
    label: "daily_stock_logs",
    collection: "daily_stock_logs",
    mode: "date-string",
    field: "date",
    deletable: true,
    aliases: ["dailystocklogs", "daily-stock-logs", "daily_stock_logs"],
  },
  {
    key: "dailystockreports",
    label: "daily_stock_reports",
    collection: "daily_stock_reports",
    mode: "date-string",
    field: "date",
    deletable: true,
    aliases: ["dailystockreports", "daily-stock-reports", "daily_stock_reports"],
  },
  {
    key: "leaverequests",
    label: "leaveRequests",
    collection: "leaveRequests",
    mode: "date-string",
    field: "leaveStartDate",
    deletable: true,
    aliases: ["leaverequests", "leaverequest", "leaveRequests"],
  },
  {
    key: "penjualanaksesoris",
    label: "penjualanAksesoris",
    collection: "penjualanAksesoris",
    mode: "timestamp",
    field: "timestamp",
    deletable: true,
    aliases: ["penjualanaksesoris", "penjualanAksesoris"],
  },
  {
    key: "servis",
    label: "servis",
    collection: "servis",
    mode: "date-string",
    field: "tanggal",
    deletable: true,
    aliases: ["servis"],
  },
  {
    key: "stocks",
    label: "stocks",
    collection: "stocks",
    mode: "none",
    deletable: false,
    skipReason: "Koleksi master stok aktif. Hapus periodik tidak diizinkan.",
    aliases: ["stocks"],
  },
  {
    key: "stokaksesoristransaksi",
    label: "stokAksesorisTransaksi",
    collection: "stokAksesorisTransaksi",
    mode: "timestamp-with-legacy-date",
    field: "timestamp",
    legacyField: "tanggal",
    deletable: true,
    aliases: ["stokaksesoristransaksi", "stokAksesorisTransaksi"],
  },
];

const MAINTENANCE_COLLECTION_ALIAS = new Map(
  MAINTENANCE_COLLECTION_CONFIG.flatMap((cfg) =>
    cfg.aliases.map((alias) => [normalizeMaintenanceCollectionKey(alias), cfg.key]),
  ),
);

const MAINTENANCE_COLLECTION_BY_KEY = new Map(MAINTENANCE_COLLECTION_CONFIG.map((cfg) => [cfg.key, cfg]));

function buildMonthlyQueries(config, bounds, floorId = null) {
  const colRef = floorId
    ? db.collection("floors").doc(floorId).collection(config.key === "dailystocklogs" ? "dailyStockLogs" : config.collection)
    : db.collection(config.collection);

  switch (config.mode) {
    case "date-string":
      return [colRef.where(config.field, ">=", bounds.startYmd).where(config.field, "<=", bounds.endYmd)];

    case "timestamp": {
      const startTs = admin.firestore.Timestamp.fromDate(bounds.first);
      const endExclusiveTs = admin.firestore.Timestamp.fromDate(bounds.next);
      return [colRef.where(config.field, ">=", startTs).where(config.field, "<", endExclusiveTs)];
    }

    case "snapshot-date": {
      return [colRef.where(config.field, ">=", bounds.startYmd).where(config.field, "<=", bounds.endYmd)];
    }

    case "timestamp-with-legacy-date": {
      const startTs = admin.firestore.Timestamp.fromDate(bounds.first);
      const endExclusiveTs = admin.firestore.Timestamp.fromDate(bounds.next);
      return [
        colRef.where(config.field, ">=", startTs).where(config.field, "<", endExclusiveTs),
        colRef.where(config.legacyField, ">=", bounds.startYmd).where(config.legacyField, "<=", bounds.endYmd),
      ];
    }

    default:
      return [];
  }
}

function buildLegacySnapshotDayQueries(config, bounds, floorId = null) {
  const colRef = floorId
    ? db.collection("floors").doc(floorId).collection(config.collection)
    : db.collection(config.collection);
  const dayCount = new Date(Date.UTC(bounds.year, bounds.monthNum, 0)).getUTCDate();
  const queries = [];

  for (let day = 1; day <= dayCount; day += 1) {
    const legacyDate = `${pad2(day)}/${pad2(bounds.monthNum)}/${bounds.year}`;
    queries.push(colRef.where(config.legacyField, "==", legacyDate));
  }

  return queries;
}

async function countDocsForQueries(queries) {
  let total = 0;
  for (const q of queries) {
    const snap = await q.count().get();
    total += Number(snap.data().count || 0);
  }
  return total;
}

async function collectDocRefsForQueries(queries) {
  const refsMap = new Map();
  for (const q of queries) {
    const snap = await q.get();
    snap.docs.forEach((d) => {
      refsMap.set(d.ref.path, d.ref);
    });
  }
  return Array.from(refsMap.values());
}

export const maintenanceMonthlyCleanup = onCall(
  {
    region: "asia-southeast2",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin"].includes(role)) {
      throw new HttpsError("permission-denied", "Anda tidak memiliki akses maintenance.");
    }

    const floorId = String(request.data?.floorId || "")
      .trim()
      .toUpperCase();
    if (!["L1", "L2"].includes(floorId)) {
      throw new HttpsError("invalid-argument", "floorId harus L1 atau L2.");
    }

    const action = String(request.data?.action || "dryRun");
    if (!["dryRun", "execute"].includes(action)) {
      throw new HttpsError("invalid-argument", "Action tidak valid.");
    }

    const month = String(request.data?.month || "").trim();
    const bounds = formatMonthBounds(month);
    const nowMonth = `${new Date().getUTCFullYear()}-${pad2(new Date().getUTCMonth() + 1)}`;
    if (month >= nowMonth) {
      throw new HttpsError("failed-precondition", "Maintenance hanya diizinkan untuk bulan sebelum bulan berjalan.");
    }

    const requestedRaw = Array.isArray(request.data?.collections) ? request.data.collections : [];
    const requestedKeys = requestedRaw.length
      ? requestedRaw
          .map((value) => MAINTENANCE_COLLECTION_ALIAS.get(normalizeMaintenanceCollectionKey(value)))
          .filter(Boolean)
      : MAINTENANCE_COLLECTION_CONFIG.map((cfg) => cfg.key);

    const uniqueKeys = Array.from(new Set(requestedKeys));
    if (!uniqueKeys.length) {
      throw new HttpsError("invalid-argument", "Tidak ada koleksi valid yang dipilih.");
    }

    const results = [];
    const writer = action === "execute" ? db.bulkWriter() : null;
    let totalMatched = 0;
    let totalDeleted = 0;

    try {
      for (const key of uniqueKeys) {
        const cfg = MAINTENANCE_COLLECTION_BY_KEY.get(key);
        if (!cfg) continue;

        if (!cfg.deletable) {
          results.push({
            key: cfg.key,
            label: cfg.label,
            collection: cfg.collection,
            deletable: false,
            matchedCount: 0,
            deletedCount: 0,
            status: "skipped",
            reason: cfg.skipReason || "Koleksi tidak dapat dihapus periodik.",
          });
          continue;
        }

        let queries = buildMonthlyQueries(cfg, bounds, floorId);
        let count = await countDocsForQueries(queries);

        if (cfg.mode === "snapshot-date" && count === 0) {
          const legacyQueries = buildLegacySnapshotDayQueries(cfg, bounds, floorId);
          const legacyCount = await countDocsForQueries(legacyQueries);
          if (legacyCount > 0) {
            queries = legacyQueries;
            count = legacyCount;
          }
        }
        totalMatched += count;

        if (action === "dryRun" || count === 0) {
          results.push({
            key: cfg.key,
            label: cfg.label,
            collection: cfg.collection,
            deletable: true,
            matchedCount: count,
            deletedCount: 0,
            status: count > 0 ? "ready" : "empty",
          });
          continue;
        }

        const refs = await collectDocRefsForQueries(queries);

        if (refs.length > 20000) {
          throw new HttpsError(
            "resource-exhausted",
            `Terlalu banyak dokumen di ${cfg.label} (${refs.length}). Jalankan per koleksi agar lebih aman.`,
          );
        }

        refs.forEach((ref) => {
          writer.delete(ref);
        });
        await writer.flush();

        totalDeleted += refs.length;
        results.push({
          key: cfg.key,
          label: cfg.label,
          collection: cfg.collection,
          deletable: true,
          matchedCount: count,
          deletedCount: refs.length,
          status: refs.length > 0 ? "deleted" : "empty",
        });
      }
    } finally {
      if (writer) {
        await writer.close();
      }
    }

    await db.collection("floors").doc(floorId).collection("maintenanceLogs").add({
      action,
      month,
      floorId,
      callerUid: request.auth?.uid || "",
      callerRole: role,
      requestedCollections: uniqueKeys,
      totalMatched,
      totalDeleted,
      results,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      action,
      month,
      totalMatched,
      totalDeleted,
      results,
      notes: [
        "Analisa menggunakan aggregate count untuk menekan read dibanding fetch penuh.",
        "Eksekusi hapus dilakukan server-side agar client tidak perlu membaca dokumen satu per satu.",
      ],
    };
  },
);
