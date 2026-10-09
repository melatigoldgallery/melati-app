import { logger } from "firebase-functions";
import {
  db,
  admin,
  LOCK_TTL_MS,
  SNAPSHOT_FLOORS,
  ENABLE_GLOBAL_SNAPSHOT_COMPAT,
} from "../config.js";
import {
  toWitaParts,
  formatYmd,
  formatDmy,
  toDateFromYmd,
  shiftYmd,
} from "./date-helpers.js";

export function resolveSnapshotScope(scope = "global", floorId = "") {
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

export function getSnapshotScopes() {
  const scopes = SNAPSHOT_FLOORS.map((floorId) => ({ scope: "floor", floorId }));
  if (ENABLE_GLOBAL_SNAPSHOT_COMPAT) scopes.unshift({ scope: "global", floorId: "" });
  return scopes;
}

export async function aggregateTransactionsUntilByScope(endDate, scopeConfig) {
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

export async function buildSnapshotStockDataByScope({ yesterdayYmd, scopeConfig }) {
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

export function computeDailyStockReportsFromStockData(stockData = [], snapshotDateYmd = "") {
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

export async function generateGoldDailyReport(floorId, dateYmd) {
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

export async function ensureSnapshotByDateYmdForScope({
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

export async function ensureSnapshotForYesterdayByScope(triggerSource, scope = "global", floorId = "") {
  const todayYmd = formatYmd(toWitaParts(new Date()));
  const yesterdayYmd = shiftYmd(todayYmd, -1);
  return ensureSnapshotByDateYmdForScope({
    triggerSource,
    scope,
    floorId,
    dateYmd: yesterdayYmd,
  });
}

export async function ensureSnapshotsForAllScopes(triggerSource, targetDate = "yesterday") {
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
