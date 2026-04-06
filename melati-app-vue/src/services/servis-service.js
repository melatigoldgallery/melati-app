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
import { db } from "@/config/firebase";

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
    orderBy("createdAt", "desc"),
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
    where("tanggal", "<=", endDate),
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
  const { supervisorPassword } = snap.data();
  if (inputPassword !== supervisorPassword) throw new Error("Password salah");
  return true;
}

// ── Print Service Integration ─────────────────────────────────────────────

const PRINT_BASE = import.meta.env.VITE_PRINT_SERVICE_URL || "http://localhost:3001";

/**
 * Try to print via local print service (localhost:3001).
 * Falls back to window.open browser print on failure.
 */
export async function printServisSlip(servisData) {
  const isCustom = servisData.jenisInput === "custom";
  const endpoint = isCustom ? "/api/print/nota-custom" : "/api/print/nota-servis";
  try {
    const res = await fetch(`${PRINT_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servisData),
    });
    if (!res.ok) throw new Error("Print service returned error");
  } catch {
    // Fallback: browser print
    _browserPrintFallback(servisData);
  }
}

function _browserPrintFallback(data) {
  const isCustom = data.jenisInput === "custom";
  const items = isCustom ? (data.detailBarangCustom || []) : (data.detailBarang || []);
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td>${item.jumlah || 1}</td>
          <td>${item.namaBarang}</td>
          <td>${item.berat || ""} ${isCustom ? (item.panjang || "") : (item.karat || "")}</td>
          <td>${isCustom ? "" : (item.jenisServis || "")}</td>
          <td>${item.rincianServis || ""}</td>
          <td style="text-align:right">Rp ${Number(item.ongkos || 0).toLocaleString("id-ID")}</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Nota Servis</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
      h3{margin:0 0 8px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:4px 6px}
      th{background:#f0f0f0}
      .right{text-align:right}
      .total{font-weight:bold}
    </style>
  </head><body>
    <h3>Melati Gold Shop — Nota ${isCustom ? "Custom" : "Servis"}</h3>
    <p>
      Tanggal: ${data.tanggal}<br/>
      Pelanggan: ${data.namaCustomer} (${data.noHp})<br/>
      Staff: ${data.namaSales}
    </p>
    <table>
      <thead><tr><th>Jml</th><th>Barang</th><th>${isCustom ? "Berat/Pjg" : "Berat/Karat"}</th>
        <th>${isCustom ? "" : "Jenis Servis"}</th><th>Rincian</th><th>Ongkos</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr class="total"><td colspan="5" style="text-align:right">Total</td>
          <td style="text-align:right">Rp ${Number(data.totalOngkos || 0).toLocaleString("id-ID")}</td>
        </tr>
      </tfoot>
    </table>
  </body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  }
}

// ── WhatsApp Helper ───────────────────────────────────────────────────────

export function buildWhatsAppUrl(servis) {
  const phone = (servis.noHp || "").replace(/\D/g, "").replace(/^0/, "62");
  if (!phone) return null;
  const namaBarang = servis.namaBarang || servis.namaCustomer || "-";
  const message =
    `Halo Kak ${servis.namaCustomer}, Barang servis Kakak sudah selesai:\n` +
    `(${namaBarang}) Sudah bisa diambil.\n` +
    ` Silakan datang ke Melati Gold Shop untuk mengambil barangnya ya kak. Terima kasih 🙏`;
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
