import * as XLSX from "xlsx";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { getActiveFloor, normalizeFloorId } from "@/config/floor-config";
import { floorCollection, floorDoc } from "./floor-scope";
import { verifyStoredSecret } from "@/utils/security";

import { getCachedSettings } from "./inventory-setting-service";
import { batchAdjustManualStock } from "./inventory-service";
import { runTransaction } from "firebase/firestore";

const CACHE_KEY = "kodeDataCache";
const CACHE_TTL_STANDARD = 60 * 60 * 1000;
const CACHE_TTL_TODAY = 5 * 60 * 1000;
const CACHE_VERSION = "v4.0";
const SAVE_DEBOUNCE_MS = 1000;
const MAX_STORAGE_SIZE = 4 * 1024 * 1024;

export const CATEGORY_DEFINITIONS = {
  KALUNG: { label: "Kalung", prefixes: ["KM", "KB", "KP", "K"], detailMode: "color" },
  GELANG: { label: "Gelang", prefixes: ["GM", "GB", "GP", "G"], detailMode: "default" },
  CINCIN: { label: "Cincin", prefixes: ["CP", "CM", "CB", "C"], detailMode: "default" },
  LIONTIN: { label: "Liontin", prefixes: ["LP", "LM", "L"], detailMode: "color" },
  ANTING: { label: "Anting", prefixes: ["AP", "AM", "A"], detailMode: "default" },
  GIWANG: { label: "Giwang", prefixes: ["SP", "SM", "S"], detailMode: "default" },
  "HALA & SDW": { label: "HALA & SDW", prefixes: ["HL", "Z", "V"], detailMode: "hala" },
  "KENDARI & EMAS BALI": { label: "Kendari & Emas Bali", prefixes: ["KL"], detailMode: "hala" },
  BERLIAN: { label: "Berlian", prefixes: ["BL", "B"], detailMode: "default" },
};

export const JENIS_BARANG = {
  C: "Cincin",
  K: "Kalung",
  L: "Liontin",
  A: "Anting",
  G: "Gelang",
  S: "Giwang",
  Z: "HALA & SDW",
  V: "HALA & SDW",
  KM: "Kalung",
  KP: "Kalung",
  KB: "Kalung",
  GM: "Gelang",
  GP: "Gelang",
  GB: "Gelang",
  CP: "Cincin",
  CM: "Cincin",
  CB: "Cincin",
  LP: "Liontin",
  LM: "Liontin",
  AP: "Anting",
  AM: "Anting",
  SP: "Giwang",
  SM: "Giwang",
  HL: "HALA & SDW",
  KL: "Kendari & Emas Bali",
  BL: "Berlian",
  B: "Berlian",
};

/**
 * Mengambil definisi kategori yang diperkaya secara dinamis dengan custom cards dari Pengaturan Manajemen Stok
 */
export function getDynamicCategoryDefinitions() {
  const definitions = {};

  // 1. Masukkan presets default
  for (const [catKey, def] of Object.entries(CATEGORY_DEFINITIONS)) {
    definitions[catKey] = {
      label: def.label,
      prefixes: [...def.prefixes],
      detailMode: def.detailMode || "default",
    };
  }

  // 2. Perkaya dengan custom cards dari Pengaturan Manajemen Stok
  const settings = getCachedSettings();
  if (settings && Array.isArray(settings.cards)) {
    settings.cards.forEach((card) => {
      const cardId = String(card.id || "").trim().toUpperCase();
      if (!cardId || card.type === "computer" || card.enabled === false) return;

      const prefixes = Array.isArray(card.prefixes)
        ? card.prefixes.map((p) => String(p || "").trim().toUpperCase()).filter(Boolean)
        : [];

      if (definitions[cardId]) {
        definitions[cardId].label = card.label || definitions[cardId].label;
        definitions[cardId].prefixes = [...new Set([...prefixes, ...definitions[cardId].prefixes])];
        if (card.detailMode) definitions[cardId].detailMode = card.detailMode;
      } else {
        definitions[cardId] = {
          label: card.label || cardId,
          prefixes,
          detailMode: card.detailMode || (card.type === "color" || card.type === "hala" ? card.type : "default"),
        };
      }
    });
  }

  return definitions;
}

/**
 * Deteksi kategori utama, prefix, label, dan subtype dari kode/nama barang secara dinamis & DRY
 */
export function resolveCategoryFromPrefix(code, name = "", explicitPrefix = "") {
  const cleanCode = String(code || "").trim().toUpperCase();
  const cleanExplicit = String(explicitPrefix || "").trim().toUpperCase();
  const textName = String(name || "").toLowerCase();

  const defs = getDynamicCategoryDefinitions();

  // Ekstrak kandidat prefix berdasarkan tanda strip / huruf
  const prefixByDash = cleanCode.includes("-") ? cleanCode.split("-")[0].trim() : "";
  const lettersOnly = cleanCode.replace(/[^A-Z]/g, "");

  const candidatePrefixes = [
    cleanExplicit,
    prefixByDash,
    lettersOnly.substring(0, 3),
    lettersOnly.substring(0, 2),
    lettersOnly.substring(0, 1),
  ].filter(Boolean);

  let matchedCat = null;
  let matchedPrefix = "";

  // 1. Prioritas pencocokan prefix dengan definisi
  for (const cand of candidatePrefixes) {
    for (const [catKey, def] of Object.entries(defs)) {
      if (def.prefixes.includes(cand)) {
        matchedCat = catKey;
        matchedPrefix = cand;
        break;
      }
    }
    if (matchedCat) break;
  }

  // 2. Fallback startsWith pada kode bersih (misal prefix "TM" pada "TM00010")
  if (!matchedCat) {
    for (const [catKey, def] of Object.entries(defs)) {
      const found = def.prefixes.find((p) => p && cleanCode.startsWith(p));
      if (found) {
        matchedCat = catKey;
        matchedPrefix = found;
        break;
      }
    }
  }

  // 3. Fallback deteksi dari kata kunci nama barang jika kode tidak berpola standar
  if (!matchedCat && textName) {
    for (const [catKey, def] of Object.entries(defs)) {
      const catLabel = String(def.label || "").toLowerCase();
      const catName = catKey.toLowerCase();
      if ((catLabel && textName.includes(catLabel)) || (catName && textName.includes(catName))) {
        matchedCat = catKey;
        matchedPrefix = def.prefixes[0] || "LAIN";
        break;
      }
    }
  }

  if (!matchedCat) {
    matchedCat = "LAINNYA";
    matchedPrefix = candidatePrefixes[0] || "LAIN";
  }

  const def = defs[matchedCat] || { label: "Lainnya", detailMode: "default" };
  const jenisNama = def.label;

  // Resolve detailType (warna untuk Kalung/Liontin, tipe untuk Hala)
  let detailType = null;
  if (def.detailMode === "color") {
    if (textName.includes("hijau") || cleanCode.includes("HIJAU")) detailType = "HIJAU";
    else if (textName.includes("biru") || cleanCode.includes("BIRU")) detailType = "BIRU";
    else if (textName.includes("pink") || cleanCode.includes("PINK")) detailType = "PINK";
    else if (textName.includes("kuning") || cleanCode.includes("KUNING")) detailType = "KUNING";
    else if (cleanCode.includes("-")) {
      const parts = cleanCode.split("-");
      if (parts.length >= 3 && ["HIJAU", "BIRU", "PUTIH", "PINK", "KUNING"].includes(parts[parts.length - 2])) {
        detailType = parts[parts.length - 2];
      }
    }
    if (!detailType) detailType = "PUTIH";
  } else if (def.detailMode === "hala") {
    if (cleanCode.includes("-")) {
      const parts = cleanCode.split("-");
      if (parts.length >= 3 && ["KA", "LA", "AN", "CA", "SA", "GA"].includes(parts[parts.length - 2])) {
        detailType = parts[parts.length - 2];
      }
    }
    if (!detailType) {
      if (cleanCode.includes("KA") || textName.includes("kalung")) detailType = "KA";
      else if (cleanCode.includes("LA") || textName.includes("liontin")) detailType = "LA";
      else if (cleanCode.includes("AN") || textName.includes("anting")) detailType = "AN";
      else if (cleanCode.includes("CA") || textName.includes("cincin")) detailType = "CA";
      else if (cleanCode.includes("SA") || textName.includes("giwang")) detailType = "SA";
      else if (cleanCode.includes("GA") || textName.includes("gelang")) detailType = "GA";
      else detailType = "KA";
    }
  }

  return {
    mainCat: matchedCat,
    jenisNama,
    jenisPrefix: matchedPrefix,
    detailType,
  };
}

/**
 * Sinkronisasi data mutasiKode aktif ke koleksi barcodes (lokasi: manual)
 * Berguna jika ada barcode yang didaftarkan sebelum setting custom prefix diperbarui.
 */
export async function syncActiveMutasiKodeToBarcodes(floorId = "") {
  try {
    const q = query(
      floorCollection(db, "mutasiKode", floorId),
      where("isMutated", "==", false)
    );
    const snap = await getDocs(q);

    const batchPromises = [];
    const catCounts = {};
    const activeBarcodeSet = new Set();

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawKode = String(data.kode || "").trim();
      if (!rawKode || rawKode === "-") return;

      const cleanBarcode = rawKode.toUpperCase();
      activeBarcodeSet.add(cleanBarcode);
      const resolved = resolveCategoryFromPrefix(cleanBarcode, data.namaBarang, data.jenisPrefix);

      const mainCat = resolved.mainCat || "LAINNYA";
      if (!catCounts[mainCat]) {
        catCounts[mainCat] = { total: 0, details: {} };
      }
      catCounts[mainCat].total += 1;
      if (resolved.detailType) {
        catCounts[mainCat].details[resolved.detailType] = (catCounts[mainCat].details[resolved.detailType] || 0) + 1;
      }

      if (data.mainCat !== resolved.mainCat || data.jenisPrefix !== resolved.jenisPrefix) {
        batchPromises.push(
          updateDoc(docSnap.ref, {
            mainCat: resolved.mainCat,
            detailType: resolved.detailType || null,
            jenisPrefix: resolved.jenisPrefix,
            jenisNama: resolved.jenisNama,
            lastUpdated: serverTimestamp(),
          }).catch(() => {})
        );
      }

      const barcodeRef = floorDoc(db, "barcodes", cleanBarcode, floorId);
      batchPromises.push(
        setDoc(
          barcodeRef,
          {
            barcode: cleanBarcode,
            category: resolved.mainCat,
            detailType: resolved.detailType || null,
            location: "manual",
            in_display: false,
            in_mutasi: false,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {})
      );
    });

    await Promise.all(batchPromises);
  } catch (err) {
    console.error("[syncActiveMutasiKodeToBarcodes Error]:", err);
  }
}

// Coba deteksi prefix jenis barang dari nama produk jika kode tidak memiliki prefix yang valid
function detectPrefixFromNama(nama) {
  const resolved = resolveCategoryFromPrefix("", nama);
  return resolved.jenisPrefix !== "LAIN" ? resolved.jenisPrefix : null;
}

const kodeDataCache = new Map();
const kodeDataCacheMeta = new Map();
let saveToStorageTimeout = null;

function resolveCacheFloorId(floorId = "") {
  const normalizedInput = normalizeFloorId(floorId);
  if (normalizedInput) return normalizedInput;

  const activeFloor = getActiveFloor({ fallback: "L1" });
  return normalizeFloorId(activeFloor, "L1");
}

function buildCacheKey(dateString = getLocalDateString(), floorId = "") {
  return `${CACHE_KEY}_${dateString}_${resolveCacheFloorId(floorId)}`;
}

function cloneData(data) {
  return {
    active: [...(data?.active || [])],
    mutated: [...(data?.mutated || [])],
  };
}

export function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentDateDDMMYYYY() {
  const today = new Date();
  return `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${today.getFullYear()}`;
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  } catch {
    return "-";
  }
}

function parseDateDDMMYYYY(dateString) {
  if (!dateString || dateString === "-") return new Date(0);
  const parts = dateString.split("/");
  if (parts.length !== 3) return new Date(dateString);
  return new Date(parts[2], Number(parts[1]) - 1, parts[0]);
}

function isCacheValid(cacheKey) {
  const timestamp = kodeDataCacheMeta.get(cacheKey);
  if (!timestamp) return false;

  const now = Date.now();
  if (cacheKey.includes(getLocalDateString())) {
    return now - timestamp < CACHE_TTL_TODAY;
  }
  return now - timestamp < CACHE_TTL_STANDARD;
}

function saveCacheToStorage() {
  if (typeof localStorage === "undefined") return;
  try {
    kodeDataCache.forEach((value, key) => {
      const timestamp = kodeDataCacheMeta.get(key) || Date.now();
      const cacheData = {
        timestamp,
        version: CACHE_VERSION,
        data: value.data,
        source: value.source,
      };
      const serialized = JSON.stringify(cacheData);
      if (serialized.length > MAX_STORAGE_SIZE) return;
      localStorage.setItem(key, serialized);
    });
  } catch {
    clearOldCache();
  }
}

function saveToCache(data, source, cacheKey) {
  kodeDataCache.set(cacheKey, {
    data: cloneData(data),
    source,
    version: CACHE_VERSION,
  });
  kodeDataCacheMeta.set(cacheKey, Date.now());

  if (saveToStorageTimeout) {
    clearTimeout(saveToStorageTimeout);
  }
  saveToStorageTimeout = setTimeout(saveCacheToStorage, SAVE_DEBOUNCE_MS);
}

function getFromCache(cacheKey) {
  if (kodeDataCache.has(cacheKey) && isCacheValid(cacheKey)) {
    const cached = kodeDataCache.get(cacheKey);
    if (cached.version === CACHE_VERSION) {
      return {
        data: cloneData(cached.data),
        source: cached.source,
      };
    }
  }

  if (typeof localStorage === "undefined") return null;

  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) return null;

    const parsed = JSON.parse(cachedData);
    const now = Date.now();
    if (
      parsed.version === CACHE_VERSION &&
      typeof parsed.timestamp === "number" &&
      now - parsed.timestamp < CACHE_TTL_STANDARD
    ) {
      kodeDataCache.set(cacheKey, {
        data: cloneData(parsed.data),
        source: parsed.source,
        version: parsed.version,
      });
      kodeDataCacheMeta.set(cacheKey, parsed.timestamp);
      return {
        data: cloneData(parsed.data),
        source: parsed.source,
      };
    }

    localStorage.removeItem(cacheKey);
  } catch {
    localStorage.removeItem(cacheKey);
  }

  return null;
}

export function loadCacheFromStorage() {
  if (typeof localStorage === "undefined") return;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.includes("kode")) continue;

      try {
        const cachedData = localStorage.getItem(key);
        if (!cachedData) continue;
        const parsed = JSON.parse(cachedData);

        if (parsed.version !== CACHE_VERSION) {
          localStorage.removeItem(key);
          continue;
        }

        if (Date.now() - parsed.timestamp > CACHE_TTL_STANDARD) {
          localStorage.removeItem(key);
          continue;
        }

        kodeDataCache.set(key, {
          data: cloneData(parsed.data),
          source: parsed.source,
          version: parsed.version,
        });
        kodeDataCacheMeta.set(key, parsed.timestamp);
      } catch {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // noop
  }
}

export function clearOldCache() {
  const now = Date.now();
  const keysToDelete = [];

  kodeDataCacheMeta.forEach((timestamp, key) => {
    if (now - timestamp > CACHE_TTL_STANDARD) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => {
    kodeDataCache.delete(key);
    kodeDataCacheMeta.delete(key);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  });
}

export function clearAllCache() {
  kodeDataCache.clear();
  kodeDataCacheMeta.clear();

  if (typeof localStorage === "undefined") return;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.includes("kode")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function getTodayCacheInfo(floorId = "") {
  const key = buildCacheKey(getLocalDateString(), floorId);
  if (!kodeDataCacheMeta.has(key)) return null;

  return {
    key,
    timestamp: kodeDataCacheMeta.get(key),
  };
}

function processPenjualanData(docs) {
  const processedData = { active: [], mutated: [] };

  docs.forEach((snap) => {
    const data = { id: snap.id, ...snap.data() };
    if (data.jenisPenjualan !== "manual" || !Array.isArray(data.items)) return;

    data.items.forEach((item, index) => {
      const kodeRaw = item?.kodeText;
      if (!kodeRaw || kodeRaw === "-" || !kodeRaw.trim()) return;

      const kode = kodeRaw.trim();
      const resolved = resolveCategoryFromPrefix(kode, item.nama);

      processedData.active.push({
        id: `${data.id}_${index}`,
        kode,
        nama: item.nama || "Tidak ada nama",
        kadar: item.kadar || "-",
        berat: item.berat || 0,
        tanggalInput: data.tanggal || formatTimestamp(data.timestamp),
        keterangan: item.keterangan || "",
        mainCat: resolved.mainCat,
        detailType: resolved.detailType,
        jenisPrefix: resolved.jenisPrefix,
        jenisNama: resolved.jenisNama,
        penjualanId: data.id,
        isMutated: false,
        tanggalMutasi: null,
        mutasiKeterangan: "",
        mutasiHistory: [],
        timestamp: data.timestamp,
        lastUpdated: data.timestamp,
        sales: data.sales || "",
        hargaPerGram: item.hargaPerGram || 0,
        totalHarga: item.totalHarga || 0,
      });
    });
  });

  return processedData;
}

function processMutasiKodeData(docs) {
  const processedData = { active: [], mutated: [] };

  docs.forEach((snap) => {
    const data = { id: snap.id, ...snap.data() };
    if (!data.namaBarang) return;

    const kode = String(data.kode || "").trim() || "-";
    const resolved = resolveCategoryFromPrefix(kode, data.namaBarang, data.jenisPrefix || "");

    const resolvedMainCat = data.mainCat || resolved.mainCat;
    const resolvedDetailType = data.detailType || resolved.detailType;
    const resolvedPrefix = data.jenisPrefix || resolved.jenisPrefix;
    const resolvedJenisNama = data.jenisNama || resolved.jenisNama;

    const kodeItem = {
      id: data.id,
      kode,
      nama: data.namaBarang || "Tidak ada nama",
      kadar: data.kadar || "-",
      berat: data.berat || 0,
      tanggalInput: data.tanggalInput || formatTimestamp(data.timestamp || data.createdAt),
      keterangan: data.keterangan || "",
      mainCat: resolvedMainCat,
      detailType: resolvedDetailType,
      jenisPrefix: resolvedPrefix,
      jenisNama: resolvedJenisNama,
      penjualanId: data.penjualanId || data.id,
      isMutated: data.isMutated || false,
      tanggalMutasi: data.tanggalMutasi || null,
      mutasiKeterangan: data.mutasiKeterangan || "",
      mutasiHistory: data.mutasiHistory || [],
      timestamp: data.timestamp || data.createdAt,
      lastUpdated: data.lastUpdated || data.timestamp || data.createdAt,
      sales: data.sales || "",
      hargaPerGram: data.hargaPerGram || 0,
      totalHarga: data.totalHarga || 0,
    };

    if (kodeItem.isMutated) {
      processedData.mutated.push(kodeItem);
    } else {
      processedData.active.push(kodeItem);
    }
  });

  return processedData;
}

async function loadFromPenjualanAksesoris(floorId = "") {
  const penjualanQuery = query(
    floorCollection(db, "penjualanAksesoris", floorId),
    where("jenisPenjualan", "==", "manual"),
    orderBy("timestamp", "desc"),
  );

  const querySnapshot = await getDocs(penjualanQuery);
  if (querySnapshot.empty) return null;

  const processedData = processPenjualanData(querySnapshot.docs);
  const totalItems = processedData.active.length + processedData.mutated.length;
  if (totalItems === 0) return null;

  return {
    data: processedData,
    source: "penjualanAksesoris",
  };
}

async function loadFromMutasiKode(floorId = "") {
  const mutasiQuery = query(floorCollection(db, "mutasiKode", floorId), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(mutasiQuery);

  if (querySnapshot.empty) {
    return {
      data: { active: [], mutated: [] },
      source: "mutasiKode",
    };
  }

  return {
    data: processMutasiKodeData(querySnapshot.docs),
    source: "mutasiKode",
  };
}

export function sortKodeData(data) {
  data.active.sort((a, b) => {
    const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : parseDateDDMMYYYY(a.tanggalInput);
    const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : parseDateDDMMYYYY(b.tanggalInput);
    return timeB - timeA;
  });

  data.mutated.sort((a, b) => {
    let timeA = new Date(0);
    let timeB = new Date(0);

    if (a.lastUpdated?.toDate) timeA = a.lastUpdated.toDate();
    else if (a.tanggalMutasi) timeA = parseDateDDMMYYYY(a.tanggalMutasi);
    else if (a.tanggalInput) timeA = parseDateDDMMYYYY(a.tanggalInput);

    if (b.lastUpdated?.toDate) timeB = b.lastUpdated.toDate();
    else if (b.tanggalMutasi) timeB = parseDateDDMMYYYY(b.tanggalMutasi);
    else if (b.tanggalInput) timeB = parseDateDDMMYYYY(b.tanggalInput);

    return timeB - timeA;
  });
}

export function filterKodeData(data, jenisFilter, searchText) {
  const queryText = (searchText || "").toLowerCase();
  const filterUpper = (jenisFilter || "").toUpperCase();
  const defs = getDynamicCategoryDefinitions();

  return (data || []).filter((item) => {
    if (filterUpper) {
      const itemPrefix = String(item.jenisPrefix || "").toUpperCase();
      const itemMainCat = String(item.mainCat || "").toUpperCase();

      const matchesPrefix = itemPrefix === filterUpper || itemPrefix.startsWith(filterUpper);
      const matchesMainCat = itemMainCat === filterUpper;

      let matchesSingleLetter = false;
      if (filterUpper.length === 1) {
        const targetCatDef = Object.entries(defs).find(([_, def]) =>
          def.prefixes.includes(filterUpper),
        );
        if (targetCatDef && itemMainCat === targetCatDef[0]) {
          matchesSingleLetter = true;
        }
      }

      if (!matchesPrefix && !matchesMainCat && !matchesSingleLetter) return false;
    }

    if (queryText) {
      const matchesKode = String(item.kode || "")
        .toLowerCase()
        .includes(queryText);
      const matchesNama = String(item.nama || "")
        .toLowerCase()
        .includes(queryText);
      if (!matchesKode && !matchesNama) return false;
    }
    return true;
  });
}

export async function fetchKodeData({ forceRefresh = false, floorId = "" } = {}) {
  const today = getLocalDateString();
  const cacheKey = buildCacheKey(today, floorId);

  if (!forceRefresh && isCacheValid(cacheKey)) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      const data = cloneData(cached.data);
      sortKodeData(data);
      return {
        data,
        source: cached.source,
        fromCache: true,
      };
    }
  }

  try {
    let loaded = await loadFromMutasiKode(floorId);
    if (!loaded || (loaded.data.active.length === 0 && loaded.data.mutated.length === 0)) {
      const fallback = await loadFromPenjualanAksesoris(floorId);
      if (fallback) loaded = fallback;
    }

    const finalData = loaded?.data || { active: [], mutated: [] };
    const source = loaded?.source || "mutasiKode";

    sortKodeData(finalData);
    saveToCache(finalData, source, cacheKey);

    return {
      data: cloneData(finalData),
      source,
      fromCache: false,
    };
  } catch (error) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      const data = cloneData(cached.data);
      sortKodeData(data);
      return {
        data,
        source: cached.source,
        fromCache: true,
      };
    }
    throw error;
  }
}

function handlePenjualanChanges(baseData, changes) {
  changes.forEach((change) => {
    const docData = { id: change.doc.id, ...change.doc.data() };

    if (change.type === "added" || change.type === "modified") {
      if (docData.jenisPenjualan !== "manual" || !Array.isArray(docData.items)) return;

      docData.items.forEach((item, index) => {
        if (!item?.kodeText || item.kodeText === "-") return;

        const itemId = `${docData.id}_${index}`;
        const kode = item.kodeText.trim();
        const resolved = resolveCategoryFromPrefix(kode, item.nama);

        const kodeItem = {
          id: itemId,
          kode,
          nama: item.nama || "Tidak ada nama",
          kadar: item.kadar || "-",
          berat: item.berat || 0,
          tanggalInput: docData.tanggal || formatTimestamp(docData.timestamp),
          keterangan: item.keterangan || "",
          mainCat: resolved.mainCat,
          detailType: resolved.detailType,
          jenisPrefix: resolved.jenisPrefix,
          jenisNama: resolved.jenisNama,
          penjualanId: docData.id,
          isMutated: false,
          tanggalMutasi: null,
          mutasiKeterangan: "",
          mutasiHistory: [],
          timestamp: docData.timestamp,
          lastUpdated: docData.timestamp,
          sales: docData.sales || "",
          hargaPerGram: item.hargaPerGram || 0,
          totalHarga: item.totalHarga || 0,
        };

        const existingIndex = baseData.active.findIndex((i) => i.id === itemId);
        if (existingIndex >= 0) {
          baseData.active[existingIndex] = kodeItem;
        } else {
          baseData.active.unshift(kodeItem);
        }
      });
    } else if (change.type === "removed") {
      baseData.active = baseData.active.filter((item) => !item.id.startsWith(`${docData.id}_`));
    }
  });
}

function handleMutasiKodeChanges(baseData, changes) {
  changes.forEach((change) => {
    const docData = { id: change.doc.id, ...change.doc.data() };
    const kode = String(docData.kode || "").trim() || "-";
    const resolved = resolveCategoryFromPrefix(kode, docData.namaBarang, docData.jenisPrefix || "");

    const resolvedMainCat = docData.mainCat || resolved.mainCat;
    const resolvedDetailType = docData.detailType || resolved.detailType;
    const resolvedPrefix = docData.jenisPrefix || resolved.jenisPrefix;
    const resolvedJenisNama = docData.jenisNama || resolved.jenisNama;

    const kodeItem = {
      id: docData.id,
      kode,
      nama: docData.namaBarang || "Tidak ada nama",
      kadar: docData.kadar || "-",
      berat: docData.berat || 0,
      tanggalInput: docData.tanggalInput || formatTimestamp(docData.timestamp || docData.createdAt),
      keterangan: docData.keterangan || "",
      mainCat: resolvedMainCat,
      detailType: resolvedDetailType,
      jenisPrefix: resolvedPrefix,
      jenisNama: resolvedJenisNama,
      penjualanId: docData.penjualanId || docData.id,
      isMutated: docData.isMutated || false,
      tanggalMutasi: docData.tanggalMutasi || null,
      mutasiKeterangan: docData.mutasiKeterangan || "",
      mutasiHistory: docData.mutasiHistory || [],
      timestamp: docData.timestamp || docData.createdAt,
      lastUpdated: docData.lastUpdated || docData.timestamp || docData.createdAt,
      sales: docData.sales || "",
      hargaPerGram: docData.hargaPerGram || 0,
      totalHarga: docData.totalHarga || 0,
    };

    if (change.type === "removed") {
      baseData.active = baseData.active.filter((item) => item.id !== docData.id);
      baseData.mutated = baseData.mutated.filter((item) => item.id !== docData.id);
      return;
    }

    const targetArray = kodeItem.isMutated ? baseData.mutated : baseData.active;
    const otherArray = kodeItem.isMutated ? baseData.active : baseData.mutated;

    const otherIndex = otherArray.findIndex((item) => item.id === docData.id);
    if (otherIndex >= 0) {
      otherArray.splice(otherIndex, 1);
    }

    const targetIndex = targetArray.findIndex((item) => item.id === docData.id);
    if (targetIndex >= 0) {
      targetArray[targetIndex] = kodeItem;
    } else {
      targetArray.unshift(kodeItem);
    }
  });
}

export function setupRealtimeListener({ source, initialData, onUpdate, onError, floorId = "" }) {
  const currentData = cloneData(initialData || { active: [], mutated: [] });

  const todayCacheKey = buildCacheKey(getLocalDateString(), floorId);
  const runUpdate = () => {
    sortKodeData(currentData);
    saveToCache(currentData, source, todayCacheKey);
    onUpdate(cloneData(currentData));
  };

  if (source === "penjualanAksesoris") {
    const penjualanQuery = query(
      floorCollection(db, "penjualanAksesoris", floorId),
      where("jenisPenjualan", "==", "manual"),
      orderBy("timestamp", "desc"),
    );

    return onSnapshot(
      penjualanQuery,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        if (currentData.active.length === 0 && currentData.mutated.length === 0) {
          const processed = processPenjualanData(snapshot.docs);
          currentData.active = processed.active;
          currentData.mutated = processed.mutated;
        } else {
          handlePenjualanChanges(currentData, snapshot.docChanges());
        }
        runUpdate();
      },
      (error) => onError?.(error),
    );
  }

  const mutasiQuery = query(floorCollection(db, "mutasiKode", floorId), orderBy("timestamp", "desc"));
  return onSnapshot(
    mutasiQuery,
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;

      if (currentData.active.length === 0 && currentData.mutated.length === 0) {
        const processed = processMutasiKodeData(snapshot.docs);
        currentData.active = processed.active;
        currentData.mutated = processed.mutated;
      } else {
        handleMutasiKodeChanges(currentData, snapshot.docChanges());
      }
      runUpdate();
    },
    (error) => onError?.(error),
  );
}

export async function mutateSelectedKodes({
  selectedItems,
  currentDataSource,
  tanggalMutasi,
  keteranganMutasi,
  floorId = "",
  petugas = "Staff",
}) {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) return;

  const currentTimestamp = Timestamp.now();

  const deltas = selectedItems.map((item) => {
    const resolved = resolveCategoryFromPrefix(item.kode, item.nama, item.jenisPrefix);
    return {
      mainCat: item.mainCat || resolved.mainCat,
      detailType: item.detailType || resolved.detailType,
      diff: -1,
      barcode: item.kode && item.kode !== "-" ? String(item.kode).trim().toUpperCase() : undefined,
      sales: item.sales || petugas,
      keterangan: item.keterangan ? `Catatan Barang: ${item.keterangan}` : "",
      nama: item.nama || "",
    };
  });

  const mainKeterangan = keteranganMutasi
    ? `Mutasi Kode (${keteranganMutasi})`
    : "Mutasi Kode (Pindah ke Sudah Dimutasi)";

  await runTransaction(db, async (t) => {
    // 1. Kurangi stok manual di stocks/manual dan dailyStockLogs secara atomik
    await batchAdjustManualStock({
      floorId,
      deltas,
      petugas,
      keterangan: mainKeterangan,
      transaction: t,
    });

    // 2. Update dokumen mutasiKode (isMutated: true) dan hapus dari koleksi barcodes
    for (const item of selectedItems) {
      const mutasiHistory = {
        tanggal: tanggalMutasi,
        status: "Mutasi",
        keterangan: keteranganMutasi,
        timestamp: currentTimestamp,
      };

      const updateData = {
        isMutated: true,
        tanggalMutasi,
        mutasiKeterangan: keteranganMutasi,
        mutasiHistory: [mutasiHistory, ...(item.mutasiHistory || [])],
        lastUpdated: serverTimestamp(),
      };

      if (currentDataSource === "mutasiKode") {
        const floorRef = floorDoc(db, "mutasiKode", item.id, floorId);
        t.update(floorRef, updateData);
      } else {
        const newMutasiData = {
          kode: item.kode,
          namaBarang: item.nama,
          kadar: item.kadar || "-",
          berat: item.berat || 0,
          tanggalInput: item.tanggalInput || formatTimestamp(item.timestamp),
          keterangan: item.keterangan || "",
          penjualanId: item.penjualanId || item.id,
          sales: item.sales || "",
          hargaPerGram: item.hargaPerGram || 0,
          totalHarga: item.totalHarga || 0,
          sourceTransactionId: item.penjualanId || item.id,
          timestamp: serverTimestamp(),
          ...updateData,
        };
        const floorRef = doc(floorCollection(db, "mutasiKode", floorId));
        t.set(floorRef, newMutasiData, { merge: true });
      }

      // Hapus barcode dari lokasi manual di koleksi barcodes
      if (item.kode && item.kode !== "-") {
        const cleanBarcode = String(item.kode).trim().toUpperCase();
        const barcodeRef = floorDoc(db, "barcodes", cleanBarcode, floorId);
        t.delete(barcodeRef);
      }
    }
  });
}

export async function restoreSelectedKodes(selectedItems, floorId = "", petugas = "Staff") {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) return;

  const currentTimestamp = Timestamp.now();
  const formattedDate = getCurrentDateDDMMYYYY();

  const deltas = selectedItems.map((item) => {
    const resolved = resolveCategoryFromPrefix(item.kode, item.nama, item.jenisPrefix);
    return {
      mainCat: item.mainCat || resolved.mainCat,
      detailType: item.detailType || resolved.detailType,
      diff: 1,
      barcode: item.kode && item.kode !== "-" ? String(item.kode).trim().toUpperCase() : undefined,
      sales: item.sales || petugas,
      keterangan: "Kembalikan Kode ke Status Aktif",
      nama: item.nama || "",
    };
  });

  await runTransaction(db, async (t) => {
    // 1. Tambah stok manual di stocks/manual dan dailyStockLogs secara atomik
    await batchAdjustManualStock({
      floorId,
      deltas,
      petugas,
      keterangan: "Kembalikan Kode ke Status Aktif",
      transaction: t,
    });

    // 2. Update dokumen mutasiKode (isMutated: false) dan daftarkan kembali ke koleksi barcodes
    for (const item of selectedItems) {
      const restoreHistory = {
        tanggal: formattedDate,
        status: "Dikembalikan",
        keterangan: "Kode dikembalikan ke status aktif",
        timestamp: currentTimestamp,
      };

      const floorRef = floorDoc(db, "mutasiKode", item.id, floorId);
      t.update(floorRef, {
        isMutated: false,
        mutasiHistory: [restoreHistory, ...(item.mutasiHistory || [])],
        lastUpdated: serverTimestamp(),
      });

      if (item.kode && item.kode !== "-") {
        const cleanBarcode = String(item.kode).trim().toUpperCase();
        const resolved = resolveCategoryFromPrefix(cleanBarcode, item.nama, item.jenisPrefix);
        const barcodeRef = floorDoc(db, "barcodes", cleanBarcode, floorId);
        t.set(
          barcodeRef,
          {
            barcode: cleanBarcode,
            category: resolved.mainCat,
            detailType: resolved.detailType || null,
            location: "manual",
            in_display: false,
            in_mutasi: false,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  });
}

export async function verifyDeleteMutasiKodePassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) return verifyStoredSecret(inputPassword, "smlt116");

  const data = snap.data() || {};
  const stored = data.deleteMutasiKode ?? data.deleteDataPenjualan ?? data.supervisorPassword ?? "smlt116";
  return verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true });
}

export async function deleteSelectedKodes(selectedItems, floorId = "", petugas = "Supervisor") {
  if (!Array.isArray(selectedItems) || selectedItems.length === 0) return;

  const deltas = selectedItems.map((item) => {
    const resolved = resolveCategoryFromPrefix(item.kode, item.nama, item.jenisPrefix);
    return {
      mainCat: item.mainCat || resolved.mainCat,
      detailType: item.detailType || resolved.detailType,
      diff: -1,
      barcode: item.kode && item.kode !== "-" ? String(item.kode).trim().toUpperCase() : undefined,
      sales: item.sales || petugas,
      keterangan: item.keterangan || "Hapus dari Mutasi Kode",
      nama: item.nama || "",
    };
  });

  await runTransaction(db, async (t) => {
    // 1. Adjust stocks/manual and dailyStockLogs atomically (1 Read + 1 Write)
    await batchAdjustManualStock({
      floorId,
      deltas,
      petugas,
      keterangan: "Hapus dari Mutasi Kode",
      transaction: t,
    });

    // 2. Delete mutasiKode and barcodes documents in the same transaction
    for (const item of selectedItems) {
      const floorRef = floorDoc(db, "mutasiKode", item.id, floorId);
      t.delete(floorRef);

      if (item.kode && item.kode !== "-") {
        const cleanBarcode = String(item.kode).trim().toUpperCase();
        const barcodeRef = floorDoc(db, "barcodes", cleanBarcode, floorId);
        t.delete(barcodeRef);
      }
    }
  });
}
export function exportToExcel(data, filename, sheetName, currentDataSource) {
  const exportData = (data || []).map((item) => ({
    Kode: item.kode,
    Sales: item.sales || "-",
    "Nama Barang": item.nama,
    Kadar: item.kadar,
    Berat: item.berat,
    "Tanggal Input": item.tanggalInput,
    Status: item.isMutated ? "Sudah Dimutasi" : "Belum Dimutasi",
    "Tanggal Mutasi": item.tanggalMutasi || "-",
    "Keterangan Mutasi": item.mutasiKeterangan || "-",
    Keterangan: item.keterangan,
    "Sumber Data": currentDataSource === "penjualanAksesoris" ? "Live" : "Arsip",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 7 },
    { wch: 7 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 25 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Data");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
}
