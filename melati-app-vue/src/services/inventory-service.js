/**
 * Inventory Service — Brankas Stock Management
 * Collections: stocks/{subDoc}, daily_stock_logs/{date}, daily_stock_reports/{date}
 */
import { doc, getDoc, setDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useWITA } from "@/composables/useWITA";

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

// ── Firestore Operations ───────────────────────────────────────────────────

/**
 * Fetch all stock sub-documents at once.
 * @returns {Object} { [subDoc]: { [mainCat]: { quantity, details, lastUpdated, history } } }
 */
export async function fetchAllStockData() {
  const refs = ALL_SUB_DOCS.map((id) => doc(db, "stocks", id));
  const snaps = await Promise.all(refs.map((r) => getDoc(r)));
  const result = {};
  ALL_SUB_DOCS.forEach((id, i) => {
    result[id] = snaps[i].exists() ? snaps[i].data() : {};
  });
  return result;
}

/**
 * Update stock quantity for a specific (subDoc, mainCat).
 * Builds history, saves to Firestore, and logs to daily_stock_logs.
 *
 * @param {Object} opts
 * @param {string} opts.subDoc      - Firestore doc ID under stocks/
 * @param {string} opts.mainCat     - Main category key (KALUNG, CINCIN, etc.)
 * @param {number|null} opts.newQuantity  - Simple quantity (for non-typed categories)
 * @param {Object|null} opts.newDetails   - Detail map for typed categories
 * @param {string} opts.petugas     - Operator name
 * @param {string} opts.keterangan  - Reason/description
 */
export async function updateStockItem({ subDoc, mainCat, newQuantity, newDetails, petugas, keterangan }) {
  const { todayStringWITA } = useWITA();

  const ref = doc(db, "stocks", subDoc);
  const snap = await getDoc(ref);
  const docData = snap.exists() ? snap.data() : {};
  const existing = docData[mainCat] || { quantity: 0, lastUpdated: null, history: [] };
  const beforeQty = parseInt(existing.quantity) || 0;
  const now = new Date().toISOString();

  const updated = {
    quantity: 0,
    lastUpdated: now,
    history: Array.isArray(existing.history) ? [...existing.history] : [],
  };

  if (newDetails != null) {
    updated.details = { ...newDetails };
    updated.quantity = Object.values(newDetails).reduce((s, v) => s + (parseInt(v) || 0), 0);
  } else {
    updated.quantity = parseInt(newQuantity) || 0;
    if (existing.details) updated.details = existing.details;
  }

  const afterQty = updated.quantity;
  const netChange = afterQty - beforeQty;

  if (petugas) {
    updated.history.unshift({
      date: now,
      action: netChange > 0 ? "Tambah" : netChange < 0 ? "Kurangi" : "Update",
      quantity: Math.abs(netChange),
      petugas,
      keterangan: keterangan || "",
    });
    if (updated.history.length > 10) updated.history = updated.history.slice(0, 10);
  }

  await setDoc(ref, { [mainCat]: updated }, { merge: true });

  // Log to daily_stock_logs only if there is an actual change
  if (petugas && keterangan && netChange !== 0) {
    const dateStr = todayStringWITA();
    const logRef = doc(db, "daily_stock_logs", dateStr);
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

// ── Computed Helpers (pure, no Firestore) ─────────────────────────────────

/**
 * Calculate total physical stock for a mainCategory across all sub-docs.
 * @param {Object} stockData - result of fetchAllStockData()
 * @param {string} mainCat
 * @returns {number}
 */
export function calcFisikTotal(stockData, mainCat) {
  return SUB_CATEGORIES.reduce((sum, sub) => {
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
export async function fetchDailyReport(dateStr) {
  const ref = doc(db, "daily_stock_reports", dateStr);
  const snap = await getDoc(ref);
  if (snap.exists()) return { source: "saved", data: snap.data() };
  return { source: "none", data: null };
}

/**
 * Save a daily stock snapshot computed from live stockData.
 * @param {string} dateStr  - YYYY-MM-DD
 * @param {Object} stockData - result of fetchAllStockData()
 */
export async function saveDailyReport(dateStr, stockData) {
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

  const ref = doc(db, "daily_stock_reports", dateStr);
  await setDoc(ref, {
    date: dateStr,
    createdAt: Timestamp.now(),
    items,
    breakdown,
  });
}
