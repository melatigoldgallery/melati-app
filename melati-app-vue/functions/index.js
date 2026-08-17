import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import { createHash } from "node:crypto";

admin.initializeApp();

const db = admin.firestore();
const WITA_OFFSET = "+08:00";
const WITA_MS = 8 * 60 * 60 * 1000;
const LOCK_TTL_MS = 10 * 60 * 1000;
const ENABLE_GLOBAL_SNAPSHOT_COMPAT = false;
const SNAPSHOT_FLOORS = ["L1", "L2"];

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

function buildFloorUserDocId(floorId, username) {
  const safeFloor =
    String(floorId || "")
      .trim()
      .toUpperCase() === "L2"
      ? "L2"
      : "L1";
  const safeUsername = String(username || "")
    .trim()
    .toLowerCase();
  return `${safeFloor}__${safeUsername}`;
}

function normalizeUserRole(role, fallback = "staff") {
  const raw = String(role || "")
    .trim()
    .toLowerCase();
  const normalizedFallback =
    fallback === null || fallback === undefined ? "staff" : String(fallback).trim().toLowerCase();

  if (!raw) return normalizedFallback;
  if (raw === "staf") return "staff";
  if (raw === "hr") return "hrd";
  return raw;
}

function isRoleAllowedForFloor(role, floorId) {
  const normalizedRole = normalizeUserRole(role, "staff");
  if (
    String(floorId || "")
      .trim()
      .toUpperCase() === "L2"
  ) {
    if (["staff", "hrd"].includes(normalizedRole)) return false;
    return true;
  }
  return true;
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

async function resolveCallerRole(request) {
  const authData = request.auth;
  if (!authData?.uid) {
    throw new HttpsError("unauthenticated", "Anda harus login.");
  }

  const directRole = normalizeUserRole(authData.token?.role, "");
  if (directRole) return directRole;

  const email = String(authData.token?.email || "").trim();
  if (email) {
    try {
      const snap = await db.collection("userRoles").doc(email).get();
      if (snap.exists) {
        return normalizeUserRole(snap.data()?.role, "staff");
      }
    } catch (_) {
      // noop
    }
  }

  return "staff";
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

export const loginWithUsername = onCall(
  {
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async (request) => {
    const username = String(request.data?.username || "").trim();
    const password = String(request.data?.password || "");
    const floorIdRaw = String(request.data?.floorId || "")
      .trim()
      .toUpperCase();
    const floorId = ["L1", "L2"].includes(floorIdRaw) ? floorIdRaw : "L1";

    if (!username || !password) {
      throw new HttpsError("invalid-argument", "Username dan password wajib diisi.");
    }

    const usernameLower = username.toLowerCase();
    const candidateDocIds = [buildFloorUserDocId(floorId, username), `${floorId}_${usernameLower}`, username];
    if (username !== usernameLower) {
      candidateDocIds.push(`${floorId}_${username}`);
      candidateDocIds.push(usernameLower);
    }
    const usernameCandidates = [...new Set([username, usernameLower])];

    const floorUsersRef = db.collection("floors").doc(floorId).collection("users");

    let userSnap = null;
    let userSource = "floor";
    for (const userDocId of [...new Set(candidateDocIds)]) {
      // eslint-disable-next-line no-await-in-loop
      const candidate = await floorUsersRef.doc(userDocId).get();
      if (candidate.exists) {
        userSnap = candidate;
        break;
      }
    }

    if (!userSnap?.exists) {
      for (const candidateUsername of usernameCandidates) {
        // eslint-disable-next-line no-await-in-loop
        const querySnap = await floorUsersRef.where("username", "==", candidateUsername).limit(1).get();
        if (!querySnap.empty) {
          userSnap = querySnap.docs[0];
          break;
        }
      }
    }

    if (!userSnap?.exists) {
      const querySnap = await floorUsersRef.where("usernameLower", "==", usernameLower).limit(1).get();
      if (!querySnap.empty) {
        userSnap = querySnap.docs[0];
      }
    }

    // Backward-compat for legacy users collection (pre-floor deployment).
    // Kept for L1 so akun lama tetap bisa login tanpa mengganggu isolasi L2.
    if (!userSnap?.exists && floorId === "L1") {
      const legacyUsersRef = db.collection("users");

      for (const userDocId of [...new Set(candidateDocIds)]) {
        // eslint-disable-next-line no-await-in-loop
        const candidate = await legacyUsersRef.doc(userDocId).get();
        if (candidate.exists) {
          userSnap = candidate;
          userSource = "legacy-global";
          break;
        }
      }

      if (!userSnap?.exists) {
        for (const candidateUsername of usernameCandidates) {
          // eslint-disable-next-line no-await-in-loop
          const queryByUsername = await legacyUsersRef.where("username", "==", candidateUsername).limit(1).get();
          if (!queryByUsername.empty) {
            userSnap = queryByUsername.docs[0];
            userSource = "legacy-global";
            break;
          }
        }
      }

      if (!userSnap?.exists) {
        const queryByUsernameLower = await legacyUsersRef.where("usernameLower", "==", usernameLower).limit(1).get();
        if (!queryByUsernameLower.empty) {
          userSnap = queryByUsernameLower.docs[0];
          userSource = "legacy-global";
        }
      }
    }

    if (!userSnap?.exists) {
      throw new HttpsError("not-found", "Username tidak ditemukan.");
    }

    const userData = userSnap.data() || {};
    const userFloorIdRaw = String(userData.floorId || "")
      .trim()
      .toUpperCase();
    const userFloorId = ["L1", "L2"].includes(userFloorIdRaw)
      ? userFloorIdRaw
      : userSource === "legacy-global"
        ? "L1"
        : floorId;

    if (userFloorId !== floorId) {
      throw new HttpsError("permission-denied", "Akun tidak terdaftar untuk lantai yang dipilih.");
    }

    const status = String(userData.status || "active").toLowerCase();
    if (status !== "active") {
      throw new HttpsError("failed-precondition", "Akun tidak aktif.");
    }

    if (!verifyPasswordHash(password, userData.passwordHash)) {
      throw new HttpsError("permission-denied", "Password salah.");
    }

    const usernameValue = String(userData.username || userSnap.id);
    const role = normalizeUserRole(userData.role, "staff");
    if (!isRoleAllowedForFloor(role, floorId)) {
      throw new HttpsError("failed-precondition", `Role ${role} tidak diizinkan untuk ${floorId}.`);
    }
    const displayName = String(userData.displayName || usernameValue);
    const email = userData.email ? String(userData.email) : null;
    const uid = userData.uid ? String(userData.uid) : buildLegacyUid(usernameValue);

    let customToken;
    try {
      const floorRoles = { [floorId]: role };
      customToken = await admin.auth().createCustomToken(uid, {
        role,
        username: usernameValue,
        floorId,
        allowedFloors: [floorId],
        floorRoles,
        authMode: "legacy",
      });
    } catch (error) {
      logger.error("Failed creating custom token", {
        username: usernameValue,
        floorId,
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

    logger.info("Username login success", { username: usernameValue, role, floorId });

    return {
      customToken,
      username: usernameValue,
      role,
      floorId,
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

// Removed unused aggregateTransactionsUntil function

function resolveSnapshotScope(scope = "global", floorId = "") {
  const normalizedScope =
    String(scope || "global")
      .trim()
      .toLowerCase() === "floor"
      ? "floor"
      : "global";
  const normalizedFloor = String(floorId || "")
    .trim()
    .toUpperCase();

  if (normalizedScope === "floor") {
    if (!["L1", "L2"].includes(normalizedFloor)) {
      throw new Error("INVALID_FLOOR_SCOPE");
    }

    const floorDoc = db.collection("floors").doc(normalizedFloor);
    return {
      scope: "floor",
      floorId: normalizedFloor,
      scopeKey: `floor_${normalizedFloor}`,
      catalogRef: floorDoc.collection("stokAksesoris"),
      txRef: floorDoc.collection("stokAksesorisTransaksi"),
      snapshotRef: floorDoc.collection("dailyStockSnapshot"),
      dailyReportsRef: floorDoc.collection("daily_stock_reports"),
      lockRef: floorDoc.collection("systemLocks"),
    };
  }

  return {
    scope: "global",
    floorId: null,
    scopeKey: "global",
    catalogRef: db.collection("stokAksesoris"),
    txRef: db.collection("stokAksesorisTransaksi"),
    snapshotRef: db.collection("dailyStockSnapshot"),
    dailyReportsRef: db.collection("daily_stock_reports"),
    lockRef: db.collection("systemLocks"),
  };
}

function getSnapshotScopes() {
  const scopes = SNAPSHOT_FLOORS.map((floorId) => ({ scope: "floor", floorId }));
  if (ENABLE_GLOBAL_SNAPSHOT_COMPAT) scopes.unshift({ scope: "global", floorId: "" });
  return scopes;
}

async function aggregateTransactionsUntilByScope(endDate, scopeConfig) {
  const endTs = admin.firestore.Timestamp.fromDate(endDate);
  const snap = await scopeConfig.txRef.where("timestamp", "<=", endTs).get();

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

async function buildSnapshotStockDataByScope({ yesterdayYmd, scopeConfig }) {
  const endOfYesterday = toDateFromYmd(yesterdayYmd, "23:59:59");
  const catalogSnap = await scopeConfig.catalogRef.get();
  const stockByKode = await aggregateTransactionsUntilByScope(endOfYesterday, scopeConfig);

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
    scopeKey: scopeConfig.scopeKey,
    yesterdayYmd,
    totalItems: stockData.length,
    txCodesCount: stockByKode.size,
  });

  return stockData;
}

function computeDailyStockReportsFromStockData(stockData = [], snapshotDateYmd = "") {
  const mainCategories = [
    "KALUNG",
    "LIONTIN",
    "ANTING",
    "CINCIN",
    "HALA & SDW",
    "GELANG",
    "GIWANG",
    "KENDARI & EMAS BALI",
    "BERLIAN",
  ];

  const items = {};
  const breakdown = {};

  for (const cat of mainCategories) {
    items[cat] = { total: 0, komputer: 0, status: "Belum ada data" };
    breakdown[cat] = {};
  }

  for (const item of stockData) {
    const cat = String(item?.kategori || "")
      .trim()
      .toUpperCase();
    if (!cat || !items[cat]) continue;
    items[cat].total += Math.max(0, Number(item?.stokAkhir || 0));
  }

  for (const cat of mainCategories) {
    items[cat].status = items[cat].total === 0 ? "Belum ada data" : "Klop";
  }

  return {
    date: snapshotDateYmd,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    items,
    breakdown,
    createdBy: "cloud-function",
    version: "1.0",
  };
}

async function generateGoldDailyReport(floorId, dateYmd) {
  const dbFloorRef = db.collection("floors").doc(floorId);
  const stocksSnap = await dbFloorRef.collection("stocks").get();

  const stockData = {};
  stocksSnap.forEach((doc) => {
    stockData[doc.id] = doc.data() || {};
  });

  const settingsSnap = await dbFloorRef.collection("settings").doc("inventoryManajemen").get();
  const settings = settingsSnap.exists ? settingsSnap.data() : null;

  const mainCategories = settings && Array.isArray(settings.cards)
    ? settings.cards.filter((c) => c.enabled).map((c) => c.id)
    : [
        "KALUNG",
        "LIONTIN",
        "ANTING",
        "CINCIN",
        "HALA & SDW",
        "GELANG",
        "GIWANG",
        "KENDARI & EMAS BALI",
        "BERLIAN",
      ];

  const subCategories = settings && Array.isArray(settings.tableRows)
    ? settings.tableRows.filter((r) => r.enabled).map((r) => r.key)
    : [
        "brankas",
        "posting",
        "barang-display",
        "barang-rusak",
        "batu-lepas",
        "manual",
        "admin",
        "DP",
        "lainnya",
      ];

  const subLabelMap = {};
  if (settings && Array.isArray(settings.tableRows)) {
    settings.tableRows.forEach((r) => {
      subLabelMap[r.key] = r.label;
    });
  } else {
    const defaultLabels = {
      brankas: "Stok Brankas",
      posting: "Belum Posting",
      "barang-display": "Display",
      "barang-rusak": "Rusak",
      "batu-lepas": "Batu Lepas",
      manual: "Manual",
      admin: "Admin",
      DP: "DP",
      lainnya: "Lainnya",
    };
    Object.assign(subLabelMap, defaultLabels);
  }

  const getCardDetailMode = (id) => {
    const card = settings?.cards?.find((c) => c.id === id);
    if (card) {
      const mode = String(card.detailMode || "").trim().toLowerCase();
      if (mode === "color" || mode === "hala" || mode === "default") return mode;
      if (card.type === "color") return "color";
      if (card.type === "hala") return "hala";
      return "default";
    }
    // Fallback
    if (["KALUNG", "LIONTIN"].includes(id)) return "color";
    if (["HALA & SDW", "KENDARI & EMAS BALI"].includes(id)) return "hala";
    return "default";
  };

  const items = {};
  const breakdown = {};

  mainCategories.forEach((mainCat) => {
    const detailMode = getCardDetailMode(mainCat);
    const useDetails = detailMode === "color" || detailMode === "hala";

    let fisik = 0;
    breakdown[mainCat] = {};

    subCategories.forEach((subKey) => {
      const item = stockData[subKey]?.[mainCat] || {};
      const qty = parseInt(item.quantity, 10) || 0;
      const details = item.details || null;

      let subTotal = 0;
      if (useDetails && details && Object.keys(details).length > 0) {
        subTotal = Object.values(details).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
      } else {
        subTotal = qty;
      }

      fisik += subTotal;
      breakdown[mainCat][subLabelMap[subKey] || subKey] = {
        quantity: qty,
        details: details,
      };
    });

    const komputer = parseInt(stockData["stok-komputer"]?.[mainCat]?.quantity, 10) || 0;

    let status = "Klop";
    if (fisik < komputer) status = `Kurang ${komputer - fisik}`;
    else if (fisik > komputer) status = `Lebih ${fisik - komputer}`;

    items[mainCat] = { total: fisik, komputer, status };
  });

  const dateParts = dateYmd.split("-");
  const dateKey = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // DD/MM/YYYY

  return {
    date: dateYmd,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    items,
    breakdown,
    createdBy: "cloud-function-scheduler",
    version: "2.0",
    snapshotDateKey: dateKey,
  };
}

async function ensureSnapshotByDateYmdForScope({
  triggerSource = "manual-callable",
  scope = "global",
  floorId = "",
  dateYmd = "",
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) {
    throw new Error("INVALID_DATE_YMD");
  }

  const scopeConfig = resolveSnapshotScope(scope, floorId);
  const dateKey = formatDmy(toWitaParts(toDateFromYmd(dateYmd, "00:00:00")));
  const snapshotId = dateYmd;
  const lockId = `snapshot_lock_${scopeConfig.scopeKey}_${snapshotId}`;

  const lockRef = scopeConfig.lockRef.doc(lockId);
  const snapshotRef = scopeConfig.snapshotRef.doc(snapshotId);
  let hasLock = false;

  const existingByDateSnap = await scopeConfig.snapshotRef.where("date", "==", dateKey).limit(1).get();
  if (!existingByDateSnap.empty) {
    logger.info("Snapshot already exists by date field", {
      scopeKey: scopeConfig.scopeKey,
      floorId: scopeConfig.floorId,
      dateKey,
      triggerSource,
    });
    return { success: true, created: false, reason: "exists-by-date", snapshotId, dateKey, dateYmd };
  }

  try {
    await db.runTransaction(async (tx) => {
      const snapshotSnap = await tx.get(snapshotRef);
      if (snapshotSnap.exists) throw new Error("SNAPSHOT_ALREADY_EXISTS");

      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists) {
        const lockData = lockSnap.data() || {};
        const lockTsMillis =
          lockData.createdAt && typeof lockData.createdAt.toMillis === "function" ? lockData.createdAt.toMillis() : 0;
        const lockAge = Date.now() - lockTsMillis;
        if (lockAge < LOCK_TTL_MS) throw new Error("LOCKED");
      }

      tx.set(lockRef, {
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "processing",
        triggerSource,
        snapshotId,
        scopeKey: scopeConfig.scopeKey,
        floorId: scopeConfig.floorId,
      });
    });

    hasLock = true;

    const stockData = await buildSnapshotStockDataByScope({ yesterdayYmd: dateYmd, scopeConfig });

    await snapshotRef.set({
      date: dateKey,
      dateYmd,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      totalItems: stockData.length,
      stockData,
      createdBy: "cloud-function",
      version: "3.0",
      triggerSource,
      scopeKey: scopeConfig.scopeKey,
      floorId: scopeConfig.floorId,
    });

    const dailyReportsRef = scopeConfig.dailyReportsRef.doc(dateYmd);
    const dailyReportSnap = await dailyReportsRef.get();
    if (!dailyReportSnap.exists) {
      if (scope === "floor") {
        const reportData = await generateGoldDailyReport(floorId, dateYmd);
        await dailyReportsRef.set(reportData);
      } else {
        await dailyReportsRef.set({
          ...computeDailyStockReportsFromStockData(stockData, dateYmd),
          snapshotDateKey: dateKey,
          source: "snapshot-bridge",
          triggerSource,
          scopeKey: scopeConfig.scopeKey,
          floorId: scopeConfig.floorId,
        });
      }
    }

    logger.info("Daily snapshot created", {
      scopeKey: scopeConfig.scopeKey,
      floorId: scopeConfig.floorId,
      snapshotId,
      dateKey,
      triggerSource,
      totalItems: stockData.length,
    });

    return { success: true, created: true, snapshotId, dateKey, dateYmd };
  } catch (error) {
    if (error.message === "SNAPSHOT_ALREADY_EXISTS") {
      logger.info("Snapshot already exists", {
        scopeKey: scopeConfig.scopeKey,
        floorId: scopeConfig.floorId,
        snapshotId,
        triggerSource,
      });
      return { success: true, created: false, reason: "exists", snapshotId, dateKey, dateYmd };
    }
    if (error.message === "LOCKED") {
      logger.info("Snapshot creation locked by another process", {
        scopeKey: scopeConfig.scopeKey,
        floorId: scopeConfig.floorId,
        snapshotId,
        triggerSource,
      });
      return { success: true, created: false, reason: "locked", snapshotId, dateKey, dateYmd };
    }

    logger.error("Failed to ensure daily snapshot", {
      scopeKey: scopeConfig.scopeKey,
      floorId: scopeConfig.floorId,
      triggerSource,
      dateYmd,
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

async function ensureSnapshotForYesterdayByScope(triggerSource, scope = "global", floorId = "") {
  const todayYmd = formatYmd(toWitaParts(new Date()));
  const yesterdayYmd = shiftYmd(todayYmd, -1);
  return ensureSnapshotByDateYmdForScope({
    triggerSource,
    scope,
    floorId,
    dateYmd: yesterdayYmd,
  });
}

async function ensureSnapshotsForAllScopes(triggerSource, targetDate = "yesterday") {
  const scopes = getSnapshotScopes();
  const results = [];

  for (const scopeItem of scopes) {
    try {
      let result;
      if (targetDate === "today") {
        const todayYmd = formatYmd(toWitaParts(new Date()));
        result = await ensureSnapshotByDateYmdForScope({
          triggerSource,
          scope: scopeItem.scope,
          floorId: scopeItem.floorId,
          dateYmd: todayYmd,
        });
      } else {
        // eslint-disable-next-line no-await-in-loop
        result = await ensureSnapshotForYesterdayByScope(triggerSource, scopeItem.scope, scopeItem.floorId);
      }
      results.push({ ...scopeItem, result });
    } catch (error) {
      logger.error("Failed snapshot for scope", {
        scope: scopeItem.scope,
        floorId: scopeItem.floorId || null,
        triggerSource,
        error: error.message,
      });
      results.push({ ...scopeItem, error: error.message });
    }
  }

  return results;
}

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

// periodicEnsureYesterdaySnapshot scheduler removed to optimize Firestore resource usage.

// Deactivated global snapshot trigger since system is fully floor-based
// export const ensureYesterdaySnapshotOnFirstTxGlobal = onDocumentWritten(
//   {
//     document: "stokAksesorisTransaksi/{txId}",
//     region: "asia-southeast2",
//     memory: "256MiB",
//     retry: false,
//   },
//   async () => {
//     await ensureSnapshotForYesterdayByScope("firestore-write-fallback-global", "global", "");
//   },
// );

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

// ============================================================================
// BARCODE TRACKING FUNCTIONS
// ============================================================================

const PREFIX_TO_CATEGORY = {
  C: "CINCIN",
  K: "KALUNG",
  L: "LIONTIN",
  A: "ANTING",
  G: "GELANG",
  S: "GIWANG",
  Z: "HALA & SDW",
  V: "HALA & SDW",
  B: "BERLIAN",
};

function parseBarcodeCategoryAndType(code) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const prefix2 = cleanCode.slice(0, 2);
  const prefix = cleanCode.charAt(0);
  
  let mainCat = "CINCIN";
  if (prefix2 === "HL") {
    mainCat = "HALA & SDW";
  } else if (prefix2 === "KL") {
    mainCat = "KENDARI & EMAS BALI";
  } else if (prefix2 === "BL") {
    mainCat = "BERLIAN";
  } else {
    mainCat = PREFIX_TO_CATEGORY[prefix] || "CINCIN";
  }
  
  let subType = null;
  
  // Generic dynamic subtype parser based on code structure (e.g. TE-CA-01 -> CA)
  if (cleanCode.includes("-")) {
    const parts = cleanCode.split("-");
    if (parts.length >= 3) {
      subType = parts[parts.length - 2];
    }
  }

  // Fallback to legacy checks if subtype is not resolved dynamically
  if (!subType) {
    if (mainCat === "KALUNG" || mainCat === "LIONTIN") {
      const lower = cleanCode.toLowerCase();
      if (lower.includes("hijau")) subType = "HIJAU";
      else if (lower.includes("biru")) subType = "BIRU";
      else if (lower.includes("pink")) subType = "PINK";
      else if (lower.includes("kuning")) subType = "KUNING";
      else subType = "PUTIH";
    } else if (mainCat === "HALA & SDW" || mainCat === "KENDARI & EMAS BALI" || mainCat === "BERLIAN") {
      const lower = cleanCode.toLowerCase();
      if (lower.includes("-ka-") || lower.includes("ka")) subType = "KA";
      else if (lower.includes("-la-") || lower.includes("la")) subType = "LA";
      else if (lower.includes("-an-") || lower.includes("an")) subType = "AN";
      else if (lower.includes("-ca-") || lower.includes("ca")) subType = "CA";
      else if (lower.includes("-sa-") || lower.includes("sa")) subType = "SA";
      else if (lower.includes("-ga-") || lower.includes("ga")) subType = "GA";
      else subType = "KA";
    }
  }
  
  return { mainCat, subType };
}

async function executeMutationLogic(t, dbFloorRef, barcodes, destination, petugas, notes, origin = "any", defaultDetailType = "", defaultCategory = "", allowCategoryOverride = false, bypassLockCheck = false) {
  const barcodeIds = barcodes.map(b => (typeof b === 'string' ? b : b.barcode).trim().toUpperCase());
  const barcodeRefs = barcodeIds.map(id => dbFloorRef.collection("barcodes").doc(id));
  
  // Step 1: Read all barcode documents inside the transaction
  const barcodeSnaps = await Promise.all(barcodeRefs.map(ref => t.get(ref)));

  const barcodeDetails = [];
  const targetLocations = new Set([destination]);

  // 1. Validation and origin resolution phase
  barcodeSnaps.forEach((snap, idx) => {
    const id = barcodeIds[idx];
    let category, detailType, resolvedOrigin, exists;
    const originalItem = barcodes[idx];
    const inputDetailType = typeof originalItem === 'object' ? originalItem.detailType : null;
    const inputCategory = typeof originalItem === 'object' ? originalItem.category : null;
    
    let oldCategory = null;
    let oldDetailType = null;
    
    const parsed = parseBarcodeCategoryAndType(id);
    
    if (snap.exists) {
      exists = true;
      const data = snap.data();
      oldCategory = data.category;
      oldDetailType = data.detailType;
      resolvedOrigin = data.location || destination;
      
      category = allowCategoryOverride ? (inputCategory || defaultCategory || data.category) : (data.category || defaultCategory || parsed.mainCat);
      detailType = allowCategoryOverride ? (inputDetailType || defaultDetailType || data.detailType) : (data.detailType || defaultDetailType || parsed.subType);
      
      if (data.in_mutasi && !bypassLockCheck) {
        throw new HttpsError("failed-precondition", `Barcode ${id} terkunci (sudah laku/mutasi).`);
      }
    } else {
      exists = false;
      category = inputCategory || defaultCategory || parsed.mainCat;
      detailType = inputDetailType || defaultDetailType || parsed.subType;
      resolvedOrigin = destination; // Base registration
      oldCategory = category;
      oldDetailType = detailType;
    }
    
    targetLocations.add(resolvedOrigin);
    barcodeDetails.push({ 
      id, 
      category, 
      detailType, 
      resolvedOrigin, 
      exists,
      oldCategory,
      oldDetailType
    });
  });

  // Step 2: Read all required stocks documents inside the transaction
  const stockLocationList = Array.from(targetLocations);
  const stockRefs = stockLocationList.map(loc => dbFloorRef.collection("stocks").doc(loc));
  const stockSnaps = await Promise.all(stockRefs.map(ref => t.get(ref)));

  const stockDataMap = {};
  stockLocationList.forEach((loc, idx) => {
    stockDataMap[loc] = stockSnaps[idx].exists ? stockSnaps[idx].data() : {};
  });

  // Step 2b: Read all clipCodes inside the transaction to check for auto-cleanup
  const clipDocsToUpdate = [];
  const isPostingDest = ["posting", "belum-posting", "belum_posting"].includes(destination);
  if (!isPostingDest) {
    const clipCodesRef = dbFloorRef.collection("clipCodes");
    const clipCodesSnap = await t.get(clipCodesRef);
    clipCodesSnap.forEach((clipSnap) => {
      const clipData = clipSnap.data();
      const clipBarcodes = clipData.barcodes || [];
      const hasMovedBarcodes = clipBarcodes.some(bc => barcodeIds.includes(bc));
      
      if (hasMovedBarcodes) {
        const cleanBarcodes = clipBarcodes.filter(bc => !barcodeIds.includes(bc));
        clipDocsToUpdate.push({
          ref: clipSnap.ref,
          barcodes: cleanBarcodes
        });
      }
    });
  }

  // Step 3: Accumulate stock changes
  const changes = {};
  const addChange = (loc, cat, type, diff) => {
    if (!changes[loc]) changes[loc] = {};
    if (!changes[loc][cat]) changes[loc][cat] = { quantity: 0, details: {} };
    changes[loc][cat].quantity += diff;
    if (type) {
      if (!changes[loc][cat].details[type]) changes[loc][cat].details[type] = 0;
      changes[loc][cat].details[type] += diff;
    }
  };

  barcodeDetails.forEach((info) => {
    if (info.resolvedOrigin !== destination || info.oldCategory !== info.category || info.oldDetailType !== info.detailType) {
      addChange(info.resolvedOrigin, info.oldCategory, info.oldDetailType, -1);
      addChange(destination, info.category, info.detailType, 1);
    } else if (!info.exists) {
      addChange(destination, info.category, info.detailType, 1);
    }
  });

  // Step 4: Perform all database writes
  // Update barcode documents
  barcodeDetails.forEach((info) => {
    const ref = dbFloorRef.collection("barcodes").doc(info.id);
    const updateData = {
      barcode: info.id,
      category: info.category,
      detailType: info.detailType || null,
      location: destination,
      in_display: destination === "barang-display",
      in_mutasi: ["mutasi", "laku"].includes(destination),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    if (!info.exists) {
      updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }
    t.set(ref, updateData, { merge: true });

    // Ensure we delete it from history since it is now active again
    const historyRef = dbFloorRef.collection("barcodesHistory").doc(info.id);
    t.delete(historyRef);
  });

  // Update clip codes (auto-cleanup moved barcodes)
  clipDocsToUpdate.forEach((item) => {
    t.update(item.ref, {
      barcodes: item.barcodes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // Write single history log document for the transaction
  const logRef = dbFloorRef.collection("barcodeMutationLogs").doc();
  const logData = {
    id: logRef.id,
    barcodeIds: barcodeDetails.map(info => info.id),
    barcodes: barcodeDetails.map(info => ({
      barcode: info.id,
      category: info.category,
      detailType: info.detailType || null,
      origin: info.exists ? info.resolvedOrigin : "sistem_baru",
    })),
    destination,
    pemindah: petugas,
    status: "approved",
    notes: notes || "",
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  // For compatibility with single barcode logs
  if (barcodeDetails.length === 1) {
    logData.barcode = barcodeDetails[0].id;
    logData.category = barcodeDetails[0].category;
    logData.detailType = barcodeDetails[0].detailType || null;
    logData.origin = barcodeDetails[0].exists ? barcodeDetails[0].resolvedOrigin : "sistem_baru";
  } else {
    logData.barcode = `GABUNGAN (${barcodeDetails.length} BARANG)`;
    logData.category = barcodeDetails[0].category; // Transactions are always per-category

    const uniqueTypes = [...new Set(barcodeDetails.map(info => info.detailType).filter(Boolean))];
    logData.detailType = uniqueTypes.length === 1 ? uniqueTypes[0] : null;

    const uniqueOrigins = [...new Set(barcodeDetails.map(info => info.exists ? info.resolvedOrigin : "sistem_baru"))];
    logData.origin = uniqueOrigins.length === 1 ? uniqueOrigins[0] : "MIXED";
  }

  t.set(logRef, logData);

  // Apply aggregated stock changes
  for (const loc of Object.keys(changes)) {
    const data = stockDataMap[loc] || {};
    const locChanges = changes[loc];
    const updatedData = { ...data };
    
    for (const cat of Object.keys(locChanges)) {
      const existing = data[cat] || { quantity: 0, lastUpdated: null, history: [] };
      const currentQty = parseInt(existing.quantity, 10) || 0;
      const diffQty = locChanges[cat].quantity;
      const newQty = Math.max(0, currentQty + diffQty);
      
      const updatedCategory = {
        quantity: newQty,
        lastUpdated: new Date().toISOString(),
        history: Array.isArray(existing.history) ? [...existing.history] : []
      };
      
      if (diffQty !== 0) {
        const relevantBarcodes = barcodeDetails
          .filter(info => 
            (info.category === cat || info.oldCategory === cat) && 
            (info.resolvedOrigin === loc || destination === loc)
          );

        const truncatedBarcodes = relevantBarcodes.slice(0, 10).map(info => ({
          barcode: info.id,
          detailType: info.detailType || info.oldDetailType || ""
        }));

        const historyOrigin = diffQty < 0 ? loc : (relevantBarcodes[0]?.exists ? relevantBarcodes[0].resolvedOrigin : "sistem_baru");
        const historyDest = destination;

        updatedCategory.history.unshift({
          date: new Date().toISOString(),
          action: diffQty > 0 ? "Tambah" : "Kurangi",
          quantity: Math.abs(diffQty),
          oldQuantity: currentQty,
          newQuantity: newQty,
          petugas,
          keterangan: notes || "Mutasi Barcode",
          barcodes: truncatedBarcodes,
          totalBarcodesCount: relevantBarcodes.length,
          origin: historyOrigin,
          destination: historyDest
        });
        if (updatedCategory.history.length > 25) {
          updatedCategory.history = updatedCategory.history.slice(0, 25);
        }
      }
      
      const existingDetails = existing.details || {};
      const updatedDetails = { ...existingDetails };
      const catDetailsChanges = locChanges[cat].details;
      
      for (const type of Object.keys(catDetailsChanges)) {
        const currentTypeQty = parseInt(existingDetails[type], 10) || 0;
        const diffTypeQty = catDetailsChanges[type];
        updatedDetails[type] = Math.max(0, currentTypeQty + diffTypeQty);
      }
      
      if (Object.keys(updatedDetails).length > 0) {
        updatedCategory.details = updatedDetails;
      }
      
      updatedData[cat] = updatedCategory;
    }
    
    const stockRef = dbFloorRef.collection("stocks").doc(loc);
    t.set(stockRef, updatedData, { merge: true });
  }

  // Write dailyStockLogs
  const dateStr = formatYmd(toWitaParts(new Date()));
  const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
  const dailyLogs = [];
  
  for (const loc of Object.keys(changes)) {
    const locChanges = changes[loc];
    const data = stockDataMap[loc] || {};
    for (const cat of Object.keys(locChanges)) {
      const diffQty = locChanges[cat].quantity;
      if (diffQty !== 0) {
        const existing = data[cat] || { quantity: 0 };
        const beforeQty = parseInt(existing.quantity, 10) || 0;
        const afterQty = Math.max(0, beforeQty + diffQty);
        
        dailyLogs.push({
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: loc,
          action: diffQty > 0 ? "tambah" : "kurangi",
          before: beforeQty,
          after: afterQty,
          quantity: Math.abs(diffQty),
          userName: petugas,
          keterangan: notes || "Mutasi Barcode"
        });
      }
    }
  }

  if (dailyLogs.length > 0) {
    t.set(dailyLogRef, {
      date: dateStr,
      logs: admin.firestore.FieldValue.arrayUnion(...dailyLogs)
    }, { merge: true });
  }
}

export const checkBarcodesStatus = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!role) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { barcodes = [], floorId = "L1" } = request.data || {};
    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      throw new HttpsError("invalid-argument", "Daftar barcode kosong.");
    }

    if (barcodes.length > 500) {
      throw new HttpsError("invalid-argument", "Maksimal 500 barcode dalam satu request.");
    }

    const uniqueBarcodes = [...new Set(barcodes)];
    const barcodeRefs = uniqueBarcodes.map((bc) => 
      db.collection("floors").doc(floorId).collection("barcodes").doc(bc)
    );

    const snaps = await db.getAll(...barcodeRefs);

    // Identify barcodes not found in the active list
    const missingIndices = [];
    snaps.forEach((snap, idx) => {
      if (!snap.exists) {
        missingIndices.push(idx);
      }
    });

    let historySnaps = [];
    if (missingIndices.length > 0) {
      const historyRefs = missingIndices.map(idx => 
        db.collection("floors").doc(floorId).collection("barcodesHistory").doc(uniqueBarcodes[idx])
      );
      historySnaps = await db.getAll(...historyRefs);
    }

    let historySnapIdx = 0;
    const results = snaps.map((snap, i) => {
      const barcode = uniqueBarcodes[i];
      if (!snap.exists) {
        const histSnap = historySnaps[historySnapIdx++];
        if (histSnap && histSnap.exists) {
          const data = histSnap.data();
          return {
            barcode,
            exists: true,
            isArchived: true,
            location: data.location || "",
            in_display: !!data.in_display,
            in_mutasi: !!data.in_mutasi,
            category: data.category || "",
            detailType: data.detailType || ""
          };
        }
        return { barcode, exists: false, status: "new" };
      }
      const data = snap.data();
      return { 
        barcode, 
        exists: true, 
        isArchived: false,
        location: data.location || "",
        in_display: !!data.in_display,
        in_mutasi: !!data.in_mutasi,
        category: data.category || "",
        detailType: data.detailType || ""
      };
    });

    return { results };
  }
);

export const executeBarcodeMutation = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin", "input"].includes(role)) {
      throw new HttpsError("permission-denied", "Akses ditolak. Membutuhkan izin supervisor atau input.");
    }

    const { 
      floorId = "L1", 
      barcodes = [], 
      origin,
      destination, 
      pemindah, 
      notes = "",
      defaultDetailType = "",
      category = "",
      allowCategoryOverride = false
    } = request.data || {};

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      throw new HttpsError("invalid-argument", "Daftar barcode kosong.");
    }
    if (!destination || !pemindah) {
      throw new HttpsError("invalid-argument", "Lokasi tujuan dan petugas wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);

    await db.runTransaction(async (t) => {
      await executeMutationLogic(t, dbFloorRef, barcodes, destination, pemindah, notes, origin || "any", defaultDetailType, category, allowCategoryOverride);
    });

    return { success: true };
  }
);

export const submitBarcodeMoveRequest = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!role) throw new HttpsError("unauthenticated", "Akses ditolak.");

    const { 
      floorId = "L1", 
      barcodes = [], 
      origin = "any",
      destination, 
      pemindah, 
      notes = "",
      defaultDetailType = "",
      category = "",
      allowCategoryOverride = false
    } = request.data || {};

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      throw new HttpsError("invalid-argument", "Daftar barcode kosong.");
    }
    if (!destination || !pemindah) {
      throw new HttpsError("invalid-argument", "Lokasi tujuan dan petugas wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    
    const uniqueBarcodes = [...new Set(barcodes.map(b => (typeof b === 'string' ? b : b.barcode || '').trim().toUpperCase()))].filter(Boolean);
    const barcodeRefs = uniqueBarcodes.map(bc => dbFloorRef.collection("barcodes").doc(bc));

    const snaps = await db.getAll(...barcodeRefs);

    const missingIndices = [];
    snaps.forEach((snap, idx) => {
      if (!snap.exists) {
        missingIndices.push(idx);
      }
    });

    let historySnaps = [];
    if (missingIndices.length > 0) {
      const historyRefs = missingIndices.map(idx => 
        dbFloorRef.collection("barcodesHistory").doc(uniqueBarcodes[idx])
      );
      historySnaps = await db.getAll(...historyRefs);
    }

    let historySnapIdx = 0;
    const finalBarcodes = [];
    
    snaps.forEach((snap, i) => {
      const bc = uniqueBarcodes[i];
      if (snap.exists) {
        const data = snap.data();
        if (data.in_mutasi) {
          throw new HttpsError("failed-precondition", `Barcode ${bc} terkunci (sudah laku/mutasi).`);
        }
        finalBarcodes.push({
          barcode: bc,
          category: allowCategoryOverride ? (category || data.category) : data.category,
          detailType: allowCategoryOverride ? (defaultDetailType || data.detailType || null) : data.detailType,
          origin: data.location || destination
        });
      } else {
        const histSnap = historySnaps[historySnapIdx++];
        if (histSnap && histSnap.exists) {
          const data = histSnap.data();
          finalBarcodes.push({
            barcode: bc,
            category: data.category,
            detailType: data.detailType || null,
            origin: data.location || destination
          });
        } else {
          const parsed = parseBarcodeCategoryAndType(bc);
          finalBarcodes.push({
            barcode: bc,
            category: category || parsed.mainCat,
            detailType: defaultDetailType || parsed.subType || null,
            origin: destination // Base registration
          });
        }
      }
    });

    const resolvedOrigins = [...new Set(finalBarcodes.map(b => b.origin))];
    const requestOrigin = resolvedOrigins.length === 1 ? resolvedOrigins[0] : "any";

    const reqRef = dbFloorRef.collection("barcodeMoveRequests").doc();
    await reqRef.set({
      id: reqRef.id,
      pemindah,
      origin: requestOrigin,
      destination,
      barcodes: finalBarcodes,
      status: "pending",
      notes,
      defaultDetailType,
      allowCategoryOverride,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
      processedBy: ""
    });

    return { success: true, requestId: reqRef.id };
  }
);

export const processBarcodeMoveRequest = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin", "input"].includes(role)) {
      throw new HttpsError("permission-denied", "Akses ditolak. Membutuhkan izin supervisor atau input.");
    }

    const { 
      floorId = "L1", 
      requestId, 
      status, 
      processor 
    } = request.data || {};

    if (!requestId || !["approved", "rejected"].includes(status)) {
      throw new HttpsError("invalid-argument", "Parameter tidak valid.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    const reqRef = dbFloorRef.collection("barcodeMoveRequests").doc(requestId);

    await db.runTransaction(async (t) => {
      const reqSnap = await t.get(reqRef);
      if (!reqSnap.exists) {
        throw new HttpsError("not-found", "Request tidak ditemukan.");
      }
      
      const reqData = reqSnap.data();
      if (reqData.status !== "pending") {
        throw new HttpsError("failed-precondition", "Request sudah diproses.");
      }

      if (status === "approved") {
        await executeMutationLogic(
          t, 
          dbFloorRef, 
          reqData.barcodes, 
          reqData.destination, 
          reqData.pemindah, 
          reqData.notes || "Approved via queue", 
          reqData.origin || "any",
          reqData.defaultDetailType || "",
          "",
          reqData.allowCategoryOverride || false
        );
      }

      t.update(reqRef, {
        status,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        processedBy: processor || "System"
      });
    });

    return { success: true };
  }
);

async function performBarcodeArchiving(floorId, daysThreshold = 30) {
  const dbFloorRef = db.collection("floors").doc(floorId);
  const thresholdDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  logger.info(`Archiving inactive barcodes for floor ${floorId} older than ${thresholdDate.toISOString()}`);

  const snap = await dbFloorRef.collection("barcodes")
    .where("location", "in", ["laku", "mutasi", "barang-display"])
    .where("lastUpdated", "<", thresholdDate)
    .limit(500)
    .get();

  if (snap.empty) {
    logger.info(`No inactive barcodes to archive for floor ${floorId}.`);
    return 0;
  }

  const batchWriter = db.bulkWriter();
  let count = 0;

  snap.forEach((doc) => {
    const data = doc.data();
    const barcodeId = doc.id;
    const historyRef = dbFloorRef.collection("barcodesHistory").doc(barcodeId);
    
    // Copy to barcodesHistory
    batchWriter.set(historyRef, {
      ...data,
      archivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Delete from active barcodes
    batchWriter.delete(doc.ref);
    count++;
  });

  await batchWriter.close();
  logger.info(`Successfully archived ${count} barcodes for floor ${floorId}.`);
  return count;
}

export const scheduledArchiveInactiveBarcodes = onSchedule(
  {
    schedule: "0 2 * * *", // 2 AM WITA everyday
    timeZone: "Asia/Makassar", // WITA
    region: "asia-southeast2",
    memory: "512MiB",
  },
  async (event) => {
    for (const floorId of SNAPSHOT_FLOORS) {
      try {
        await performBarcodeArchiving(floorId, 30);
      } catch (err) {
        logger.error(`Error archiving barcodes for floor ${floorId}:`, err);
      }
    }
  }
);

export const manualArchiveInactiveBarcodes = onCall(
  { region: "asia-southeast2", memory: "512MiB" },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["admin", "supervisor"].includes(role)) {
      throw new HttpsError("permission-denied", "Hanya admin/supervisor yang dapat menjalankan pembersihan arsip.");
    }

    const floorId = String(request.data?.floorId || "L1").trim().toUpperCase();
    const days = parseInt(request.data?.days, 10);
    const thresholdDays = isNaN(days) ? 30 : days;

    if (!["L1", "L2"].includes(floorId)) {
      throw new HttpsError("invalid-argument", "floorId tidak valid.");
    }

    const count = await performBarcodeArchiving(floorId, thresholdDays);
    return { ok: true, archivedCount: count };
  }
);

export const deleteSingleBarcode = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (role !== "supervisor") {
      throw new HttpsError("permission-denied", "Akses ditolak. Fitur ini hanya dapat dijalankan oleh Supervisor.");
    }

    const { barcodeId, floorId = "L1" } = request.data || {};
    if (!barcodeId) {
      throw new HttpsError("invalid-argument", "barcodeId wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    const barcodeRef = dbFloorRef.collection("barcodes").doc(barcodeId.trim().toUpperCase());
    const historyRef = dbFloorRef.collection("barcodesHistory").doc(barcodeId.trim().toUpperCase());

    const cleanBarcodeId = barcodeId.trim().toUpperCase();
    const qSingle = dbFloorRef.collection("barcodeMutationLogs").where("barcode", "==", cleanBarcodeId);
    const qBulk = dbFloorRef.collection("barcodeMutationLogs").where("barcodeIds", "array-contains", cleanBarcodeId);

    const [snapSingle, snapBulk] = await Promise.all([qSingle.get(), qBulk.get()]);

    await db.runTransaction(async (t) => {
      const snap = await t.get(barcodeRef);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Barcode tidak ditemukan.");
      }

      const data = snap.data();
      const cat = data.category;
      const loc = data.location;
      const detailType = data.detailType || null;

      // Read stock document
      const stockRef = dbFloorRef.collection("stocks").doc(loc);
      const stockSnap = await t.get(stockRef);
      const stockData = stockSnap.exists ? stockSnap.data() : {};

      const existing = stockData[cat] || { quantity: 0, lastUpdated: null, history: [] };
      const currentQty = parseInt(existing.quantity, 10) || 0;
      const newQty = Math.max(0, currentQty - 1);

      const updatedCategory = {
        quantity: newQty,
        lastUpdated: new Date().toISOString(),
        history: Array.isArray(existing.history) ? [...existing.history] : []
      };

      updatedCategory.history.unshift({
        date: new Date().toISOString(),
        action: "Kurangi",
        quantity: 1,
        oldQuantity: currentQty,
        newQuantity: newQty,
        petugas: "Supervisor",
        keterangan: `Hapus Barcode Satuan: ${barcodeId}`
      });
      if (updatedCategory.history.length > 25) {
        updatedCategory.history = updatedCategory.history.slice(0, 25);
      }

      if (detailType) {
        const existingDetails = existing.details || {};
        const updatedDetails = { ...existingDetails };
        const currentTypeQty = parseInt(existingDetails[detailType], 10) || 0;
        updatedDetails[detailType] = Math.max(0, currentTypeQty - 1);
        updatedCategory.details = updatedDetails;
      }

      const updatedStockData = {
        ...stockData,
        [cat]: updatedCategory
      };

      // Perform writes
      t.set(stockRef, updatedStockData, { merge: true });
      t.delete(barcodeRef);
      t.delete(historyRef);

      // Clean up single mutation logs
      snapSingle.docs.forEach((doc) => {
        t.delete(doc.ref);
      });

      // Clean up bulk mutation logs
      snapBulk.docs.forEach((doc) => {
        const data = doc.data() || {};
        const barcodeIds = Array.isArray(data.barcodeIds) ? data.barcodeIds.filter(id => id !== cleanBarcodeId) : [];
        const barcodes = Array.isArray(data.barcodes) ? data.barcodes.filter(b => b.barcode !== cleanBarcodeId) : [];

        if (barcodeIds.length === 0) {
          t.delete(doc.ref);
        } else {
          const updateData = {
            barcodeIds,
            barcodes,
          };
          if (barcodeIds.length === 1) {
            updateData.barcode = barcodes[0].barcode;
            updateData.category = barcodes[0].category;
            updateData.detailType = barcodes[0].detailType || null;
            updateData.origin = barcodes[0].origin;
          } else {
            updateData.barcode = `GABUNGAN (${barcodeIds.length} BARANG)`;
          }
          t.update(doc.ref, updateData);
        }
      });

      // Write to dailyStockLogs
      const dateStr = formatYmd(toWitaParts(new Date()));
      const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
      t.set(dailyLogRef, {
        date: dateStr,
        logs: admin.firestore.FieldValue.arrayUnion({
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: loc,
          action: "kurangi",
          before: currentQty,
          after: newQty,
          quantity: 1,
          userName: "Supervisor",
          keterangan: `Hapus Barcode Satuan: ${barcodeId}`
        })
      }, { merge: true });
    });

    return { success: true };
  }
);

export const revertSingleBarcode = onCall(
  { region: "asia-southeast2", memory: "256MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (!["supervisor", "admin"].includes(role)) {
      throw new HttpsError("permission-denied", "Akses ditolak. Fitur ini hanya dapat dijalankan oleh Supervisor atau Admin.");
    }

    const { barcodeId, floorId = "L1" } = request.data || {};
    if (!barcodeId) {
      throw new HttpsError("invalid-argument", "barcodeId wajib diisi.");
    }

    const cleanBarcodeId = barcodeId.trim().toUpperCase();
    const dbFloorRef = db.collection("floors").doc(floorId);
    
    // Ambil info barcode saat ini terlebih dahulu
    const barcodeRef = dbFloorRef.collection("barcodes").doc(cleanBarcodeId);
    const snapBarcode = await barcodeRef.get();
    if (!snapBarcode.exists) {
      throw new HttpsError("not-found", "Barcode tidak ditemukan.");
    }
    const barcodeData = snapBarcode.data();
    const currentLoc = barcodeData.location;
    const cat = barcodeData.category;
    const detailType = barcodeData.detailType || null;

    // Ambil log mutasi terbaru yang meletakkan barcode di lokasi saat ini
    const qSingle = dbFloorRef.collection("barcodeMutationLogs").where("barcode", "==", cleanBarcodeId).where("destination", "==", currentLoc);
    const qBulk = dbFloorRef.collection("barcodeMutationLogs").where("barcodeIds", "array-contains", cleanBarcodeId).where("destination", "==", currentLoc);
    const [snapSingle, snapBulk] = await Promise.all([qSingle.get(), qBulk.get()]);

    const allLogs = [];
    snapSingle.docs.forEach(d => allLogs.push({ ref: d.ref, data: d.data() }));
    snapBulk.docs.forEach(d => {
      if (!allLogs.some(l => l.ref.id === d.id)) {
        allLogs.push({ ref: d.ref, data: d.data() });
      }
    });

    // Urutkan berdasarkan waktu mutasi terbaru
    allLogs.sort((a, b) => {
      const aTime = a.data.timestamp ? a.data.timestamp.toMillis() : 0;
      const bTime = b.data.timestamp ? b.data.timestamp.toMillis() : 0;
      return bTime - aTime;
    });

    let latestLog = allLogs[0] || null;
    let foundOrigin = null;
    if (latestLog) {
      const bcEntry = Array.isArray(latestLog.data.barcodes) ? latestLog.data.barcodes.find(b => b.barcode === cleanBarcodeId) : null;
      foundOrigin = bcEntry ? bcEntry.origin : (latestLog.data.origin || null);
    }

    const isRevert = foundOrigin && foundOrigin !== currentLoc;
    const petugasName = role === "admin" ? "Admin" : "Supervisor";

    await db.runTransaction(async (t) => {
      // 1. Ambil semua data stok yang diperlukan di awal transaksi (Reads)
      const currentStockRef = dbFloorRef.collection("stocks").doc(currentLoc);
      const originStockRef = isRevert ? dbFloorRef.collection("stocks").doc(foundOrigin) : null;
      
      const reads = [t.get(currentStockRef)];
      if (originStockRef) {
        reads.push(t.get(originStockRef));
      }
      const snaps = await Promise.all(reads);
      const currentStockSnap = snaps[0];
      const originStockSnap = isRevert ? snaps[1] : null;

      const currentStockData = currentStockSnap.exists ? currentStockSnap.data() : {};
      const originStockData = (originStockSnap && originStockSnap.exists) ? originStockSnap.data() : {};

      // 2. Lakukan perhitungan perubahan stok
      // Selalu kurangi stok lokasi saat ini (-1)
      const currentCatData = currentStockData[cat] || { quantity: 0, history: [] };
      const currentQty = parseInt(currentCatData.quantity, 10) || 0;
      const newCurrentQty = Math.max(0, currentQty - 1);
      
      const updatedCurrentCat = {
        quantity: newCurrentQty,
        lastUpdated: new Date().toISOString(),
        history: Array.isArray(currentCatData.history) ? [...currentCatData.history] : []
      };
      
      updatedCurrentCat.history.unshift({
        date: new Date().toISOString(),
        action: "Kurangi",
        quantity: 1,
        oldQuantity: currentQty,
        newQuantity: newCurrentQty,
        petugas: petugasName,
        keterangan: isRevert 
          ? `Batal Pemindahan Barcode ${cleanBarcodeId} kembali ke ${foundOrigin}`
          : `Hapus Barcode Satuan (Batalkan): ${cleanBarcodeId}`
      });
      if (updatedCurrentCat.history.length > 25) updatedCurrentCat.history = updatedCurrentCat.history.slice(0, 25);
      
      if (detailType) {
        const details = currentCatData.details || {};
        const typeQty = parseInt(details[detailType], 10) || 0;
        updatedCurrentCat.details = { ...details, [detailType]: Math.max(0, typeQty - 1) };
      }

      let originQty = 0;
      let newOriginQty = 0;
      let updatedOriginCat = null;

      if (isRevert) {
        // Tambahkan stok lokasi asal (+1)
        const originCatData = originStockData[cat] || { quantity: 0, history: [] };
        originQty = parseInt(originCatData.quantity, 10) || 0;
        newOriginQty = originQty + 1;
        
        updatedOriginCat = {
          quantity: newOriginQty,
          lastUpdated: new Date().toISOString(),
          history: Array.isArray(originCatData.history) ? [...originCatData.history] : []
        };
        
        updatedOriginCat.history.unshift({
          date: new Date().toISOString(),
          action: "Tambah",
          quantity: 1,
          oldQuantity: originQty,
          newQuantity: newOriginQty,
          petugas: petugasName,
          keterangan: `Batal Pemindahan Barcode ${cleanBarcodeId} kembali dari ${currentLoc}`
        });
        if (updatedOriginCat.history.length > 25) updatedOriginCat.history = updatedOriginCat.history.slice(0, 25);
        
        if (detailType) {
          const details = originCatData.details || {};
          const typeQty = parseInt(details[detailType], 10) || 0;
          updatedOriginCat.details = { ...details, [detailType]: typeQty + 1 };
        }
      }

      // 3. Eksekusi semua penulisan database (Writes)
      // Update stok saat ini
      t.set(currentStockRef, { ...currentStockData, [cat]: updatedCurrentCat }, { merge: true });

      if (isRevert) {
        // Update stok lokasi asal
        t.set(originStockRef, { ...originStockData, [cat]: updatedOriginCat }, { merge: true });

        // Kembalikan lokasi barcode ke origin
        t.set(barcodeRef, {
          location: foundOrigin,
          in_display: foundOrigin === "barang-display",
          in_mutasi: ["mutasi", "laku"].includes(foundOrigin),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        // Hapus dokumen barcode dari active list & history (jika ada)
        t.delete(barcodeRef);
        t.delete(dbFloorRef.collection("barcodesHistory").doc(cleanBarcodeId));
      }

      // Bersihkan dokumen log mutasi lama
      if (latestLog) {
        const logData = latestLog.data;
        const barcodeIds = Array.isArray(logData.barcodeIds) ? logData.barcodeIds.filter(id => id !== cleanBarcodeId) : [];
        const barcodes = Array.isArray(logData.barcodes) ? logData.barcodes.filter(b => b.barcode !== cleanBarcodeId) : [];

        if (barcodeIds.length === 0) {
          t.delete(latestLog.ref);
        } else {
          const updateData = { barcodeIds, barcodes };
          if (barcodeIds.length === 1) {
            updateData.barcode = barcodes[0].barcode;
            updateData.category = barcodes[0].category;
            updateData.detailType = barcodes[0].detailType || null;
            updateData.origin = barcodes[0].origin;
          } else {
            updateData.barcode = `GABUNGAN (${barcodeIds.length} BARANG)`;
          }
          t.update(latestLog.ref, updateData);
        }
      }

      // Catat logs harian (dailyStockLogs)
      const dateStr = formatYmd(toWitaParts(new Date()));
      const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
      const dailyLogs = [
        {
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: currentLoc,
          action: "kurangi",
          before: currentQty,
          after: newCurrentQty,
          quantity: 1,
          userName: petugasName,
          keterangan: isRevert 
            ? `Batal Pemindahan Barcode: ${cleanBarcodeId}`
            : `Hapus Barcode Satuan (Batalkan): ${cleanBarcodeId}`
        }
      ];

      if (isRevert) {
        dailyLogs.push({
          timestamp: admin.firestore.Timestamp.now(),
          jenis: cat,
          lokasi: foundOrigin,
          action: "tambah",
          before: originQty,
          after: newOriginQty,
          quantity: 1,
          userName: petugasName,
          keterangan: `Batal Pemindahan Barcode: ${cleanBarcodeId}`
        });
      }

      t.set(dailyLogRef, {
        date: dateStr,
        logs: admin.firestore.FieldValue.arrayUnion(...dailyLogs)
      }, { merge: true });
    });

    return { success: true };
  }
);

export const revertMutationLog = onCall(
  { region: "asia-southeast2", memory: "512MiB", cors: true },
  async (request) => {
    const role = await resolveCallerRole(request);
    if (role !== "supervisor") {
      throw new HttpsError("permission-denied", "Akses ditolak. Fitur ini hanya dapat dijalankan oleh Supervisor.");
    }

    const { logId, floorId = "L1" } = request.data || {};
    if (!logId) {
      throw new HttpsError("invalid-argument", "logId wajib diisi.");
    }

    const dbFloorRef = db.collection("floors").doc(floorId);
    const logRef = dbFloorRef.collection("barcodeMutationLogs").doc(logId);

    await db.runTransaction(async (t) => {
      const logSnap = await t.get(logRef);
      if (!logSnap.exists) {
        throw new HttpsError("not-found", "Log mutasi tidak ditemukan.");
      }

      const logData = logSnap.data();
      const barcodes = logData.barcodes || [];
      const destination = logData.destination;

      if (barcodes.length === 0) {
        throw new HttpsError("failed-precondition", "Tidak ada barcode di dalam log ini.");
      }

      // Collect target locations for stocks update
      const targetLocations = new Set([destination]);
      barcodes.forEach(b => {
        if (b.origin) targetLocations.add(b.origin);
      });

      const stockLocationList = Array.from(targetLocations);
      const stockRefs = stockLocationList.map(loc => dbFloorRef.collection("stocks").doc(loc));
      const stockSnaps = await Promise.all(stockRefs.map(ref => t.get(ref)));

      const stockDataMap = {};
      stockLocationList.forEach((loc, idx) => {
        stockDataMap[loc] = stockSnaps[idx].exists ? stockSnaps[idx].data() : {};
      });

      // Calculate stock adjustments
      // We are REVERTING, so we do the opposite of the mutation:
      // - Decrement 'destination' by 1 for each barcode
      // - If origin !== destination, increment 'origin' by 1 for each barcode
      const changes = {};
      const addChange = (loc, cat, type, diff) => {
        if (!changes[loc]) changes[loc] = {};
        if (!changes[loc][cat]) changes[loc][cat] = { quantity: 0, details: {} };
        changes[loc][cat].quantity += diff;
        if (type) {
          if (!changes[loc][cat].details[type]) changes[loc][cat].details[type] = 0;
          changes[loc][cat].details[type] += diff;
        }
      };

      for (const b of barcodes) {
        const barcodeId = b.barcode.trim().toUpperCase();
        const origin = b.origin || destination;
        const category = b.category;
        const detailType = b.detailType;

        if (origin !== destination) {
          addChange(destination, category, detailType, -1);
          addChange(origin, category, detailType, 1);
          
          // Revert barcode location to origin
          const bcRef = dbFloorRef.collection("barcodes").doc(barcodeId);
          t.set(bcRef, {
            location: origin,
            in_display: origin === "barang-display",
            in_mutasi: ["mutasi", "laku"].includes(origin),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else {
          // It was a new registration, so delete it
          addChange(destination, category, detailType, -1);
          const bcRef = dbFloorRef.collection("barcodes").doc(barcodeId);
          t.delete(bcRef);
        }
      }

      // Apply changes to stocks
      for (const loc of Object.keys(changes)) {
        const data = stockDataMap[loc] || {};
        const locChanges = changes[loc];
        const updatedData = { ...data };

        for (const cat of Object.keys(locChanges)) {
          const existing = data[cat] || { quantity: 0, lastUpdated: null, history: [] };
          const currentQty = parseInt(existing.quantity, 10) || 0;
          const diffQty = locChanges[cat].quantity;
          const newQty = Math.max(0, currentQty + diffQty);

          const updatedCategory = {
            quantity: newQty,
            lastUpdated: new Date().toISOString(),
            history: Array.isArray(existing.history) ? [...existing.history] : []
          };

          if (diffQty !== 0) {
            updatedCategory.history.unshift({
              date: new Date().toISOString(),
              action: diffQty > 0 ? "Tambah" : "Kurangi",
              quantity: Math.abs(diffQty),
              oldQuantity: currentQty,
              newQuantity: newQty,
              petugas: "Supervisor",
              keterangan: `Pembatalan Sesi Mutasi/Upload (Log ID: ${logId})`
            });
            if (updatedCategory.history.length > 25) {
              updatedCategory.history = updatedCategory.history.slice(0, 25);
            }
          }

          const existingDetails = existing.details || {};
          const updatedDetails = { ...existingDetails };
          const catDetailsChanges = locChanges[cat].details;

          for (const type of Object.keys(catDetailsChanges)) {
            const currentTypeQty = parseInt(existingDetails[type], 10) || 0;
            const diffTypeQty = catDetailsChanges[type];
            updatedDetails[type] = Math.max(0, currentTypeQty + diffTypeQty);
          }

          if (Object.keys(updatedDetails).length > 0) {
            updatedCategory.details = updatedDetails;
          }

          updatedData[cat] = updatedCategory;
        }

        const stockRef = dbFloorRef.collection("stocks").doc(loc);
        t.set(stockRef, updatedData, { merge: true });
      }

      // Write dailyStockLogs
      const dateStr = formatYmd(toWitaParts(new Date()));
      const dailyLogRef = dbFloorRef.collection("dailyStockLogs").doc(dateStr);
      const dailyLogs = [];

      for (const loc of Object.keys(changes)) {
        const locChanges = changes[loc];
        const data = stockDataMap[loc] || {};
        for (const cat of Object.keys(locChanges)) {
          const diffQty = locChanges[cat].quantity;
          if (diffQty !== 0) {
            const existing = data[cat] || { quantity: 0 };
            const beforeQty = parseInt(existing.quantity, 10) || 0;
            const afterQty = Math.max(0, beforeQty + diffQty);

            dailyLogs.push({
              timestamp: admin.firestore.Timestamp.now(),
              jenis: cat,
              lokasi: loc,
              action: diffQty > 0 ? "tambah" : "kurangi",
              before: beforeQty,
              after: afterQty,
              quantity: Math.abs(diffQty),
              userName: "Supervisor",
              keterangan: `Pembatalan Sesi Mutasi/Upload (Log ID: ${logId})`
            });
          }
        }
      }

      if (dailyLogs.length > 0) {
        t.set(dailyLogRef, {
          date: dateStr,
          logs: admin.firestore.FieldValue.arrayUnion(...dailyLogs)
        }, { merge: true });
      }

      // Delete the log document itself
      t.delete(logRef);
    });

    return { success: true };
  }
);

export const getSpeechTTS = onCall({ region: "asia-southeast2" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Request must be authenticated.");
  }

  const { text, provider, voiceName, pitch } = request.data || {};
  if (!text) {
    throw new HttpsError("invalid-argument", "Text parameter is required.");
  }

  try {
    // Read API Key from private Firestore document
    const docRef = db.collection("settings").doc("googleTTS");
    const snap = await docRef.get();
    
    let apiKey = "";
    if (snap.exists) {
      apiKey = snap.data().apiKey || "";
    }

    if (provider === "google_cloud") {
      if (!apiKey) {
        throw new HttpsError("failed-precondition", "Google Cloud TTS API Key is not configured on the server. Please add it to Firestore under settings/googleTTS.");
      }

      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
      const payload = {
        input: { text },
        voice: {
          languageCode: "id-ID",
          name: voiceName || "id-ID-Wavenet-A",
          ssmlGender: (voiceName || "").includes("-B") || (voiceName || "").includes("-C") ? "MALE" : "FEMALE"
        },
        audioConfig: {
          audioEncoding: "MP3",
          pitch: typeof pitch === "number" ? pitch : 0.0
        }
      };

      const originalReferer = request.rawRequest?.headers?.referer || "https://melatigold.web.app/";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": originalReferer
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Cloud TTS API error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      return { success: true, audioContent: json.audioContent };
    } else {
      // Default: free Translate TTS
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=${encodeURIComponent(text)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Translate TTS failed with status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return { success: true, audioContent: base64 };
    }
  } catch (err) {
    logger.error("Failed to generate TTS:", err);
    throw new HttpsError("internal", err.message || "Failed to generate TTS.");
  }
});

const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === "number" || !isNaN(dateStr)) {
    const num = Number(dateStr);
    if (!isNaN(num)) return new Date(num);
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  const clean = String(dateStr).replace(' ', 'T');
  const d2 = new Date(clean);
  if (!isNaN(d2.getTime())) return d2;
  
  return new Date();
};

export const syncDesktopSales = onRequest(
  { region: "asia-southeast2", memory: "512MiB" },
  async (req, res) => {
    // 1. Validasi API Key
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;
    const EXPECTED_API_KEY = "MelatiSecretToken123";
    if (apiKey !== EXPECTED_API_KEY) {
      logger.warn("Unauthorized sync request - invalid API key");
      res.status(403).send("Forbidden: Invalid API Key");
      return;
    }

    // 2. Parse payload
    const { store_id, sales_data = [] } = req.body || {};
    if (!store_id || !Array.isArray(sales_data) || sales_data.length === 0) {
      res.status(200).json({ success: true, message: "No data to process" });
      return;
    }

    // Map store_id to floorId
    const floorId = store_id === "MELATI-ATAS" ? "L2" : "L1";
    logger.info(`Processing ${sales_data.length} sales barcodes for store ${store_id} / floor ${floorId}`);

    try {
      const uniqueBarcodes = [...new Set(sales_data.map(item => item.barcode.trim().toUpperCase()))].filter(Boolean);
      if (uniqueBarcodes.length === 0) {
        res.status(200).json({ success: true, message: "No valid barcodes" });
        return;
      }

      // Batch query status barcodes saat ini di Firestore
      const dbFloorRef = db.collection("floors").doc(floorId);
      const barcodeRefs = uniqueBarcodes.map(bc => dbFloorRef.collection("barcodes").doc(bc));
      const snaps = await db.getAll(...barcodeRefs);

      const barcodeStateMap = {};
      snaps.forEach((snap, idx) => {
        barcodeStateMap[uniqueBarcodes[idx]] = snap.exists ? snap.data() : null;
      });

      // Kelompokkan data untuk proses
      const matchBarcodes = [];
      const discrepancyBarcodes = [];
      const ignoredBarcodes = [];

      sales_data.forEach(item => {
        const bc = item.barcode.trim().toUpperCase();
        const state = barcodeStateMap[bc];

        if (!state) {
          ignoredBarcodes.push({ barcode: bc, reason: "unregistered" });
        } else if (state.location === "laku") {
          ignoredBarcodes.push({ barcode: bc, reason: "already sold" });
        } else if (state.location === "barang-display") {
          matchBarcodes.push(item);
        } else {
          discrepancyBarcodes.push({
            item,
            currentLocation: state.location || "unknown"
          });
        }
      });

      logger.info(`Sales Sync breakdown: match=${matchBarcodes.length}, discrepancy=${discrepancyBarcodes.length}, ignored=${ignoredBarcodes.length}`);

      // 3. Jalankan Transaksi Mutasi untuk data yang MATCH
      if (matchBarcodes.length > 0) {
        const mutateItems = matchBarcodes.map(item => ({
          barcode: item.barcode,
          detailType: barcodeStateMap[item.barcode]?.detailType || "",
          category: barcodeStateMap[item.barcode]?.category || ""
        }));

        await db.runTransaction(async (t) => {
          const notesText = `Auto-Sync Penjualan Kasir Desktop. No Faktur: ${matchBarcodes.map(i => i.invoice_no).join(", ")}`;
          await executeMutationLogic(
            t, 
            dbFloorRef, 
            mutateItems, 
            "laku", 
            "Sync Agent Sales", 
            notesText, 
            "barang-display"
          );
        });
      }

      // 4. Jalankan Transaksi/Batch write untuk discrepancy docs
      if (discrepancyBarcodes.length > 0) {
        const batch = db.batch();
        discrepancyBarcodes.forEach(({ item, currentLocation }) => {
          const discId = `DISC_${item.barcode}_${item.desktop_item_id}`;
          const discRef = dbFloorRef.collection("barcodeDiscrepancies").doc(discId);
          batch.set(discRef, {
            id: discId,
            barcode: item.barcode,
            invoice_no: item.invoice_no,
            tanggalPenjualan: admin.firestore.Timestamp.fromDate(parseDateSafe(item.tanggal_penjualan)),
            namaSales: item.nama_sales,
            webLocation: currentLocation,
            detectedAt: admin.firestore.FieldValue.serverTimestamp(),
            resolved: false,
            resolvedAt: null,
            resolvedBy: null,
            resolutionNote: null
          }, { merge: true });
        });
        await batch.commit();
      }

      // 5. Update Daily Sync Stats (grouped by transaction date)
      const dataByDate = {};
      sales_data.forEach(item => {
        let datePart = "";
        if (item.tanggal_penjualan) {
          datePart = String(item.tanggal_penjualan).split("T")[0];
        }
        if (!datePart) {
          datePart = formatYmd(toWitaParts(new Date()));
        }

        if (!dataByDate[datePart]) {
          dataByDate[datePart] = {
            salesCount: 0,
            salesMatched: 0,
            salesDiscrepancy: 0,
            salesIgnored: 0,
            items: []
          };
        }

        const bc = item.barcode.trim().toUpperCase();
        
        let status = "ignored";
        let webLocation = undefined;
        let reason = undefined;

        if (matchBarcodes.some(m => m.barcode === bc)) {
          status = "matched";
          dataByDate[datePart].salesMatched++;
        } else if (discrepancyBarcodes.some(d => d.item.barcode === bc)) {
          status = "discrepancy";
          const discInfo = discrepancyBarcodes.find(d => d.item.barcode === bc);
          webLocation = discInfo ? discInfo.currentLocation : "unknown";
          dataByDate[datePart].salesDiscrepancy++;
        } else {
          status = "ignored";
          const ignInfo = ignoredBarcodes.find(i => i.barcode === bc);
          reason = ignInfo ? ignInfo.reason : "unknown";
          dataByDate[datePart].salesIgnored++;
        }

        dataByDate[datePart].salesCount++;
        dataByDate[datePart].items.push({
          id: item.desktop_item_id || "",
          invoice_no: item.invoice_no || "",
          barcode: bc,
          timestamp: item.tanggal_penjualan || "",
          salesName: item.nama_sales || "Unknown Sales",
          status,
          ...(webLocation ? { webLocation } : {}),
          ...(reason ? { reason } : {})
        });
      });

      // Write daily stats to Firestore
      for (const [dateId, stats] of Object.entries(dataByDate)) {
        const statsRef = dbFloorRef.collection("syncDailyStats").doc(dateId);
        await statsRef.set({
          date: dateId,
          salesCount: admin.firestore.FieldValue.increment(stats.salesCount),
          salesMatched: admin.firestore.FieldValue.increment(stats.salesMatched),
          salesDiscrepancy: admin.firestore.FieldValue.increment(stats.salesDiscrepancy),
          salesIgnored: admin.firestore.FieldValue.increment(stats.salesIgnored),
          items: admin.firestore.FieldValue.arrayUnion(...stats.items),
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      res.status(200).json({
        success: true,
        stats: {
          matched: matchBarcodes.length,
          discrepancy: discrepancyBarcodes.length,
          ignored: ignoredBarcodes.length
        }
      });
    } catch (err) {
      logger.error("Error in syncDesktopSales:", err);
      res.status(500).send(`Internal Server Error: ${err.message}`);
    }
  }
);

export const syncDesktopVoid = onRequest(
  { region: "asia-southeast2", memory: "512MiB" },
  async (req, res) => {
    // 1. Validasi API Key
    const apiKey = req.headers["x-api-key"] || req.query.apiKey;
    const EXPECTED_API_KEY = "MelatiSecretToken123";
    if (apiKey !== EXPECTED_API_KEY) {
      logger.warn("Unauthorized void request - invalid API key");
      res.status(403).send("Forbidden: Invalid API Key");
      return;
    }

    // 2. Parse payload
    const { store_id, void_data = [] } = req.body || {};
    if (!store_id || !Array.isArray(void_data) || void_data.length === 0) {
      res.status(200).json({ success: true, message: "No data to process" });
      return;
    }

    const floorId = store_id === "MELATI-ATAS" ? "L2" : "L1";
    logger.info(`Processing ${void_data.length} void barcodes for store ${store_id} / floor ${floorId}`);

    try {
      const dbFloorRef = db.collection("floors").doc(floorId);

      const processedResults = [];

      for (const voidItem of void_data) {
        const bc = voidItem.barcode.trim().toUpperCase();

        const statusResult = await db.runTransaction(async (t) => {
          // 1. READ: Cari log mutasi terakhir barcode ini sebelum ia dijual (destination === 'laku')
          const mutationLogsQuery = dbFloorRef.collection("barcodeMutationLogs")
            .where("barcodeIds", "array-contains", bc);
          const mutationLogsSnap = await t.get(mutationLogsQuery);
          
          // 2. READ: Baca status barcode terkini di Firestore
          const barcodeRef = dbFloorRef.collection("barcodes").doc(bc);
          const barcodeSnap = await t.get(barcodeRef);

          // 3. READ: Cari laporan discrepancy yang berasosiasi dengan barcode ini
          const discrepanciesQuery = dbFloorRef.collection("barcodeDiscrepancies")
            .where("barcode", "==", bc)
            .where("resolved", "==", false)
            .limit(10);
          const discrepanciesSnap = await t.get(discrepanciesQuery);

          // Evaluasi data barcode
          if (!barcodeSnap.exists) {
            logger.warn(`Void failed: Barcode ${bc} does not exist in active barcodes`);
            return { status: "ignored", reason: "unregistered" };
          }

          const barcodeData = barcodeSnap.data();
          if (barcodeData.location !== "laku") {
            logger.warn(`Void bypass: Barcode ${bc} is currently at location ${barcodeData.location}, not 'laku'`);
            return { status: "ignored", reason: `already ${barcodeData.location}` };
          }

          let previousOrigin = "barang-display"; // default fallback
          if (!mutationLogsSnap.empty) {
            const sortedLogs = mutationLogsSnap.docs
              .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
              .filter(log => log.destination === "laku" && log.timestamp)
              .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());

            if (sortedLogs.length > 0) {
              const lastLog = sortedLogs[0];
              const itemInLog = (lastLog.barcodes || []).find(b => b.barcode === bc);
              if (itemInLog && itemInLog.origin) {
                previousOrigin = itemInLog.origin;
              }
            }
          }

          // 4. WRITE: Kembalikan lokasi barcode ke asal secara transaksional
          const mutateItems = [{
            barcode: bc,
            detailType: barcodeData.detailType || "",
            category: barcodeData.category || ""
          }];

          const notesText = `Pembatalan Transaksi Kasir Desktop (Void). No Faktur: ${voidItem.invoice_no}. Dihapus Oleh: ${voidItem.dihapus_oleh}`;
          
          await executeMutationLogic(
            t,
            dbFloorRef,
            mutateItems,
            previousOrigin,
            "Sync Agent Void",
            notesText,
            "laku",
            "",
            "",
            false,
            true
          );

          // 5. WRITE: Selesaikan laporan discrepancy yang berasosiasi dengan barcode ini
          discrepanciesSnap.forEach(docSnap => {
            t.update(docSnap.ref, {
              resolved: true,
              resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
              resolvedBy: "System (Void Sync)",
              resolutionNote: `Pembatalan Transaksi Kasir Desktop (Void Faktur: ${voidItem.invoice_no})`
            });
          });

          return { status: "voided" };
        });

        const finalStatus = statusResult || { status: "ignored", reason: "failed transaction" };
        processedResults.push({
          id: voidItem.void_item_id || "",
          invoice_no: voidItem.invoice_no || "",
          barcode: bc,
          timestamp: voidItem.tanggal_void || "",
          dihapus_oleh: voidItem.dihapus_oleh || "Unknown Admin",
          status: finalStatus.status,
          ...(finalStatus.reason ? { reason: finalStatus.reason } : {})
        });
      }

      // Group void data by date
      const dataByDate = {};
      processedResults.forEach(item => {
        let datePart = "";
        if (item.timestamp) {
          datePart = String(item.timestamp).split("T")[0];
        }
        if (!datePart) {
          datePart = formatYmd(toWitaParts(new Date()));
        }

        if (!dataByDate[datePart]) {
          dataByDate[datePart] = {
            voidCount: 0,
            items: []
          };
        }

        dataByDate[datePart].voidCount++;
        dataByDate[datePart].items.push(item);
      });

      // Write daily stats to Firestore
      for (const [dateId, stats] of Object.entries(dataByDate)) {
        const statsRef = dbFloorRef.collection("syncDailyStats").doc(dateId);
        await statsRef.set({
          date: dateId,
          voidCount: admin.firestore.FieldValue.increment(stats.voidCount),
          items: admin.firestore.FieldValue.arrayUnion(...stats.items),
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      res.status(200).json({ success: true });
    } catch (err) {
      logger.error("Error in syncDesktopVoid:", err);
      res.status(500).send(`Internal Server Error: ${err.message}`);
    }
  }
);


