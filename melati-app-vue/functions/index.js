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
const ENABLE_GLOBAL_SNAPSHOT_COMPAT = true;
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
  if (["admin", "supervisor", "staff", "hrd", "admin_custom"].includes(raw)) return raw;
  return normalizedFallback;
}

function isRoleAllowedForFloor(role, floorId) {
  const normalizedRole = normalizeUserRole(role, "staff");
  if (
    String(floorId || "")
      .trim()
      .toUpperCase() === "L2"
  ) {
    return ["supervisor", "admin"].includes(normalizedRole);
  }
  return ["supervisor", "admin", "staff", "hrd"].includes(normalizedRole);
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
      await dailyReportsRef.set({
        ...computeDailyStockReportsFromStockData(stockData, dateYmd),
        snapshotDateKey: dateKey,
        source: "snapshot-bridge",
        triggerSource,
        scopeKey: scopeConfig.scopeKey,
        floorId: scopeConfig.floorId,
      });
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

async function ensureSnapshotsForAllScopes(triggerSource) {
  const scopes = getSnapshotScopes();
  const results = [];

  for (const scopeItem of scopes) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await ensureSnapshotForYesterdayByScope(triggerSource, scopeItem.scope, scopeItem.floorId);
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
    schedule: "5 0 * * *",
    timeZone: "Asia/Makassar",
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async () => {
    await ensureSnapshotsForAllScopes("scheduler");
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
    await ensureSnapshotsForAllScopes("periodic-scheduler");
  },
);

export const ensureYesterdaySnapshotOnFirstTxGlobal = onDocumentWritten(
  {
    document: "stokAksesorisTransaksi/{txId}",
    region: "asia-southeast2",
    memory: "256MiB",
    retry: false,
  },
  async () => {
    await ensureSnapshotForYesterdayByScope("firestore-write-fallback-global", "global", "");
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
    schedule: "10 0 * * *",
    timeZone: "Asia/Makassar",
    region: "asia-southeast2",
    memory: "256MiB",
  },
  async () => {
    await ensureSnapshotsForAllScopes("scheduler-daily-reports");
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
