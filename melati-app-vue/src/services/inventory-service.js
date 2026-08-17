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
  deleteField,
  runTransaction,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { useWITA } from "@/composables/useWITA";
import { floorCollection, floorDoc } from "./floor-scope";
import { getCachedSettings, fetchInventorySettings } from "./inventory-setting-service";

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

export function getDynamicColorTypes() {
  const settings = getCachedSettings();
  if (settings && Array.isArray(settings.colorTypes)) {
    return settings.colorTypes.map(c => c.key);
  }
  return ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"];
}

export function getDynamicColorLabels() {
  const settings = getCachedSettings();
  if (settings && Array.isArray(settings.colorTypes)) {
    const labels = {};
    settings.colorTypes.forEach(c => { labels[c.key] = c.label; });
    return labels;
  }
  return {
    HIJAU: "Hijau",
    BIRU: "Biru",
    PUTIH: "Putih",
    PINK: "Pink",
    KUNING: "Kuning",
  };
}

export function getDynamicHalaTypes() {
  const settings = getCachedSettings();
  if (settings && Array.isArray(settings.halaTypes)) {
    return settings.halaTypes.map(h => h.key);
  }
  return ["KA", "LA", "AN", "CA", "SA", "GA"];
}

export function getDynamicHalaLabels() {
  const settings = getCachedSettings();
  if (settings && Array.isArray(settings.halaTypes)) {
    const labels = {};
    settings.halaTypes.forEach(h => { labels[h.key] = h.label; });
    return labels;
  }
  return {
    KA: "Kalung",
    LA: "Liontin",
    AN: "Anting",
    CA: "Cincin",
    SA: "Giwang",
    GA: "Gelang",
  };
}

/** Categories that use color sub-types (KALUNG, LIONTIN) */
export const TYPED_CATS = ["KALUNG", "LIONTIN"];
/** Categories that use jewelry type sub-types (HALA, KENDARI) */
export const HALA_CATS = ["HALA & SDW", "KENDARI & EMAS BALI"];
export const KETERANGAN_OPTS = [
  "Restok",
  "Laku",
  "Dipajang",
  "Sudah Posting",
  "Wishlist Customer",
  "Barang Rusak",
  "Batu Lepas",
  "Kode Bermasalah",
  "Mutasi",
  "Keep Staff",
  "Salah Update",
  "Contoh Custom",
  "Owner",
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
  if (TYPED_CATS.includes(mainCat)) return getDynamicColorTypes();
  if (HALA_CATS.includes(mainCat)) return getDynamicHalaTypes();
  return null;
}

function getDetailTypesByMode(detailType = "") {
  const normalized = String(detailType || "")
    .trim()
    .toLowerCase();
  if (normalized === "color") return getDynamicColorTypes();
  if (normalized === "hala") return getDynamicHalaTypes();
  return null;
}

function resolveDetailTypes(mainCat, detailType = "") {
  return getDetailTypesByMode(detailType) || getDetailTypes(mainCat);
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

function parseTimestamp(val) {
  if (!val) return 0;
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  const parsed = Date.parse(val);
  return isNaN(parsed) ? 0 : parsed;
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

      const localTs = parseTimestamp(localNode.lastUpdated);
      const incomingTs = parseTimestamp(incomingNode.lastUpdated);
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
 * @param {string} [opts.detailType] - Optional detail mode override ("color" | "hala")
 * @param {string} [opts.floorId]    - Floor ID; uses active floor if not provided
 */
export async function updateStockItem({
  subDoc,
  mainCat,
  newQuantity,
  newDetails,
  petugas,
  keterangan,
  detailType = "",
  floorId = "",
}) {
  const { todayStringWITA } = useWITA();

  const ref = floorDoc(db, "stocks", subDoc, floorId);
  const snap = await getDoc(ref);
  const docData = snap.exists() ? snap.data() : {};
  const existing = docData[mainCat] || { quantity: 0, lastUpdated: null, history: [] };
  const beforeQty = toInt(existing.quantity);
  const now = new Date().toISOString();
  const detailTypes = resolveDetailTypes(mainCat, detailType);

  const updated = {
    quantity: 0,
    lastUpdated: now,
    history: Array.isArray(existing.history) ? [...existing.history] : [],
  };

  let detailChanges = [];

  if (newDetails != null && detailTypes) {
    const oldDetails = sanitizeDetails(detailTypes, existing.details || {});
    const nextDetails = sanitizeDetails(detailTypes, newDetails);
    
    if (existing.details) {
      Object.keys(existing.details).forEach((k) => {
        if (nextDetails[k] === undefined) {
          nextDetails[k] = deleteField();
        }
      });
    }

    updated.details = nextDetails;
    
    updated.quantity = Object.keys(nextDetails).reduce((sum, k) => {
      if (nextDetails[k] === deleteField()) return sum;
      return sum + toInt(nextDetails[k]);
    }, 0);

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
        jewelryName: getDynamicColorLabels()[it.type] || getDynamicHalaLabels()[it.type] || it.type,
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

export async function updateKomputerStock({ mainCat, newQuantity, newDetails = null, detailType = "", floorId = "" }) {
  const ref = floorDoc(db, "stocks", "stok-komputer", floorId);
  const snap = await getDoc(ref);
  const docData = snap.exists() ? snap.data() : {};
  const existing = docData[mainCat] || { quantity: 0, lastUpdated: null };

  const next = {
    quantity: Math.max(0, toInt(newQuantity)),
    lastUpdated: new Date().toISOString(),
  };

  // Support typed categories generically (color / hala)
  const detailTypes = resolveDetailTypes(mainCat, detailType);
  if (detailTypes && newDetails) {
    const details = sanitizeDetails(detailTypes, newDetails);
    
    if (existing.details) {
      Object.keys(existing.details).forEach((k) => {
        if (details[k] === undefined) {
          details[k] = deleteField();
        }
      });
    }

    next.details = details;
    
    next.quantity = Object.keys(details).reduce((sum, k) => {
      if (details[k] === deleteField()) return sum;
      return sum + toInt(details[k]);
    }, 0);
  } else if (detailTypes && existing.details) {
    next.details = sanitizeDetails(detailTypes, existing.details);
    next.quantity = totalFromDetails(next.details);
  }

  await setDoc(ref, { [mainCat]: next }, { merge: true });
}

// ── Computed Helpers (pure, no Firestore) ─────────────────────────────────

export function getCardDetailMode(mainCat) {
  const settings = getCachedSettings();
  if (settings && Array.isArray(settings.cards)) {
    const card = settings.cards.find(c => c.id === mainCat);
    if (card) {
      const mode = String(card.detailMode || "").trim().toLowerCase();
      if (mode === "color" || mode === "hala" || mode === "default") return mode;
      if (card.type === "color") return "color";
      if (card.type === "hala") return "hala";
      return "default";
    }
  }
  // Fallback to static defaults
  if (TYPED_CATS.includes(mainCat)) return "color";
  if (HALA_CATS.includes(mainCat)) return "hala";
  return "default";
}

/**
 * Calculate total physical stock for a mainCategory across all sub-docs.
 * @param {Object} stockData - result of fetchAllStockData()
 * @param {string} mainCat
 * @returns {number}
 */
export function calcFisikTotal(stockData, mainCat, subCategories = SUB_CATEGORIES) {
  const detailMode = getCardDetailMode(mainCat);
  const useDetails = detailMode === "color" || detailMode === "hala";

  return subCategories.reduce((sum, sub) => {
    const item = stockData[sub.key]?.[mainCat];
    if (!item) return sum;
    if (useDetails && item.details && Object.keys(item.details).length > 0) {
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
 * @param {Object} [settingsObj] - Already fetched settings object to avoid Firestore read
 */
export async function saveDailyReport(dateStr, stockData, floorId = "", settingsObj = null) {
  const settings = settingsObj || await fetchInventorySettings(floorId);

  const mainCategories = settings && Array.isArray(settings.cards)
    ? settings.cards.filter((c) => c.enabled).map((c) => c.id)
    : MAIN_CATEGORIES;

  const subCategories = settings && Array.isArray(settings.tableRows)
    ? settings.tableRows.filter((r) => r.enabled)
    : SUB_CATEGORIES;

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
    return card?.detailMode || "default";
  };

  const items = {};
  const breakdown = {};

  mainCategories.forEach((mainCat) => {
    const fisik = calcFisikTotal(stockData, mainCat, subCategories, getCardDetailMode(mainCat));
    const komputer = parseInt(stockData["stok-komputer"]?.[mainCat]?.quantity, 10) || 0;
    const { label: status } = getStockStatus(fisik, komputer);
    items[mainCat] = { total: fisik, komputer, status };
    breakdown[mainCat] = {};
    subCategories.forEach((sub) => {
      const item = stockData[sub.key]?.[mainCat];
      breakdown[mainCat][subLabelMap[sub.key] || sub.key] = {
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

export async function cleanupDeletedDetailTypes({
  deletedColors = [],
  deletedHalas = [],
  floorId = "",
  currentStockData = {},
}) {
  if (deletedColors.length === 0 && deletedHalas.length === 0) return;

  for (const subDoc of Object.keys(currentStockData)) {
    const docData = currentStockData[subDoc];
    if (!docData) continue;

    let docChanged = false;
    const updatedDocData = {};

    for (const mainCat of Object.keys(docData)) {
      const item = docData[mainCat];
      if (item && item.details) {
        let itemChanged = false;
        const nextDetails = { ...item.details };
        const keysToDelete = [];

        deletedColors.forEach((col) => {
          if (nextDetails[col] !== undefined) {
            keysToDelete.push(col);
            itemChanged = true;
          }
        });

        deletedHalas.forEach((hala) => {
          if (nextDetails[hala] !== undefined) {
            keysToDelete.push(hala);
            itemChanged = true;
          }
        });

        if (itemChanged) {
          const nextQty = Object.keys(nextDetails).reduce((sum, k) => {
            if (keysToDelete.includes(k)) return sum;
            return sum + (parseInt(nextDetails[k], 10) || 0);
          }, 0);

          keysToDelete.forEach((key) => {
            nextDetails[key] = deleteField();
          });

          updatedDocData[mainCat] = {
            ...item,
            details: nextDetails,
            quantity: nextQty,
            lastUpdated: new Date().toISOString(),
          };
          docChanged = true;
        }
      }
    }

    if (docChanged) {
      const ref = floorDoc(db, "stocks", subDoc, floorId);
      await setDoc(ref, updatedDocData, { merge: true });
    }
  }
}

export async function fetchBarcodeDiscrepancies({ floorId = "", resolved = false }) {
  const colRef = floorCollection(db, "barcodeDiscrepancies", floorId);
  const q = query(
    colRef,
    orderBy("detectedAt", "desc")
  );
  const snaps = await getDocs(q);
  const results = [];
  snaps.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.resolved === resolved) {
      results.push(data);
    }
  });
  return results;
}

export async function resolveBarcodeDiscrepancy({
  floorId = "",
  discrepancyId = "",
  resolvedBy = "",
  note = ""
}) {
  if (!discrepancyId) throw new Error("Discrepancy ID wajib diisi.");

  await runTransaction(db, async (transaction) => {
    // 1. Ambil dokumen discrepancy
    const discRef = floorDoc(db, "barcodeDiscrepancies", discrepancyId, floorId);
    const discSnap = await transaction.get(discRef);
    if (!discSnap.exists) {
      throw new Error("Dokumen selisih tidak ditemukan.");
    }
    const discData = discSnap.data();
    if (discData.resolved) {
      throw new Error("Dokumen selisih ini sudah diselesaikan sebelumnya.");
    }

    const barcodeId = discData.barcode;
    const webLocation = discData.webLocation || "barang-display";

    // 2. Ambil dokumen barcode
    const barcodeRef = floorDoc(db, "barcodes", barcodeId, floorId);
    const barcodeSnap = await transaction.get(barcodeRef);
    if (!barcodeSnap.exists) {
      throw new Error(`Barcode ${barcodeId} tidak ditemukan di database.`);
    }
    const barcodeData = barcodeSnap.data();

    // 3. Ambil dokumen stok untuk webLocation
    const stockRef = floorDoc(db, "stocks", webLocation, floorId);
    const stockSnap = await transaction.get(stockRef);
    const stockData = stockSnap.exists ? stockSnap.data() : {};

    const category = barcodeData.category;
    const detailType = barcodeData.detailType || "";

    // 4. Update status barcode ke 'laku'
    transaction.update(barcodeRef, {
      location: "laku",
      in_display: false,
      in_mutasi: true,
      lastUpdated: Timestamp.now()
    });

    // 5. Potong stok pada webLocation
    const updatedStockData = { ...stockData };
    const existingCat = updatedStockData[category] || { quantity: 0, lastUpdated: null, history: [] };
    const currentQty = parseInt(existingCat.quantity, 10) || 0;
    const newQty = Math.max(0, currentQty - 1);

    const updatedCategory = {
      quantity: newQty,
      lastUpdated: new Date().toISOString(),
      history: Array.isArray(existingCat.history) ? [...existingCat.history] : [],
      details: { ...(existingCat.details || {}) }
    };

    // Update details (warna/kadar) jika ada
    if (detailType) {
      const currentDetailQty = parseInt(updatedCategory.details[detailType], 10) || 0;
      updatedCategory.details[detailType] = Math.max(0, currentDetailQty - 1);
    }

    // Tambah log history ke dalam stok
    updatedCategory.history.unshift({
      date: new Date().toISOString(),
      action: "Kurangi",
      quantity: 1,
      oldQuantity: currentQty,
      newQuantity: newQty,
      petugas: resolvedBy,
      keterangan: `Resolusi Selisih: ${note}`,
      barcodes: [{ barcode: barcodeId, detailType }],
      totalBarcodesCount: 1,
      origin: webLocation,
      destination: "laku"
    });

    // Batasi riwayat stok maksimal 25 entri
    if (updatedCategory.history.length > 25) {
      updatedCategory.history = updatedCategory.history.slice(0, 25);
    }

    updatedStockData[category] = updatedCategory;
    transaction.set(stockRef, updatedStockData, { merge: true });

    // 6. Update status discrepancy
    transaction.update(discRef, {
      resolved: true,
      resolvedAt: Timestamp.now(),
      resolvedBy,
      resolutionNote: note
    });

    // 7. Buat dokumen baru di barcodeMutationLogs
    const logRef = doc(floorCollection(db, "barcodeMutationLogs", floorId));
    transaction.set(logRef, {
      id: logRef.id,
      barcodeIds: [barcodeId],
      barcodes: [{ barcode: barcodeId, category, detailType, origin: webLocation }],
      barcode: barcodeId,
      category,
      detailType: detailType || null,
      origin: webLocation,
      destination: "laku",
      pemindah: resolvedBy,
      status: "approved",
      notes: `Resolusi Selisih: ${note}`,
      timestamp: Timestamp.now()
    });

    // 8. Tulis ke dailyStockLogs
    const dateStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Makassar" });
    const dailyLogRef = floorDoc(db, "dailyStockLogs", dateStr, floorId);
    
    const newLogItem = {
      timestamp: Timestamp.now(),
      jenis: category,
      lokasi: webLocation,
      action: "kurangi",
      before: currentQty,
      after: newQty,
      quantity: 1,
      userName: resolvedBy,
      keterangan: `Resolusi Selisih: ${note}`
    };

    transaction.set(dailyLogRef, {
      date: dateStr,
      logs: arrayUnion(newLogItem)
    }, { merge: true });
  });
}

export async function fetchBarcodeCategory(floorId, barcodeId) {
  try {
    const docRef = floorDoc(db, "barcodes", barcodeId, floorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().category || "-";
    }
  } catch (e) {
    console.error("Gagal mengambil kategori barcode:", e);
  }
  return "-";
}

export function subscribeBarcodeDiscrepancies(floorId, onData, onError) {
  const colRef = floorCollection(db, "barcodeDiscrepancies", floorId);
  const q = query(colRef, orderBy("detectedAt", "desc"));
  return onSnapshot(q, (snap) => {
    const results = [];
    snap.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() });
    });
    onData(results);
  }, onError);
}

export async function fetchDailySyncStatsByDate(floorId, dateId) {
  if (!floorId || !dateId) throw new Error("Floor ID and Date ID are required.");
  try {
    const docRef = floorDoc(db, "syncDailyStats", dateId, floorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {
    console.error("Gagal mengambil statistik sinkronisasi harian:", e);
    throw e;
  }
  return null;
}

export async function repairStockItem(floorId, subDoc, mainCat, correctQty, correctDetails = null) {
  try {
    const ref = floorDoc(db, "stocks", subDoc, floorId);
    const updated = {
      quantity: correctQty,
      lastUpdated: new Date().toISOString(),
    };
    if (correctDetails !== null) {
      updated.details = correctDetails;
    }
    await setDoc(ref, { [mainCat]: updated }, { merge: true });
    console.log(`[Auto-Heal Success] Updated stocks/${subDoc} for ${mainCat} to quantity ${correctQty}`);
  } catch (err) {
    console.error(`[Auto-Heal Error] Failed to update stocks/${subDoc} for ${mainCat}:`, err);
  }
}

export async function verifyAndHealTabStocks(floorId, mainCat, currentStockData) {
  if (!floorId || !mainCat) return;

  const detailMode = getCardDetailMode(mainCat);
  const hasDetails = detailMode === "color" || detailMode === "hala";
  const subTypes = detailMode === "color" ? getDynamicColorTypes() : (detailMode === "hala" ? getDynamicHalaTypes() : []);
  const physicalLocations = ["brankas", "posting", "barang-rusak", "batu-lepas", "manual", "admin", "DP", "lainnya"];

  console.log(`[Verification] Starting background check for category: ${mainCat} on floor: ${floorId}`);

  for (const loc of physicalLocations) {
    try {
      const existingNode = currentStockData[loc]?.[mainCat];
      const existingQty = existingNode ? (parseInt(existingNode.quantity, 10) || 0) : 0;
      const existingDetails = existingNode?.details || {};

      if (!hasDetails) {
        // Simple category: Cincin, Anting, etc.
        const q = query(
          collection(db, "floors", floorId, "barcodes"),
          where("category", "==", mainCat),
          where("location", "==", loc)
        );
        const countSnap = await getCountFromServer(q);
        const serverCount = countSnap.data().count;

        if (serverCount !== existingQty) {
          console.warn(`[Discrepancy Detected] Location: ${loc}, Category: ${mainCat}. Stocks doc: ${existingQty}, Barcodes: ${serverCount}. Healing...`);
          await repairStockItem(floorId, loc, mainCat, serverCount);
        }
      } else {
        // Typed category: Kalung, Liontin, Hala, etc.
        const serverDetails = {};
        let totalServerCount = 0;
        let detailsChanged = false;

        for (const type of subTypes) {
          const q = query(
            collection(db, "floors", floorId, "barcodes"),
            where("category", "==", mainCat),
            where("location", "==", loc),
            where("detailType", "==", type)
          );
          const countSnap = await getCountFromServer(q);
          const serverCount = countSnap.data().count;

          serverDetails[type] = serverCount;
          totalServerCount += serverCount;

          if (serverCount !== (parseInt(existingDetails[type], 10) || 0)) {
            detailsChanged = true;
          }
        }

        const qtyChanged = totalServerCount !== existingQty;

        if (qtyChanged || detailsChanged) {
          console.warn(`[Discrepancy Detected] Location: ${loc}, Category: ${mainCat}. Stocks doc: ${existingQty}, Barcodes: ${totalServerCount}. Details changed: ${detailsChanged}. Healing...`);
          await repairStockItem(floorId, loc, mainCat, totalServerCount, serverDetails);
        }
      }
    } catch (e) {
      console.error(`[Verification Error] Failed checking location ${loc} for ${mainCat}:`, e);
    }
  }
}



