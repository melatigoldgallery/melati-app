import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import { createHash } from "node:crypto";

admin.initializeApp();

const db = admin.firestore();
const WITA_OFFSET = "+08:00";
const WITA_MS = 8 * 60 * 60 * 1000;
const LOCK_TTL_MS = 10 * 60 * 1000;

function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function base64Utf8(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function verifyPasswordHash(plainPassword, storedHash) {
  if (!storedHash) return false;

  // Current standard: SHA-256 hex. Keep base64 fallback for older migrated users.
  if (sha256Hex(plainPassword) === storedHash) return true;
  if (base64Utf8(plainPassword) === storedHash) return true;
  return false;
}

function buildLegacyUid(username) {
  const safe = String(username)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 96);
  return `legacy_${safe || "user"}`;
}

function normalizeMaintenanceCollectionKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatMonthBounds(month) {
  const [yStr, mStr] = String(month || "").split("-");
  const year = Number(yStr);
  const monthNum = Number(mStr);

  if (!Number.isInteger(year) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new HttpsError("invalid-argument", "Format bulan tidak valid. Gunakan YYYY-MM.");
  }

  const first = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const next = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));
  const last = new Date(Date.UTC(year, monthNum, 0, 0, 0, 0, 0));

  const startYmd = `${year}-${pad2(monthNum)}-01`;
  const endYmd = `${year}-${pad2(monthNum)}-${pad2(last.getUTCDate())}`;

  return {
    year,
    monthNum,
    startYmd,
    endYmd,
    first,
    next,
  };
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

function buildMonthlyQueries(config, bounds) {
  const colRef = db.collection(config.collection);

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

function buildLegacySnapshotDayQueries(config, bounds) {
  const colRef = db.collection(config.collection);
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

async function resolveCallerRole(request) {
  const authData = request.auth;
  if (!authData?.uid) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const directRole = String(authData.token?.role || "")
    .trim()
    .toLowerCase();
  if (directRole) return directRole;

  const email = String(authData.token?.email || "").trim();
  if (email) {
    try {
      const snap = await db.collection("userRoles").doc(email).get();
      if (snap.exists) {
        return String(snap.data()?.role || "staf")
          .trim()
          .toLowerCase();
      }
    } catch (_) {
      // noop
    }
  }

  return "staf";
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

        let queries = buildMonthlyQueries(cfg, bounds);
        let count = await countDocsForQueries(queries);

        if (cfg.mode === "snapshot-date" && count === 0) {
          const legacyQueries = buildLegacySnapshotDayQueries(cfg, bounds);
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

    await db.collection("maintenanceLogs").add({
      action,
      month,
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

export const loginWithUsername = onCall(
  {
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async (request) => {
    const username = String(request.data?.username || "").trim();
    const password = String(request.data?.password || "");

    if (!username || !password) {
      throw new HttpsError("invalid-argument", "Username dan password wajib diisi.");
    }

    let userSnap = await db.collection("users").doc(username).get();
    if (!userSnap.exists && username !== username.toLowerCase()) {
      userSnap = await db.collection("users").doc(username.toLowerCase()).get();
    }

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "Username tidak ditemukan.");
    }

    const userData = userSnap.data() || {};
    const status = String(userData.status || "active").toLowerCase();
    if (status !== "active") {
      throw new HttpsError("failed-precondition", "Akun tidak aktif.");
    }

    if (!verifyPasswordHash(password, userData.passwordHash)) {
      throw new HttpsError("permission-denied", "Password salah.");
    }

    const usernameValue = String(userData.username || userSnap.id);
    const role = String(userData.role || "staf");
    const displayName = String(userData.displayName || usernameValue);
    const email = userData.email ? String(userData.email) : null;
    const uid = userData.uid ? String(userData.uid) : buildLegacyUid(usernameValue);

    let customToken;
    try {
      customToken = await admin.auth().createCustomToken(uid, {
        role,
        username: usernameValue,
        authMode: "legacy",
      });
    } catch (error) {
      logger.error("Failed creating custom token", {
        username: usernameValue,
        code: error?.errorInfo?.code || error?.code || "unknown",
        message: error?.message,
      });

      if (error?.errorInfo?.code === "auth/insufficient-permission") {
        throw new HttpsError(
          "failed-precondition",
          "Konfigurasi IAM untuk custom token belum lengkap. Hubungi admin sistem.",
        );
      }

      throw new HttpsError("internal", "Gagal membuat custom token.");
    }

    logger.info("Username login success", { username: usernameValue, role });

    return {
      customToken,
      username: usernameValue,
      role,
      displayName,
      email,
    };
  },
);

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toWitaParts(date = new Date()) {
  const shifted = new Date(date.getTime() + WITA_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

function formatYmd({ y, m, d }) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function formatDmy({ y, m, d }) {
  return `${pad2(d)}/${pad2(m)}/${y}`;
}

function toDateFromYmd(ymd, time = "00:00:00") {
  return new Date(`${ymd}T${time}${WITA_OFFSET}`);
}

function shiftYmd(ymd, deltaDays) {
  const base = toDateFromYmd(ymd, "00:00:00");
  const shifted = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return formatYmd(toWitaParts(shifted));
}

async function aggregateTransactionsUntil(endDate) {
  const endTs = admin.firestore.Timestamp.fromDate(endDate);
  const snap = await db.collection("stokAksesorisTransaksi").where("timestamp", "<=", endTs).get();

  const map = new Map();
  for (const docSnap of snap.docs) {
    const tx = docSnap.data();
    const kode = tx.kode;
    if (!kode) continue;

    if (!map.has(kode)) {
      map.set(kode, 0);
    }

    const jumlah = Number(tx.jumlah || 0);

    switch (tx.jenis) {
      case "tambah":
      case "stockAddition":
      case "initialStock":
        map.set(kode, map.get(kode) + jumlah);
        break;
      case "laku":
      case "free":
      case "gantiLock":
      case "return":
        map.set(kode, map.get(kode) - jumlah);
        break;
      case "adjustment":
        map.set(kode, tx.stokSesudah || map.get(kode));
        break;
      default:
        break;
    }
  }

  return map;
}

async function buildSnapshotStockData({ yesterdayYmd }) {
  const endOfYesterday = toDateFromYmd(yesterdayYmd, "23:59:59");
  const catalogSnap = await db.collection("stokAksesoris").get();
  const stockByKode = await aggregateTransactionsUntil(endOfYesterday);

  const stockData = [];
  const catalogKodes = new Set();

  for (const itemDoc of catalogSnap.docs) {
    const item = itemDoc.data();
    const kode = item.kode || itemDoc.id;
    catalogKodes.add(kode);
    const stokAkhirYesterday = Math.max(0, Number(stockByKode.get(kode) || 0));

    stockData.push({
      kode,
      nama: item.nama || "",
      kategori: item.kategori || "",
      stokAkhir: stokAkhirYesterday,
    });
  }

  // Keep legacy behavior robust for historical codes that still appear in transactions
  // but may no longer exist in the active catalog.
  for (const [kode, stok] of stockByKode.entries()) {
    if (!catalogKodes.has(kode)) {
      stockData.push({
        kode,
        nama: "",
        kategori: "",
        stokAkhir: Math.max(0, Number(stok || 0)),
      });
    }
  }

  logger.info("Snapshot stockData built", {
    yesterdayYmd,
    totalItems: stockData.length,
    txCodesCount: stockByKode.size,
  });

  return stockData;
}

async function ensureSnapshotForYesterday(triggerSource) {
  const todayYmd = formatYmd(toWitaParts(new Date()));
  const yesterdayYmd = shiftYmd(todayYmd, -1);
  const dateKey = formatDmy(toWitaParts(toDateFromYmd(yesterdayYmd, "00:00:00")));
  const snapshotId = yesterdayYmd;
  const lockId = `snapshot_lock_${snapshotId}`;

  const lockRef = db.collection("systemLocks").doc(lockId);
  const snapshotRef = db.collection("dailyStockSnapshot").doc(snapshotId);

  let hasLock = false;

  const existingByDateSnap = await db.collection("dailyStockSnapshot").where("date", "==", dateKey).limit(1).get();
  if (!existingByDateSnap.empty) {
    logger.info("Snapshot already exists by date field", { dateKey, triggerSource });
    return { success: true, created: false, reason: "exists-by-date", snapshotId };
  }

  try {
    await db.runTransaction(async (tx) => {
      const snapshotSnap = await tx.get(snapshotRef);
      if (snapshotSnap.exists) {
        throw new Error("SNAPSHOT_ALREADY_EXISTS");
      }

      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists) {
        const lockData = lockSnap.data() || {};
        const lockTsMillis =
          lockData.createdAt && typeof lockData.createdAt.toMillis === "function" ? lockData.createdAt.toMillis() : 0;
        const lockAge = Date.now() - lockTsMillis;
        if (lockAge < LOCK_TTL_MS) {
          throw new Error("LOCKED");
        }
      }

      tx.set(lockRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "processing",
        triggerSource,
        snapshotId,
      });
    });

    hasLock = true;

    const stockData = await buildSnapshotStockData({ yesterdayYmd });

    await snapshotRef.set({
      date: dateKey,
      dateYmd: yesterdayYmd,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      totalItems: stockData.length,
      stockData,
      createdBy: "cloud-function",
      version: "3.0",
      triggerSource,
    });

    logger.info("Daily snapshot created", {
      snapshotId,
      dateKey,
      triggerSource,
      totalItems: stockData.length,
    });

    return { success: true, created: true, snapshotId, dateKey };
  } catch (error) {
    if (error.message === "SNAPSHOT_ALREADY_EXISTS") {
      logger.info("Snapshot already exists", { snapshotId, triggerSource });
      return { success: true, created: false, reason: "exists", snapshotId };
    }
    if (error.message === "LOCKED") {
      logger.info("Snapshot creation locked by another process", { snapshotId, triggerSource });
      return { success: true, created: false, reason: "locked", snapshotId };
    }

    logger.error("Failed to ensure daily snapshot", {
      triggerSource,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (hasLock) {
      try {
        await lockRef.delete();
      } catch (lockDeleteError) {
        logger.warn("Failed to delete lock", {
          lockId,
          error: lockDeleteError.message,
        });
      }
    }
  }
}

export const scheduledCreateDailySnapshot = onSchedule(
  {
    schedule: "5 0 * * *",
    timeZone: "Asia/Makassar",
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async () => {
    await ensureSnapshotForYesterday("scheduler");
  },
);

// Self-healing scheduler: ensures yesterday snapshot is recreated automatically
// if it is missing (e.g., manually deleted) even when there are no transactions.
export const periodicEnsureYesterdaySnapshot = onSchedule(
  {
    schedule: "5 * * * *",
    timeZone: "Asia/Makassar",
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async () => {
    await ensureSnapshotForYesterday("periodic-scheduler");
  },
);

export const ensureYesterdaySnapshotOnFirstTx = onDocumentWritten(
  {
    document: "stokAksesorisTransaksi/{txId}",
    region: "asia-southeast2",
    memory: "256MiB",
    retry: false,
  },
  async () => {
    await ensureSnapshotForYesterday("firestore-write-fallback");
  },
);
