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

const CACHE_KEY = "kodeDataCache";
const CACHE_TTL_STANDARD = 60 * 60 * 1000;
const CACHE_TTL_TODAY = 5 * 60 * 1000;
const CACHE_VERSION = "v4.0";
const SAVE_DEBOUNCE_MS = 1000;
const MAX_STORAGE_SIZE = 4 * 1024 * 1024;

export const JENIS_BARANG = {
  C: "Cincin",
  K: "Kalung",
  L: "Liontin",
  A: "Anting",
  G: "Gelang",
  S: "Giwang",
  Z: "HALA & SDW",
  V: "HALA & SDW",
};

// Coba deteksi prefix jenis barang dari nama produk jika kode tidak memiliki prefix yang valid
function detectPrefixFromNama(nama) {
  const text = String(nama || "").toLowerCase();
  if (!text) return null;

  // Periksa apakah nama mengandung salah satu label jenis barang
  for (const [key, label] of Object.entries(JENIS_BARANG)) {
    if (!label) continue;
    const token = String(label).toLowerCase();
    if (token && text.includes(token)) return key;
  }

  // Coba beberapa kata kunci pendek (mis. 'kalung', 'liontin', 'cincin') untuk akurasi
  const keywords = {
    C: ["cincin"],
    K: ["kalung"],
    L: ["liontin"],
    A: ["anting"],
    G: ["gelang"],
    S: ["giwang"],
    Z: ["hala", "sdw"],
    V: ["hala", "sdw"],
  };

  for (const [key, keys] of Object.entries(keywords)) {
    for (const k of keys) {
      if (text.includes(k)) return key;
    }
  }

  return null;
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
      let prefix = kode.charAt(0).toUpperCase();
      const detectedFromName = detectPrefixFromNama(item.nama);

      if (!(prefix in JENIS_BARANG)) {
        if (detectedFromName) prefix = detectedFromName;
        else prefix = "LAIN"; // tetap masukkan data, beri label Lainnya
      }

      const jenisNama = JENIS_BARANG[prefix] || (detectedFromName ? JENIS_BARANG[detectedFromName] : "Lainnya");

      processedData.active.push({
        id: `${data.id}_${index}`,
        kode,
        nama: item.nama || "Tidak ada nama",
        kadar: item.kadar || "-",
        berat: item.berat || 0,
        tanggalInput: data.tanggal || formatTimestamp(data.timestamp),
        keterangan: item.keterangan || "",
        jenisPrefix: prefix,
        jenisNama,
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
    const kodePrefix = kode !== "-" ? kode.charAt(0).toUpperCase() : "";
    const explicitPrefix = String(data.jenisPrefix || "")
      .trim()
      .toUpperCase();

    let resolvedPrefix = explicitPrefix;
    const detectedFromName = detectPrefixFromNama(data.namaBarang);
    if (!resolvedPrefix) {
      if (kodePrefix && kodePrefix in JENIS_BARANG) resolvedPrefix = kodePrefix;
      else resolvedPrefix = detectedFromName || "LAIN";
    }

    const resolvedJenisNama =
      data.jenisNama || JENIS_BARANG[resolvedPrefix] || (detectedFromName ? JENIS_BARANG[detectedFromName] : "Lainnya");

    const kodeItem = {
      id: data.id,
      kode,
      nama: data.namaBarang || "Tidak ada nama",
      kadar: data.kadar || "-",
      berat: data.berat || 0,
      tanggalInput: data.tanggalInput || formatTimestamp(data.timestamp || data.createdAt),
      keterangan: data.keterangan || "",
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

  return (data || []).filter((item) => {
    if (jenisFilter && item.jenisPrefix !== jenisFilter) return false;
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
        let prefix = item.kodeText.charAt(0).toUpperCase();
        const detectedFromName = detectPrefixFromNama(item.nama);
        if (!(prefix in JENIS_BARANG)) {
          if (detectedFromName) prefix = detectedFromName;
          else prefix = "LAIN";
        }

        const jenisNama = JENIS_BARANG[prefix] || (detectedFromName ? JENIS_BARANG[detectedFromName] : "Lainnya");

        const kodeItem = {
          id: itemId,
          kode: item.kodeText.trim(),
          nama: item.nama || "Tidak ada nama",
          kadar: item.kadar || "-",
          berat: item.berat || 0,
          tanggalInput: docData.tanggal || formatTimestamp(docData.timestamp),
          keterangan: item.keterangan || "",
          jenisPrefix: prefix,
          jenisNama,
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
    const prefix = docData.kode?.charAt(0).toUpperCase();
    // Jika prefix tidak valid, coba deteksi dari jenisPrefix eksplisit atau nama barang
    let resolvedPrefix = String(docData.jenisPrefix || "")
      .trim()
      .toUpperCase();
    if (!resolvedPrefix) {
      const kodePrefix = prefix || "";
      if (kodePrefix && kodePrefix in JENIS_BARANG) resolvedPrefix = kodePrefix;
      else resolvedPrefix = detectPrefixFromNama(docData.namaBarang) || "LAIN";
    }

    const resolvedJenisNama = docData.jenisNama || JENIS_BARANG[resolvedPrefix] || "Lainnya";

    const kodeItem = {
      id: docData.id,
      kode: docData.kode,
      nama: docData.namaBarang || "Tidak ada nama",
      kadar: docData.kadar || "-",
      berat: docData.berat || 0,
      tanggalInput: docData.tanggalInput || formatTimestamp(docData.timestamp || docData.createdAt),
      keterangan: docData.keterangan || "",
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
}) {
  const currentTimestamp = Timestamp.now();

  const updatePromises = selectedItems.map(async (item) => {
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
      await updateDoc(floorRef, updateData);
      return;
    }

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
    await setDoc(floorRef, newMutasiData, { merge: true });
  });

  await Promise.all(updatePromises);
}

export async function restoreSelectedKodes(selectedItems, floorId = "") {
  const currentTimestamp = Timestamp.now();
  const formattedDate = getCurrentDateDDMMYYYY();

  await Promise.all(
    selectedItems.map((item) => {
      const restoreHistory = {
        tanggal: formattedDate,
        status: "Dikembalikan",
        keterangan: "Kode dikembalikan ke status aktif",
        timestamp: currentTimestamp,
      };

      const floorRef = floorDoc(db, "mutasiKode", item.id, floorId);
      return updateDoc(floorRef, {
        isMutated: false,
        mutasiHistory: [restoreHistory, ...(item.mutasiHistory || [])],
        lastUpdated: serverTimestamp(),
      });
    }),
  );
}

export async function verifyDeleteMutasiKodePassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) return verifyStoredSecret(inputPassword, "smlt116");

  const data = snap.data() || {};
  const stored = data.deleteMutasiKode ?? data.deleteDataPenjualan ?? data.supervisorPassword ?? "smlt116";
  return verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true });
}

export async function deleteSelectedKodes(selectedItems, floorId = "") {
  await Promise.all(
    selectedItems.map((item) => {
      const floorRef = floorDoc(db, "mutasiKode", item.id, floorId);
      return deleteDoc(floorRef);
    }),
  );
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
