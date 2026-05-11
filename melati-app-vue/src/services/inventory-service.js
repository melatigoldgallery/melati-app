/**
 * Inventory Service — Brankas Stock Management (Floor-Scoped)
 * Collections: floors/{floorId}/stocks/{subDoc}, floors/{floorId}/dailyStockLogs/{date}, floors/{floorId}/daily_stock_reports/{date}
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { useWITA } from "@/composables/useWITA";
import { floorCollection, floorDoc } from "./floor-scope";

// ── Constants ─────────────────────────────────────────────────────────────

export const MAIN_CATEGORIES = [
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

export const SUB_CATEGORIES = [
  { key: "brankas", label: "Stok Brankas" },
  { key: "posting", label: "Belum Posting" },
  { key: "barang-display", label: "Display" },
  { key: "barang-rusak", label: "Rusak" },
  { key: "batu-lepas", label: "Batu Lepas" },
  { key: "manual", label: "Manual" },
  { key: "admin", label: "Admin" },
  { key: "DP", label: "DP" },
  { key: "lainnya", label: "Lainnya" },
];

export const COLOR_TYPES = ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"];
export const HALA_TYPES = ["KA", "LA", "AN", "CA", "SA", "GA"];
export const HALA_LABELS = {
  KA: "Kalung",
  LA: "Liontin",
  AN: "Anting",
  CA: "Cincin",
  SA: "Giwang",
  GA: "Gelang",
};
export const COLOR_LABELS = {
  HIJAU: "Hijau",
  BIRU: "Biru",
  PUTIH: "Putih",
  PINK: "Pink",
  KUNING: "Kuning",
};

/** Categories that use color sub-types (KALUNG, LIONTIN) */
export const TYPED_CATS = ["KALUNG", "LIONTIN"];
/** Categories that use jewelry type sub-types (HALA, KENDARI) */
export const HALA_CATS = ["HALA & SDW", "KENDARI & EMAS BALI"];
export const KETERANGAN_OPTS = [
  "restok",
  "laku",
  "dipajang",
  "sudah posting",
  "tutup toko",
  "mutasi staff",
  "barang rusak",
  "batu lepas",
  "kode bermasalah",
  "mutasi",
  "diperbaiki",
  "salah update",
  "custom",
];

const ALL_SUB_DOCS = [
  "brankas",
  "posting",
  "barang-display",
  "barang-rusak",
  "batu-lepas",
  "manual",
  "admin",
  "DP",
  "lainnya",
  "stok-komputer",
];

export const STOCK_DOCS = [...ALL_SUB_DOCS];

// Cache keys now include floorId to prevent cross-floor pollution
function getStaffCacheKey(floorId = "") {
  return `inventoryStaffOptionsCache:v2:${floorId || "default"}`;
}

const STAFF_CACHE_TTL = 24 * 60 * 60 * 1000;

function toInt(value) {
  return parseInt(value, 10) || 0;
}

function sanitizeDetails(types, details = {}) {
  const out = {};
  types.forEach((t) => {
    out[t] = Math.max(0, toInt(details[t]));
  });
  return out;
}

function totalFromDetails(details = {}) {
  return Object.values(details).reduce((sum, v) => sum + toInt(v), 0);
}

function getDetailTypes(mainCat) {
  if (TYPED_CATS.includes(mainCat)) return COLOR_TYPES;
  if (HALA_CATS.includes(mainCat)) return HALA_TYPES;
  return null;
}

// ── Firestore Operations ───────────────────────────────────────────────────

/**
 * Fetch all stock sub-documents at once (floor-scoped).
 * @param {string} [floorId] - Optional floor ID; uses active floor if not provided
 * @returns {Object} { [subDoc]: { [mainCat]: { quantity, details, lastUpdated, history } } }
 */
export async function fetchAllStockData(floorId = "") {
  const result = {};
  const snap = await getDocs(floorCollection(db, "stocks", floorId));
  snap.forEach((docSnap) => {
    result[docSnap.id] = docSnap.data() || {};
  });

  ALL_SUB_DOCS.forEach((id) => {
    if (!result[id]) result[id] = {};
  });

  return result;
}

export function mergeStockByLatest(localData = {}, incomingData = {}) {
  const merged = { ...localData };
  Object.keys(incomingData || {}).forEach((docId) => {
    const incomingDoc = incomingData[docId] || {};
    const localDoc = merged[docId] || {};
    const nextDoc = { ...localDoc };

    Object.keys(incomingDoc).forEach((mainCat) => {
      const incomingNode = incomingDoc[mainCat];
      const localNode = localDoc[mainCat];
      if (!localNode) {
        nextDoc[mainCat] = incomingNode;
        return;
      }
      if (!incomingNode) {
        nextDoc[mainCat] = localNode;
        return;
      }

      const localTs = localNode.lastUpdated ? Date.parse(localNode.lastUpdated) : 0;
      const incomingTs = incomingNode.lastUpdated ? Date.parse(incomingNode.lastUpdated) : 0;
      nextDoc[mainCat] = incomingTs >= localTs ? incomingNode : localNode;
    });

    merged[docId] = nextDoc;
  });

  return merged;
}

export function subscribeStocksRealtime(onData, floorId = "") {
  const ref = floorCollection(db, "stocks", floorId);
  return onSnapshot(ref, (snap) => {
    const incoming = {};
    snap.forEach((d) => {
      incoming[d.id] = d.data() || {};
    });
    onData(incoming);
  });
}

export async function fetchStaffOptions({ force = false, floorId = "" } = {}) {
  const cacheKey = getStaffCacheKey(floorId);

  if (!force) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp && Array.isArray(parsed?.data)) {
          const age = Date.now() - parsed.timestamp;
          if (age < STAFF_CACHE_TTL) return parsed.data;
        }
      }
    } catch {
      // ignore malformed cache
    }
  }

  let result = [];
  try {
    const staffQuery = query(floorCollection(db, "salesStaff", floorId), orderBy("nama", "asc"));
    const snap = await getDocs(staffQuery);
    result = snap.docs
      .map((d) => d.data())
      .filter((data) => (data?.status || "active") === "active")
      .map((data) => (data?.nama || "").trim())
      .filter(Boolean);
  } catch {
    result = [];
  }

  // Floor-only mode: do not fallback to legacy global users collection.

  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        data: result,
      }),
    );
  } catch {
    // ignore cache write failure
  }

  return result;
}

/**
 * Update stock quantity for a specific (subDoc, mainCat) - Floor-Scoped.
 * Builds history, saves to Firestore, and logs to daily_stock_logs.
 *
 * @param {Object} opts
 * @param {string} opts.subDoc      - Firestore doc ID under stocks/
 * @param {string} opts.mainCat     - Main category key (KALUNG, CINCIN, etc.)
 * @param {number|null} opts.newQuantity  - Simple quantity (for non-typed categories)
 * @param {Object|null} opts.newDetails   - Detail map for typed categories
 * @param {string} opts.petugas     - Operator name
 * @param {string} opts.keterangan  - Reason/description
 * @param {string} [opts.floorId]   - Floor ID; uses active floor if not provided
 */
export async function updateStockItem({ subDoc, mainCat, newQuantity, newDetails, petugas, keterangan, floorId = "" }) {
  const { todayStringWITA } = useWITA();

  const ref = floorDoc(db, "stocks", subDoc, floorId);
  const snap = await getDoc(ref);
  const docData = snap.exists() ? snap.data() : {};
  const existing = docData[mainCat] || { quantity: 0, lastUpdated: null, history: [] };
  const beforeQty = toInt(existing.quantity);
  const now = new Date().toISOString();
  const detailTypes = getDetailTypes(mainCat);

  const updated = {
    quantity: 0,
    lastUpdated: now,
    history: Array.isArray(existing.history) ? [...existing.history] : [],
  };

  let detailChanges = [];

  if (newDetails != null && detailTypes) {
    const oldDetails = sanitizeDetails(detailTypes, existing.details || {});
    const nextDetails = sanitizeDetails(detailTypes, newDetails);
    updated.details = nextDetails;
    updated.quantity = totalFromDetails(nextDetails);
    detailChanges = detailTypes
      .map((type) => {
        const oldQty = toInt(oldDetails[type]);
        const newQty = toInt(nextDetails[type]);
        return {
          type,
          oldQty,
          newQty,
          diff: newQty - oldQty,
        };
      })
      .filter((it) => it.diff !== 0);
  } else {
    updated.quantity = Math.max(0, toInt(newQuantity));
    if (existing.details) updated.details = existing.details;
  }

  const afterQty = updated.quantity;
  const netChange = afterQty - beforeQty;
  const totalDiff = detailChanges.length
    ? detailChanges.reduce((sum, it) => sum + Math.abs(it.diff), 0)
    : Math.abs(netChange);

  if (petugas) {
    const historyEntry = {
      date: now,
      action: netChange > 0 ? "Tambah" : netChange < 0 ? "Kurangi" : "Update",
      quantity: totalDiff,
      oldQuantity: beforeQty,
      newQuantity: afterQty,
      petugas,
      keterangan: keterangan || "",
    };

    if (detailChanges.length) {
      historyEntry.items = detailChanges.map((it) => ({
        jewelryType: it.type,
        jewelryName: COLOR_LABELS[it.type] || HALA_LABELS[it.type] || it.type,
        quantity: it.diff,
        oldQuantity: it.oldQty,
        newQuantity: it.newQty,
      }));
    }

    updated.history.unshift(historyEntry);
    if (updated.history.length > 10) updated.history = updated.history.slice(0, 10);
  }

  await setDoc(ref, { [mainCat]: updated }, { merge: true });

  // Log to daily_stock_logs only if there is an actual change
  if (petugas && keterangan && netChange !== 0) {
    const dateStr = todayStringWITA();
    const logRef = floorDoc(db, "dailyStockLogs", dateStr, floorId);
    await setDoc(
      logRef,
      {
        date: dateStr,
        logs: arrayUnion({
          timestamp: Timestamp.now(),
          jenis: mainCat,
          lokasi: subDoc,
          action: netChange > 0 ? "tambah" : "kurangi",
          before: beforeQty,
          after: afterQty,
          quantity: Math.abs(netChange),
          userName: petugas,
          keterangan,
        }),
      },
      { merge: true },
    );
  }
}

export async function updateKomputerStock({ mainCat, newQuantity, newDetails = null, floorId = "" }) {
  const ref = floorDoc(db, "stocks", "stok-komputer", floorId);
  const snap = await getDoc(ref);
  const docData = snap.exists() ? snap.data() : {};
  const existing = docData[mainCat] || { quantity: 0, lastUpdated: null };

  const next = {
    quantity: Math.max(0, toInt(newQuantity)),
    lastUpdated: new Date().toISOString(),
  };

  if (newDetails && TYPED_CATS.includes(mainCat)) {
    const details = sanitizeDetails(COLOR_TYPES, newDetails);
    next.details = details;
    next.quantity = totalFromDetails(details);
  } else if (existing.details && TYPED_CATS.includes(mainCat)) {
    next.details = sanitizeDetails(COLOR_TYPES, existing.details);
  }

  await setDoc(ref, { [mainCat]: next }, { merge: true });
}

// ── Computed Helpers (pure, no Firestore) ─────────────────────────────────

/**
 * Calculate total physical stock for a mainCategory across all sub-docs.
 * @param {Object} stockData - result of fetchAllStockData()
 * @param {string} mainCat
 * @returns {number}
 */
export function calcFisikTotal(stockData, mainCat, subCategories = SUB_CATEGORIES) {
  return subCategories.reduce((sum, sub) => {
    const item = stockData[sub.key]?.[mainCat];
    if (!item) return sum;
    if (item.details && Object.keys(item.details).length > 0) {
      return sum + Object.values(item.details).reduce((s, v) => s + (parseInt(v) || 0), 0);
    }
    return sum + (parseInt(item.quantity) || 0);
  }, 0);
}

/**
 * Compute Klop/Kurang/Lebih status comparing fisik total vs komputer.
 * @param {number} fisik
 * @param {number} komputer
 * @returns {{ label: string, cls: string }}
 */
export function getStockStatus(fisik, komputer) {
  if (fisik === komputer) return { label: "Klop", cls: "success" };
  if (fisik < komputer) return { label: `Kurang ${komputer - fisik}`, cls: "danger" };
  return { label: `Lebih ${fisik - komputer}`, cls: "warning" };
}

// ── Daily Stock Reports ───────────────────────────────────────────────────

/**
 * Fetch saved daily stock report for a date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {{ source: 'saved'|'none', data: Object|null }}
 */
export async function fetchDailyReport(dateStr, floorId = "") {
  const ref = floorDoc(db, "daily_stock_reports", dateStr, floorId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { source: "saved", data: snap.data() };
  return { source: "none", data: null };
}

/**
 * Save a daily stock snapshot computed from live stockData - Floor-Scoped.
 * @param {string} dateStr  - YYYY-MM-DD
 * @param {Object} stockData - result of fetchAllStockData()
 * @param {string} [floorId] - Floor ID; uses active floor if not provided
 */
export async function saveDailyReport(dateStr, stockData, floorId = "") {
  const SUB_LABEL_MAP = {
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

  const items = {};
  const breakdown = {};

  MAIN_CATEGORIES.forEach((mainCat) => {
    const fisik = calcFisikTotal(stockData, mainCat);
    const komputer = parseInt(stockData["stok-komputer"]?.[mainCat]?.quantity) || 0;
    const { label: status } = getStockStatus(fisik, komputer);
    items[mainCat] = { total: fisik, komputer, status };
    breakdown[mainCat] = {};
    SUB_CATEGORIES.forEach((sub) => {
      const item = stockData[sub.key]?.[mainCat];
      breakdown[mainCat][SUB_LABEL_MAP[sub.key] || sub.key] = {
        quantity: item?.quantity || 0,
        details: item?.details || null,
      };
    });
  });

  const ref = floorDoc(db, "daily_stock_reports", dateStr, floorId);
  await setDoc(ref, {
    date: dateStr,
    createdAt: Timestamp.now(),
    items,
    breakdown,
  });
}
