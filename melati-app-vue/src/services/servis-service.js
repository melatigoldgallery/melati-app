/**
 * Servis Service
 * Collection: servis
 * Also reads: settings/passwords
 */
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  collection,
  Timestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/config/firebase";
import { verifyStoredSecret } from "@/utils/security";
import { floorDoc } from "@/services/floor-scope";

// ── Constants ─────────────────────────────────────────────────────────────

export const JENIS_SERVIS_OPTIONS = [
  "GRAFIR",
  "PATRI",
  "LASER",
  "CUCI",
  "PASANG BATU",
  "TAMBAH RING",
  "CHROME GOLD",
  "CHROME SELEB",
  "CHROME PUTIH",
  "CHROME ROSE",
];

export const STATUS_PEMBAYARAN_OPTIONS = [
  { value: "nominal", label: "LUNAS" },
  { value: "belum_lunas", label: "BELUM LUNAS" },
  { value: "free", label: "GRATIS" },
  { value: "custom", label: "CUSTOM" },
];

export const STATUS_PEMBAYARAN_CUSTOM = [
  { value: "nominal", label: "LUNAS" },
  { value: "custom", label: "CUSTOM" },
];

// ── Cache Helpers ─────────────────────────────────────────────────────────

const CACHE_PREFIX = "servisCache_";
const TTL_CURRENT = 5 * 60 * 1000;
const TTL_FUTURE = 2 * 60 * 60 * 1000;

function _cacheTTL(year, month) {
  const now = new Date();
  const isNow = year === now.getFullYear() && month === now.getMonth() + 1;
  const isFuture = new Date(year, month - 1) > now;
  if (isFuture) return TTL_FUTURE;
  if (isNow) return TTL_CURRENT;
  return null; // past = permanent
}

function _cacheKey(year, month) {
  return `${CACHE_PREFIX}${year}_${String(month).padStart(2, "0")}`;
}

export function getCachedServis(year, month) {
  const raw = sessionStorage.getItem(_cacheKey(year, month));
  if (!raw) return null;
  const { data, savedAt, ttl } = JSON.parse(raw);
  if (ttl !== null && Date.now() - savedAt > ttl) {
    sessionStorage.removeItem(_cacheKey(year, month));
    return null;
  }
  return data;
}

export function setCachedServis(year, month, data) {
  sessionStorage.setItem(
    _cacheKey(year, month),
    JSON.stringify({ data, savedAt: Date.now(), ttl: _cacheTTL(year, month) }),
  );
}

export function invalidateCachedServis(year, month) {
  sessionStorage.removeItem(_cacheKey(year, month));
}

// ── Date Helpers ──────────────────────────────────────────────────────────

export function getMonthDateRange(year, month) {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function _buildMonthQuery(year, month) {
  const { startDate, endDate } = getMonthDateRange(year, month);
  return query(
    collection(db, "servis"),
    where("tanggal", ">=", startDate),
    where("tanggal", "<=", endDate),
    orderBy("tanggal", "desc"),
  );
}

// ── Fetch (one-shot, for past months + laporan) ───────────────────────────

export async function fetchServisByMonth(year, month) {
  const docs = await getDocs(_buildMonthQuery(year, month)).then((s) => s.docs);
  return docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchServisByRange(startDate, endDate) {
  const q = query(
    collection(db, "servis"),
    where("tanggal", ">=", startDate),
    where("tanggal", "<=", endDate + "T23:59:59.999Z"),
    orderBy("tanggal", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── onSnapshot (real-time, for current month in DataServis) ───────────────

export function subscribeServisByMonth(year, month, callback) {
  return onSnapshot(_buildMonthQuery(year, month), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeServisByRange(startDate, endDate, callback) {
  const q = query(
    collection(db, "servis"),
    where("tanggal", ">=", startDate),
    where("tanggal", "<=", endDate + "T23:59:59.999Z"),
    orderBy("tanggal", "desc"),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────

/**
 * Save new servis. Returns the new document ID.
 * @param {Object} data - All fields EXCEPT createdAt/updatedAt/statusServis/statusPengambilan
 */
function notifyServisDataChanged() {
  try {
    localStorage.setItem("servisDataChanged", JSON.stringify({ ts: Date.now() }));
  } catch {
    // Ignore storage access issues in non-browser or restricted environments.
  }
}

export async function saveServis(data, floorId = "") {
  const ref = doc(collection(db, "servis"));
  await setDoc(
    ref,
    {
      ...data,
      floorId: floorId || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      statusServis: "Belum Selesai",
      statusPengambilan: "Belum Diambil",
      statusPenerimaanServis: "Belum Diterima",
      penerimaServis: null,
      waktuPenerimaan: null,
      buktiPenerimaanUrl: null,
      buktiPenerimaanPath: null,
      buktiPenerimaanLiteUrl: null,
      buktiPenerimaanLitePath: null,
      stafHandle: null,
      waktuPengambilan: null,
    },
    { merge: true },
  );
  notifyServisDataChanged();
  return ref.id;
}

export async function updateServisStatus(id, updates) {
  const docRef = doc(db, "servis", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
  notifyServisDataChanged();
}

export async function bulkMarkServisSelesai(ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return 0;

  // Firestore batched writes are limited to 500 operations per commit.
  const chunkSize = 450;
  let updatedCount = 0;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const updatedAt = Timestamp.now();

    chunk.forEach((id) => {
      batch.update(doc(db, "servis", id), {
        statusServis: "Sudah Selesai",
        updatedAt,
      });
    });

    await batch.commit();
    updatedCount += chunk.length;
  }

  notifyServisDataChanged();
  return updatedCount;
}

export async function bulkMarkServisSudahDiambil(ids = [], payload = {}) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return 0;

  // Firestore batched writes are limited to 500 operations per commit.
  const chunkSize = 450;
  let updatedCount = 0;
  const normalizedPayload = {};

  if (payload && typeof payload === "object") {
    Object.entries(payload).forEach(([key, value]) => {
      if (key === "updatedAt") return;
      if (value === undefined) return;
      normalizedPayload[key] = value;
    });
  }

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const updatedAt = Timestamp.now();
    const waktuPengambilan = normalizedPayload.waktuPengambilan || new Date().toISOString();
    const updates = {
      ...normalizedPayload,
      statusPengambilan: "Sudah Diambil",
      waktuPengambilan,
      updatedAt,
    };

    chunk.forEach((id) => {
      batch.update(doc(db, "servis", id), updates);
    });

    await batch.commit();
    updatedCount += chunk.length;
  }

  notifyServisDataChanged();
  return updatedCount;
}

export async function bulkMarkServisPenerimaan(ids = [], payload = {}) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return 0;

  const chunkSize = 450;
  let updatedCount = 0;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const updatedAt = Timestamp.now();

    chunk.forEach((id) => {
      const logRef = doc(collection(db, "servis", id, "penerimaanServis"));
      batch.set(logRef, {
        penerima: payload.penerimaServis || null,
        waktu: payload.waktuPenerimaan || new Date().toISOString(),
        catatan: payload.catatan || "",
        buktiUrl: payload.buktiPenerimaanUrl || null,
        buktiPath: payload.buktiPenerimaanPath || null,
        buktiLiteUrl: payload.buktiPenerimaanLiteUrl || null,
        buktiLitePath: payload.buktiPenerimaanLitePath || null,
        createdBy: payload.createdBy || null,
        createdAt: Timestamp.now(),
      });

      batch.update(doc(db, "servis", id), {
        statusPenerimaanServis: "Sudah Diterima",
        statusServis: "Sudah Selesai",
        penerimaServis: payload.penerimaServis || null,
        waktuPenerimaan: payload.waktuPenerimaan || new Date().toISOString(),
        buktiPenerimaanUrl: payload.buktiPenerimaanUrl || null,
        buktiPenerimaanPath: payload.buktiPenerimaanPath || null,
        buktiPenerimaanLiteUrl: payload.buktiPenerimaanLiteUrl || null,
        buktiPenerimaanLitePath: payload.buktiPenerimaanLitePath || null,
        updatedAt,
      });
    });

    await batch.commit();
    updatedCount += chunk.length;
  }

  notifyServisDataChanged();
  return updatedCount;
}

export async function bulkFillPenerimaan(ids = [], payload = {}) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return 0;

  const chunkSize = 450;
  let updatedCount = 0;

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const updatedAt = Timestamp.now();
    const waktuPenerimaan = payload.waktuPenerimaan || new Date().toISOString();

    chunk.forEach((id) => {
      batch.update(doc(db, "servis", id), {
        penerimaServis: payload.penerimaServis || null,
        waktuPenerimaan,
        updatedAt,
      });
    });

    await batch.commit();
    updatedCount += chunk.length;
  }

  notifyServisDataChanged();
  return updatedCount;
}

export async function updateServisData(id, data) {
  const docRef = doc(db, "servis", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
  notifyServisDataChanged();
}

export async function deleteServis(id) {
  const docRef = doc(db, "servis", id);
  await deleteDoc(docRef);
  notifyServisDataChanged();
}

// ── Password Verification ─────────────────────────────────────────────────

export async function verifySupervisorPassword(inputPassword, floorId = "") {
  const snap = await getDoc(floorDoc(db, "settings", "passwords", floorId));
  if (!snap.exists()) throw new Error("Pengaturan password tidak ditemukan");
  const data = snap.data();
  // Field "deleteServis" is the primary password for servis edit/delete operations
  const stored = data.deleteServis ?? data.supervisorPassword;
  if (!stored) throw new Error("Password belum dikonfigurasi");
  const isValid = await verifyStoredSecret(inputPassword, stored, { allowLegacyBase64: true });
  if (!isValid) throw new Error("Password salah");
  return true;
}

// ── Print Service Integration ─────────────────────────────────────────────

const PRINT_BASE = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

function toDateObject(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
    if (value.seconds != null) {
      const date = new Date(Number(value.seconds) * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      const [, y, m, d] = ymd;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    const dmy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPrintDate(value) {
  const date = toDateObject(value);
  if (!date) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function addDays(value, days) {
  const date = toDateObject(value);
  if (!date) return null;
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

function normalizeServisPrintPayload(servisData) {
  const isCustom = servisData?.jenisInput === "custom";
  const detailRows = isCustom ? servisData?.detailBarangCustom || [] : servisData?.detailBarang || [];

  const fallbackRow = isCustom
    ? {
        jumlah: 1,
        namaBarang: servisData?.namaBarang || "",
        berat: servisData?.berat || "",
        panjang: servisData?.panjang || "",
        kadar: servisData?.kadar || "",
        warna: servisData?.warna || "",
        totalDP: Number(servisData?.totalDP || 0),
        ongkos: Number(servisData?.ongkos || servisData?.totalOngkos || 0),
        statusPembayaran: servisData?.statusPembayaran || "nominal",
        rincianServis: servisData?.rincianServis || "",
      }
    : {
        jumlah: 1,
        namaBarang: servisData?.namaBarang || "",
        berat: servisData?.berat || "",
        karat: servisData?.karat || "",
        jenisServis: servisData?.jenisServis || "",
        rincianServis: servisData?.rincianServis || "",
        ongkos: Number(servisData?.ongkos || servisData?.totalOngkos || 0),
        statusPembayaran: servisData?.statusPembayaran || "nominal",
      };

  const rows = detailRows.length ? detailRows : [fallbackRow];

  const items = rows.map((row) => {
    if (isCustom) {
      return {
        jumlah: Number(row?.jumlah || 1),
        namaBarang: row?.namaBarang || "",
        berat: row?.berat || "",
        panjang: row?.panjang || "",
        kadar: row?.kadar || "",
        warna: row?.warna || "",
        totalDP: Number(row?.totalDP || 0),
        ongkos: Number(row?.ongkos || 0),
        statusPembayaran: row?.statusPembayaran || "nominal",
        rincianServis: row?.rincianServis || "",
      };
    }

    return {
      jumlah: Number(row?.jumlah || 1),
      namaBarang: row?.namaBarang || "",
      berat: row?.berat || "",
      karat: row?.karat || "",
      jenisServis: row?.jenisServis || "",
      rincianServis: row?.rincianServis || "",
      ongkos: Number(row?.ongkos || 0),
      statusPembayaran: row?.statusPembayaran || "nominal",
    };
  });

  const totalOngkos = items.reduce((sum, item) => sum + Number(item?.ongkos || 0), 0);
  const totalDP = isCustom
    ? items.reduce((sum, item) => sum + Number(item?.totalDP || 0), 0)
    : Number(servisData?.totalDP || 0);
  const baseTanggal = servisData?.tanggal || servisData?.createdAt || servisData?.timestamp;
  const tanggalSelesaiSource = servisData?.tanggalSelesai || servisData?.estimasiSelesai || addDays(baseTanggal, 3);

  return {
    id: servisData?.id || "",
    tanggal: formatPrintDate(baseTanggal),
    tanggalSelesai: formatPrintDate(tanggalSelesaiSource),
    customerName: servisData?.customerName || servisData?.namaCustomer || "Pelanggan",
    customerPhone: servisData?.customerPhone || servisData?.noHp || "",
    salesName: servisData?.salesName || servisData?.namaSales || "",
    items,
    totalOngkos,
    totalDP,
    grandTotal: totalDP + totalOngkos,
  };
}

/**
 * Try to print via local print service (localhost:3001).
 * Throws if print service unreachable — caller should catch and show SweetAlert.
 */
export async function printServisSlip(servisData) {
  const isCustom = servisData.jenisInput === "custom";
  const endpoint = isCustom ? "/api/print/nota-custom" : "/api/print/nota-servis";
  const payload = normalizeServisPrintPayload(servisData);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${PRINT_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.error || body?.message || "";
      } catch {
        // ignore parse error
      }
      throw new Error(detail ? `Print service error: ${detail}` : `Print service error: ${res.status}`);
    }
  } catch (e) {
    clearTimeout(timeout);
    throw e; // caller handles with SweetAlert
  }
}

/**
 * Upload bukti pengambilan photo to Firebase Storage.
 * @param {File} file - Image file to upload
 * @param {string} servisId - Firestore document ID
 * @returns {{ url: string, path: string, liteUrl?: string, litePath?: string }}
 */
async function createLiteImageBlob(file, options = {}) {
  const maxSide = options.maxSide ?? 1280;
  const quality = options.quality ?? 0.78;

  if (!file?.type?.startsWith("image/")) return null;

  const img = await new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Gagal membaca gambar untuk kompresi"));
    };
    image.src = objectUrl;
  });

  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob || null), "image/jpeg", quality);
  });
}

export async function uploadBuktiPengambilan(file, servisId) {
  const timestamp = Date.now();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const fileName = `servis_${servisId}_${timestamp}.${ext}`;
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const storagePath = `bukti-pengambilan/${year}/${month}/${fileName}`;
  const sRef = storageRef(storage, storagePath);
  const uploaderUid = auth.currentUser?.uid || "";
  await uploadBytes(sRef, file, {
    contentType: file.type || "image/jpeg",
    customMetadata: { uploadedBy: uploaderUid },
  });
  const url = await getDownloadURL(sRef);

  let liteUrl;
  let litePath;
  try {
    const liteBlob = await createLiteImageBlob(file);
    if (liteBlob) {
      const liteFileName = `servis_${servisId}_${timestamp}_lite.jpg`;
      litePath = `bukti-pengambilan-lite/${year}/${month}/${liteFileName}`;
      const liteRef = storageRef(storage, litePath);
      await uploadBytes(liteRef, liteBlob, {
        contentType: "image/jpeg",
        customMetadata: { uploadedBy: uploaderUid },
      });
      liteUrl = await getDownloadURL(liteRef);
    }
  } catch (e) {
    console.warn("Upload foto lite gagal, lanjut pakai foto asli", e);
  }

  return { url, path: storagePath, liteUrl, litePath };
}

export async function uploadBuktiPenerimaanServis(file, servisId) {
  const timestamp = Date.now();
  const ext = file.type === "image/png" ? "png" : "jpg";
  const fileName = `servis_penerimaan_${servisId}_${timestamp}.${ext}`;
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const storagePath = `bukti-penerimaan-servis/${year}/${month}/${fileName}`;
  const sRef = storageRef(storage, storagePath);
  const uploaderUid = auth.currentUser?.uid || "";
  await uploadBytes(sRef, file, {
    contentType: file.type || "image/jpeg",
    customMetadata: { uploadedBy: uploaderUid },
  });
  const url = await getDownloadURL(sRef);

  let liteUrl;
  let litePath;
  try {
    const liteBlob = await createLiteImageBlob(file);
    if (liteBlob) {
      const liteFileName = `servis_penerimaan_${servisId}_${timestamp}_lite.jpg`;
      litePath = `bukti-penerimaan-servis-lite/${year}/${month}/${liteFileName}`;
      const liteRef = storageRef(storage, litePath);
      await uploadBytes(liteRef, liteBlob, {
        contentType: "image/jpeg",
        customMetadata: { uploadedBy: uploaderUid },
      });
      liteUrl = await getDownloadURL(liteRef);
    }
  } catch (e) {
    console.warn("Upload foto penerimaan lite gagal, lanjut pakai foto asli", e);
  }

  return { url, path: storagePath, liteUrl, litePath };
}

// ── Status Helpers ────────────────────────────────────────────────────────

export function statusServisBadge(status) {
  return status === "Sudah Selesai" ? "bg-success" : "bg-warning text-dark";
}

export function statusPengambilanBadge(status) {
  return status === "Sudah Diambil" ? "bg-success" : "bg-secondary";
}

export function statusPembayaranLabel(value) {
  const map = { nominal: "LUNAS", belum_lunas: "BELUM LUNAS", free: "GRATIS", custom: "CUSTOM" };
  return map[value] || value;
}

export function statusPembayaranBadge(value) {
  const map = {
    nominal: "bg-success",
    belum_lunas: "bg-danger",
    free: "bg-info text-dark",
    custom: "bg-warning text-dark",
  };
  return map[value] || "bg-secondary";
}

export function statusPenerimaanServisBadge(status) {
  return status === "Sudah Diterima" ? "bg-success" : "bg-secondary";
}
