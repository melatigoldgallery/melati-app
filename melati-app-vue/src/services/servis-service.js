/**
 * Servis Service
 * Collection: servis
 * Also reads: settings/passwords
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { verifyStoredSecret } from "@/utils/security";

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
  const snap = await getDocs(_buildMonthQuery(year, month));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchServisByRange(startDate, endDate) {
  const q = query(
    collection(db, "servis"),
    where("tanggal", ">=", startDate),
    where("tanggal", "<=", endDate + "T23:59:59.999Z"),
    orderBy("tanggal", "asc"),
    limit(500),
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
export async function saveServis(data) {
  const ref = await addDoc(collection(db, "servis"), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    statusServis: "Belum Selesai",
    statusPengambilan: "Belum Diambil",
    stafHandle: null,
    waktuPengambilan: null,
  });
  return ref.id;
}

export async function updateServisStatus(id, updates) {
  await updateDoc(doc(db, "servis", id), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function updateServisData(id, data) {
  await updateDoc(doc(db, "servis", id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteServis(id) {
  await deleteDoc(doc(db, "servis", id));
}

// ── Password Verification ─────────────────────────────────────────────────

export async function verifySupervisorPassword(inputPassword) {
  const snap = await getDoc(doc(db, "settings", "passwords"));
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

/**
 * Try to print via local print service (localhost:3001).
 * Throws if print service unreachable — caller should catch and show SweetAlert.
 */
export async function printServisSlip(servisData) {
  const isCustom = servisData.jenisInput === "custom";
  const endpoint = isCustom ? "/api/print/nota-custom" : "/api/print/nota-servis";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${PRINT_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servisData),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Print service error: ${res.status}`);
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
  await uploadBytes(sRef, file, { contentType: file.type || "image/jpeg" });
  const url = await getDownloadURL(sRef);

  let liteUrl;
  let litePath;
  try {
    const liteBlob = await createLiteImageBlob(file);
    if (liteBlob) {
      const liteFileName = `servis_${servisId}_${timestamp}_lite.jpg`;
      litePath = `bukti-pengambilan-lite/${year}/${month}/${liteFileName}`;
      const liteRef = storageRef(storage, litePath);
      await uploadBytes(liteRef, liteBlob, { contentType: "image/jpeg" });
      liteUrl = await getDownloadURL(liteRef);
    }
  } catch (e) {
    console.warn("Upload foto lite gagal, lanjut pakai foto asli", e);
  }

  return { url, path: storagePath, liteUrl, litePath };
}

// ── WhatsApp Helper ───────────────────────────────────────────────────────

export function buildWhatsAppUrl(servis) {
  const phone = (servis.noHp || "").replace(/\D/g, "").replace(/^0/, "62");
  if (!phone) return null;
  const namaBarang = servis.namaBarang || servis.namaCustomer || "-";
  const message =
    `Halo Kak ${servis.namaCustomer}, Barang servis Kakak sudah selesai:\n` +
    `(${namaBarang}) Sudah bisa diambil.\n` +
    ` Silahkan datang ke Melati Gold Shop untuk mengambil barangnya ya kak. Terima kasih`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
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
